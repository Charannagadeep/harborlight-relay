import { BedrockClient, ListInferenceProfilesCommand } from "@aws-sdk/client-bedrock";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { canFinish, isReceiving, needsDecision } from "../shared/world.js";
import { fallbackPlan, validatePlan } from "./safety.js";

const PREFERRED = [
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "us.anthropic.claude-sonnet-4-6",
  "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  "us.anthropic.claude-sonnet-4-20250514-v1:0",
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "us.amazon.nova-pro-v1:0",
  "amazon.nova-pro-v1:0",
  "us.amazon.nova-premier-v1:0",
  "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  "us.amazon.nova-lite-v1:0",
];

function score(id) {
  const value = id.toLowerCase();
  if (value.includes("claude-sonnet-4-6") || value.includes("claude-sonnet-4-5")) return 100;
  if (value.includes("claude-sonnet-4") || value.includes("claude-3-7-sonnet")) return 90;
  if (value.includes("claude-3-5-sonnet")) return 80;
  if (value.includes("nova-premier")) return 76;
  if (value.includes("nova-pro")) return 70;
  if (value.includes("claude-haiku") || value.includes("haiku")) return 60;
  if (value.includes("nova-lite") || value.includes("nova-micro")) return 40;
  if (value.includes("claude")) return 55;
  return 0;
}

const SYSTEM = `You are Relay, the overnight continuity planner for Harborlight Dialysis in Harbor City.
Naomi Brooks, the continuity manager, will approve or reject your plan. You never move a patient yourself.

Rules you cannot break:
- Call get_clinic_status, get_patients_requiring_placement, and get_transport_and_roads before submit_plan.
- Trust the tools over the incident notes if they disagree.
- Never invent a patient, clinic, chair, or van.
- Transfer a patient only to a clinic with acceptingPatients true.
- Ambulatory patients use the clinic shuttle and can only go to a clinic whose road is "clear".
- Wheelchair patients travel by wheelchair van. There are exactly as many van seats as the transport tool says. Do not exceed them. Do not put an ambulatory patient in a van.
- A patient may finish on the machine only when canFinishOnMachine is true, and only at their current clinic.
- If canFinishOnMachine is true, keep them there. Moving a wheelchair patient who can finish spends a van seat someone else needs.
- One assignment per patient. Do not exceed openChairs.
- Patients finishing on a machine do not take an open chair.
- Prioritize the longest time since treatment, and anyone the generator cannot cover.
- summary is two spoken sentences. Concrete numbers. No slogans. Count transfers and people finishing on the machine separately. Do not say everyone moved if some stay on the machine.
- tradeoff names the hardest choice.
- Messages sound like a tired, careful person at 2 a.m. No clinical advice. Say where to go, how they get there, and where not to go.
- Then call submit_plan exactly once.`;

function toolSpec(name, description) {
  return {
    toolSpec: {
      name,
      description,
      inputSchema: {
        json: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    },
  };
}

const TOOLS = [
  toolSpec("get_clinic_status", "Which clinics have power, water, a road, generator fuel, and open chairs right now."),
  toolSpec("get_patients_requiring_placement", "Every patient who needs a decision tonight, including people already on a machine."),
  toolSpec("get_transport_and_roads", "Wheelchair vans, shuttle limits, and which roads are closed."),
  {
    toolSpec: {
      name: "submit_plan",
      description: "Submit Naomi's plan once the three read tools have been called.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            summary: { type: "string" },
            tradeoff: { type: "string" },
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  patientId: { type: "string" },
                  toClinicId: { type: "string" },
                  action: { type: "string", description: "transfer or finish-on-machine" },
                  transport: { type: "string" },
                  leaveBy: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["patientId", "toClinicId", "action", "transport", "leaveBy", "reason"],
              },
            },
            messages: {
              type: "object",
              properties: {
                patients: { type: "string" },
                drivers: { type: "string" },
                chargeNurses: { type: "string" },
              },
              required: ["patients", "drivers", "chargeNurses"],
            },
            watchItems: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "tradeoff", "assignments", "messages", "watchItems"],
        },
      },
    },
  },
];

function clinicPayload(world) {
  return world.clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    power: clinic.power,
    water: clinic.water,
    road: clinic.road,
    generator: clinic.generator,
    generatorMinutes: clinic.generatorMinutes,
    openChairs: clinic.openChairs,
    inTreatment: clinic.inTreatment,
    shift: clinic.shift,
    acceptingPatients: isReceiving(clinic),
    ambulatoryShuttle: isReceiving(clinic) && clinic.road === "clear",
    wheelchairVan: isReceiving(clinic) && clinic.road !== "closed",
  }));
}

function patientPayload(world) {
  return world.patients
    .filter((patient) => needsDecision(patient, world.clinics))
    .map((patient) => {
      const home = world.clinics.find((clinic) => clinic.id === patient.homeClinic);
      return {
        patientId: patient.id,
        name: patient.name,
        age: patient.age,
        hoursSinceLastTreatment: patient.hoursSince,
        mobility: patient.mobility,
        homeClinicId: patient.homeClinic,
        status: patient.status,
        minutesRemainingOnMachine: patient.minutesRemaining,
        canFinishOnMachine: canFinish(patient, home),
        window: patient.window,
      };
    });
}

function transportPayload(world) {
  return {
    vans: world.transport.vans.map((van) => ({
      name: van.name,
      seats: van.seats,
      basedAtClinicId: van.base,
      ready: van.ready,
    })),
    wheelchairSeatTotal: world.transport.vans.reduce((sum, van) => sum + van.seats, 0),
    shuttleReachesClinicIds: world.transport.shuttleReaches,
    shuttle: world.transport.shuttle,
    stretcherAvailable: world.transport.stretcher,
    roads: Object.fromEntries(world.clinics.map((clinic) => [clinic.id, clinic.road])),
  };
}

function summarizeClinics(world) {
  const receiving = world.clinics.filter(isReceiving).map((clinic) => clinic.short);
  const closed = world.clinics.filter((clinic) => !clinic.power || !clinic.water || clinic.road === "closed").map((clinic) => clinic.short);
  const generators = world.clinics.filter((clinic) => clinic.generator);
  const fuel = generators.map((clinic) => `${clinic.short} has ${clinic.generatorMinutes} minutes of generator fuel`).join(". ");
  return `${receiving.length} clinics can take patients: ${receiving.join(", ") || "none"}. ${closed.join(" and ") || "None"} cannot. ${fuel}`.trim();
}

function summarizePatients(world) {
  const needing = world.patients.filter((patient) => needsDecision(patient, world.clinics));
  const vanBound = needing.filter((patient) => {
    const home = world.clinics.find((clinic) => clinic.id === patient.homeClinic);
    return patient.mobility === "wheelchair" && !canFinish(patient, home);
  });
  return `${needing.length} people need a decision. ${vanBound.length} wheelchair patients need a van if they cannot finish where they are.`;
}

function summarizeTransport(world) {
  const seats = world.transport.vans.reduce((sum, van) => sum + van.seats, 0);
  return `${seats} wheelchair seats across ${world.transport.vans.length} vans. The shuttle reaches Main and North Ridge. ${world.transport.stretcher ? "A stretcher is up." : "There is no stretcher."}`;
}

async function converse(client, params) {
  try {
    return await client.send(new ConverseCommand(params));
  } catch (error) {
    if (params.toolConfig?.toolChoice && /toolChoice|ValidationException/i.test(`${error.name} ${error.message}`)) {
      const toolConfig = { ...params.toolConfig };
      delete toolConfig.toolChoice;
      return await client.send(new ConverseCommand({ ...params, toolConfig }));
    }
    throw error;
  }
}

export function createBedrock(region) {
  const runtime = new BedrockRuntimeClient({ region });
  const control = new BedrockClient({ region });
  let modelId = process.env.BEDROCK_MODEL_ID || "";
  let ready = null;

  async function listProfiles() {
    const ids = [];
    let nextToken;
    do {
      const page = await control.send(new ListInferenceProfilesCommand({ maxResults: 100, nextToken }));
      for (const profile of page.inferenceProfileSummaries || []) {
        if (profile.inferenceProfileId) ids.push(profile.inferenceProfileId);
      }
      nextToken = page.nextToken;
    } while (nextToken);
    return ids;
  }

  async function probe(id) {
    await runtime.send(new ConverseCommand({
      modelId: id,
      messages: [{ role: "user", content: [{ text: "Reply with the single word ready." }] }],
      inferenceConfig: { maxTokens: 8, temperature: 0 },
    }));
  }

  async function resolve() {
    if (modelId) {
      await probe(modelId);
      return modelId;
    }
    let candidates = [];
    try {
      const ids = await listProfiles();
      candidates = ids.sort((a, b) => score(b) - score(a)).filter((id) => score(id) > 0);
      console.log(`Bedrock profiles: ${candidates.slice(0, 8).join(", ") || "(none matched)"}`);
    } catch (error) {
      console.warn(`Could not list inference profiles (${error.name}). Trying known model ids.`);
    }
    const ordered = [...new Set([...candidates, ...PREFERRED])];
    let lastError = null;
    for (const id of ordered) {
      try {
        await probe(id);
        modelId = id;
        console.log(`Bedrock model: ${id}`);
        return id;
      } catch (error) {
        lastError = error;
        console.warn(`Skip ${id}: ${error.name}`);
      }
    }
    throw lastError || new Error("No Bedrock model accepted this account.");
  }

  function whenReady() {
    if (!ready) {
      ready = resolve().catch((error) => {
        ready = null;
        throw error;
      });
    }
    return ready;
  }

  async function planNight(world, { strict, onEvent }) {
    let activeModel = "";
    try {
      activeModel = await whenReady();
    } catch (error) {
      onEvent("status", { level: "warn", message: "Bedrock did not answer. The safety rules placed the night, and the log says so." });
      const checked = validatePlan(fallbackPlan(world), world, { strict: true });
      if (!checked.ok) throw new Error(checked.errors.join(" "));
      const plan = { ...checked.plan, source: "rules", warning: error.message };
      onEvent("plan", { plan });
      onEvent("done", { modelId: null, source: "rules" });
      return plan;
    }

    const seen = new Set();
    const notes = (world.feed || []).map((item) => `${item.at} ${item.source}: ${item.text}`).join("\n");
    const messages = [{
      role: "user",
      content: [{
        text: `It is 2:26 a.m. Naomi Brooks needs a plan she can approve.\n\nIncident notes:\n${notes}\n\nUse the tools. If a note disagrees with a tool, the tool wins. Then call submit_plan.`,
      }],
    }];

    let requestId = "";
    let usage = null;
    let submitted = null;

    for (let round = 0; round < 6 && !submitted; round += 1) {
      const params = {
        modelId: activeModel,
        system: [{ text: SYSTEM }],
        messages,
        toolConfig: {
          tools: TOOLS,
          ...(round === 0 ? { toolChoice: { any: {} } } : {}),
        },
        inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
      };
      const response = await converse(runtime, params);
      requestId = response.$metadata?.requestId || requestId;
      usage = response.usage || usage;
      const content = response.output?.message?.content || [];
      messages.push({ role: "assistant", content });

      const uses = content.filter((block) => block.toolUse).map((block) => block.toolUse);
      if (!uses.length) {
        messages.push({ role: "user", content: [{ text: "Call the three read tools, then submit_plan. Do not answer in prose." }] });
        continue;
      }

      const ordered = [
        ...uses.filter((tool) => tool.name !== "submit_plan"),
        ...uses.filter((tool) => tool.name === "submit_plan"),
      ];
      const results = [];

      for (const tool of ordered) {
        if (tool.name === "get_clinic_status") {
          seen.add(tool.name);
          const summary = summarizeClinics(world);
          onEvent("tool", { name: tool.name, summary });
          results.push({ toolResult: { toolUseId: tool.toolUseId, content: [{ json: { clinics: clinicPayload(world) } }] } });
        } else if (tool.name === "get_patients_requiring_placement") {
          seen.add(tool.name);
          const summary = summarizePatients(world);
          onEvent("tool", { name: tool.name, summary });
          results.push({ toolResult: { toolUseId: tool.toolUseId, content: [{ json: { patients: patientPayload(world) } }] } });
        } else if (tool.name === "get_transport_and_roads") {
          seen.add(tool.name);
          const summary = summarizeTransport(world);
          onEvent("tool", { name: tool.name, summary });
          results.push({ toolResult: { toolUseId: tool.toolUseId, content: [{ json: transportPayload(world) }] } });
        } else if (tool.name === "submit_plan") {
          const required = ["get_clinic_status", "get_patients_requiring_placement", "get_transport_and_roads"];
          if (!required.every((name) => seen.has(name))) {
            const message = "Call get_clinic_status, get_patients_requiring_placement, and get_transport_and_roads before submit_plan.";
            onEvent("repair", { errors: [message] });
            results.push({ toolResult: { toolUseId: tool.toolUseId, status: "error", content: [{ json: { ok: false, errors: [message] } }] } });
            continue;
          }
          const checked = validatePlan(tool.input, world, { strict });
          if (!checked.ok) {
            onEvent("repair", { errors: checked.errors });
            results.push({ toolResult: { toolUseId: tool.toolUseId, status: "error", content: [{ json: { ok: false, errors: checked.errors } }] } });
            continue;
          }
          submitted = {
            ...checked.plan,
            source: "bedrock",
            modelId: activeModel,
            requestId,
            usage,
          };
          onEvent("tool", { name: "submit_plan", summary: "The plan is written. The safety check passed." });
          results.push({ toolResult: { toolUseId: tool.toolUseId, content: [{ json: { ok: true } }] } });
        } else {
          results.push({ toolResult: { toolUseId: tool.toolUseId, status: "error", content: [{ json: { ok: false, errors: [`Unknown tool ${tool.name}`] } }] } });
        }
      }

      if (!submitted) messages.push({ role: "user", content: results });
    }

    if (!submitted) {
      onEvent("status", { level: "warn", message: "Bedrock did not produce a plan that passed the safety check. The rules engine placed the night, and the log says so." });
      const checked = validatePlan(fallbackPlan(world), world, { strict: true });
      if (!checked.ok) throw new Error(checked.errors.join(" "));
      submitted = { ...checked.plan, source: "rules", modelId: activeModel, requestId, usage };
    }

    onEvent("plan", { plan: submitted });
    onEvent("done", { modelId: activeModel, requestId, usage, source: submitted.source });
    return submitted;
  }

  return { whenReady, planNight, get modelId() { return modelId; } };
}
