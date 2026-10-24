// Patient notifications for an approved night.
//
// Flow:
//   1. draft()  — Amazon Bedrock writes one message per kept assignment, in the
//                 patient's language, through a required submit_messages tool.
//   2. checkMessages() — code, not the model, rejects any message that names the
//                 wrong clinic, drops the leave-by time or the hotline, or gives
//                 clinical advice. Bedrock gets the errors back and repairs.
//                 If it still fails, a plain template is used and the UI says so.
//   3. Naomi reviews and edits every message in the desk.
//   4. send()   — Amazon SES email (plus an Amazon Polly voice version) for the
//                 messages she approves. Without NOTIFY_TO set, sends are
//                 previewed only, so the demo never emails anyone by surprise.

import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { HOTLINE, LANGUAGES, patientLanguage } from "../shared/world.js";

const SYSTEM = `You are Relay's patient messenger for Harborlight Dialysis.
Naomi Brooks has approved tonight's moves. Write one message to each patient listed.

Every message must:
- Be written in the patient's language (given as "language"). Clinic names, addresses, times, and the phone number stay exactly as given.
- Say where to go (clinic name and address), how they get there (the ride given), and when (the leave-by time given).
- Say clearly which clinic NOT to go to when their home clinic is closed.
- Include the hotline number exactly as given.
- Be calm, short, and plain: under 90 words, short sentences, no jargon, no exclamation marks.
- Contain no medical advice: no symptoms, diet, fluid, medication, or dosing guidance. If they feel unwell, tell them to call the hotline or 911.
- For a patient finishing on the machine, the message goes to their emergency contact: say they are finishing treatment where they are and when to pick them up or check in.

For each patient also give an English translation and a voice script (the same message, written to be read aloud slowly, spelling out the phone number digit by digit).

Call submit_messages exactly once with every patient.`;

const TOOL = {
  toolSpec: {
    name: "submit_messages",
    description: "Submit one message per patient for Naomi to review.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                patientId: { type: "string" },
                subject: { type: "string", description: "Email subject in the patient's language, under 70 characters." },
                body: { type: "string", description: "The message in the patient's language." },
                english: { type: "string", description: "English translation of body." },
                voiceScript: { type: "string", description: "body rewritten to be read aloud, in the patient's language." },
              },
              required: ["patientId", "subject", "body", "english", "voiceScript"],
            },
          },
        },
        required: ["messages"],
      },
    },
  },
};

// Words that suggest clinical advice slipped into a message (checked on the English translation).
const CLINICAL = /\b(potassium|phosph\w*|fluid limit|limit (your )?fluids|drink less|dose|dosage|insulin|diet|binders?|kayexalate|blood pressure|take (your )?(medication|medicine|pills))\b/i;

function digits(text) {
  return String(text || "").replace(/\D/g, "");
}

function rideLabel(assignment) {
  if (assignment.action === "finish-on-machine") return "No ride needed. They finish treatment where they are.";
  if (/van/i.test(assignment.transport)) return `Wheelchair van (${assignment.transport})`;
  if (/shuttle/i.test(assignment.transport)) return "Clinic shuttle";
  return assignment.transport;
}

// What the model is told about each person. Only operational facts, no contact details.
export function recipients(plan, world) {
  return (plan.assignments || []).map((assignment) => {
    const patient = world.patients.find((item) => item.id === assignment.patientId) || {};
    const to = world.clinics.find((clinic) => clinic.id === assignment.toClinicId) || {};
    const home = world.clinics.find((clinic) => clinic.id === patient.homeClinic) || {};
    const language = patientLanguage(patient);
    const homeClosed = !home.power || !home.water || home.road === "closed";
    return {
      patientId: assignment.patientId,
      name: assignment.patientName || patient.name,
      language,
      languageName: LANGUAGES[language].name,
      audience: assignment.action === "finish-on-machine" ? "emergency contact" : "patient",
      action: assignment.action,
      goTo: { clinicName: to.name || assignment.toClinicName, address: to.address || "" },
      doNotGoTo: homeClosed && assignment.action === "transfer" ? home.name || null : null,
      ride: rideLabel(assignment),
      leaveBy: assignment.leaveBy,
      hotline: HOTLINE,
    };
  });
}

// Code-side safety gate for every message. Returns a list of plain-English errors.
export function checkMessages(messages, people) {
  const errors = [];
  const byId = new Map((messages || []).map((message) => [message.patientId, message]));
  for (const person of people) {
    const message = byId.get(person.patientId);
    if (!message) {
      errors.push(`No message for ${person.name} (${person.patientId}).`);
      continue;
    }
    const body = String(message.body || "");
    const english = String(message.english || "");
    if (!body.trim()) errors.push(`${person.name}: body is empty.`);
    if (!digits(body).includes(digits(person.hotline))) errors.push(`${person.name}: body must include the hotline ${person.hotline} exactly.`);
    const clinicWord = String(person.goTo.clinicName || "").split(" ").pop();
    if (clinicWord && !body.toLowerCase().includes(clinicWord.toLowerCase())) {
      errors.push(`${person.name}: body must name ${person.goTo.clinicName}.`);
    }
    if (person.action === "transfer" && person.leaveBy && !body.includes(String(person.leaveBy).replace(/\s*a\.?m\.?/i, "").trim())) {
      errors.push(`${person.name}: body must include the leave-by time ${person.leaveBy}.`);
    }
    if (body.split(/\s+/).length > 140) errors.push(`${person.name}: body is too long. Keep it under 90 words.`);
    if (CLINICAL.test(english) || CLINICAL.test(body)) errors.push(`${person.name}: remove the medical advice. Point them to the hotline or 911 instead.`);
    if (person.doNotGoTo && !english.toLowerCase().includes(person.doNotGoTo.toLowerCase().split(" ")[0])) {
      errors.push(`${person.name}: tell them not to go to ${person.doNotGoTo}.`);
    }
  }
  for (const message of messages || []) {
    if (!people.some((person) => person.patientId === message.patientId)) {
      errors.push(`Unknown patientId ${message.patientId}. Only write to the patients listed.`);
    }
  }
  return errors;
}

// Plain English fallback if Bedrock cannot produce messages that pass the check.
export function templateMessage(person) {
  const finishing = person.action === "finish-on-machine";
  const body = finishing
    ? `Harborlight Dialysis here. ${person.name} is finishing treatment at ${person.goTo.clinicName} tonight and is stable. Please plan to pick them up there, ${person.goTo.address}, when treatment ends. Questions: call ${person.hotline}. In an emergency, call 911.`
    : `Harborlight Dialysis here. Your clinic is closed tonight because of the flood.${person.doNotGoTo ? ` Do not go to ${person.doNotGoTo}.` : ""} Your treatment is at ${person.goTo.clinicName}, ${person.goTo.address}. Ride: ${person.ride}. Please be ready by ${person.leaveBy}. Questions: call ${person.hotline}. If you feel unwell, call 911.`;
  return {
    patientId: person.patientId,
    subject: finishing ? `${person.name}: finishing treatment tonight` : `Your dialysis tonight: go to ${person.goTo.clinicName}`,
    body,
    english: body,
    voiceScript: body.replace(person.hotline, digits(person.hotline).split("").join(" ")),
    source: "template",
  };
}

// Some models reject a named toolChoice; retry once with "any".
async function converse(runtime, params) {
  try {
    return await runtime.send(new ConverseCommand(params));
  } catch (error) {
    if (/toolChoice|ValidationException/i.test(`${error.name} ${error.message}`)) {
      return await runtime.send(new ConverseCommand({ ...params, toolConfig: { ...params.toolConfig, toolChoice: { any: {} } } }));
    }
    throw error;
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// SES in sandbox mode only delivers to verified addresses. Every fictional patient
// is routed to NOTIFY_TO, tagged with their id: you+irene@gmail.com, you+luis@gmail.com.
// Set NOTIFY_PLUS_TAGS=false if your mail provider does not support plus addressing.
function addressFor(patientId) {
  const base = process.env.NOTIFY_TO || "";
  if (!base) return "";
  if (process.env.NOTIFY_PLUS_TAGS === "false") return base;
  const [local, domain] = base.split("@");
  return domain ? `${local}+${patientId}@${domain}` : base;
}

export function createNotifier(region, { runtime, ses, polly, getModelId } = {}) {
  const sesClient = ses || new SESv2Client({ region });
  const sent = [];

  async function draft(plan, world, { onEvent = () => {} } = {}) {
    const people = recipients(plan, world);
    if (!people.length) return { messages: [], source: "none", errors: [] };

    let modelId = "";
    try {
      modelId = await getModelId();
    } catch (error) {
      onEvent("status", { message: `Bedrock did not answer (${error.name}). Using plain templates.` });
      return { messages: people.map(templateMessage), source: "template", modelId: null, errors: [error.message] };
    }

    const messages = [{
      role: "user",
      content: [{ text: `Naomi approved these moves. Write to each person.\n\n${JSON.stringify({ people }, null, 2)}` }],
    }];
    const guardrail = process.env.GUARDRAIL_ID
      ? { guardrailConfig: { guardrailIdentifier: process.env.GUARDRAIL_ID, guardrailVersion: process.env.GUARDRAIL_VERSION || "DRAFT" } }
      : {};

    let lastErrors = [];
    let requestId = "";
    for (let round = 0; round < 3; round += 1) {
      onEvent("tool", { name: round === 0 ? "draft_messages" : "repair_messages", summary: round === 0 ? `Writing ${people.length} messages in ${[...new Set(people.map((p) => p.languageName))].join(", ")}.` : `Fixing ${lastErrors.length} problems the safety check found.` });
      const response = await converse(runtime, {
        modelId,
        system: [{ text: SYSTEM }],
        messages,
        toolConfig: { tools: [TOOL], toolChoice: { tool: { name: "submit_messages" } } },
        inferenceConfig: { maxTokens: 8000, temperature: 0.3 },
        ...guardrail,
      });
      requestId = response.$metadata?.requestId || requestId;
      if (response.stopReason === "guardrail_intervened") {
        lastErrors = ["The Bedrock guardrail blocked the draft."];
        break;
      }
      const content = response.output?.message?.content || [];
      messages.push({ role: "assistant", content });
      const use = content.find((block) => block.toolUse?.name === "submit_messages")?.toolUse;
      if (!use) {
        lastErrors = ["No submit_messages call."];
        messages.push({ role: "user", content: [{ text: "Call submit_messages with every patient." }] });
        continue;
      }
      const drafted = Array.isArray(use.input?.messages) ? use.input.messages : [];
      lastErrors = checkMessages(drafted, people);
      if (!lastErrors.length) {
        onEvent("tool", { name: "check_messages", summary: "Every message names the right clinic, time, and hotline. No medical advice." });
        return {
          messages: drafted.map((message) => ({ ...message, source: "bedrock" })),
          people,
          source: "bedrock",
          modelId,
          requestId,
          errors: [],
        };
      }
      onEvent("repair", { errors: lastErrors });
      messages.push({
        role: "user",
        content: [{
          toolResult: {
            toolUseId: use.toolUseId,
            status: "error",
            content: [{ json: { ok: false, errors: lastErrors } }],
          },
        }],
      });
    }

    onEvent("status", { message: "Bedrock's messages did not pass the safety check. Plain templates are shown instead." });
    return { messages: people.map(templateMessage), people, source: "template", modelId, requestId, errors: lastErrors };
  }

  async function send(items, world) {
    const from = process.env.SES_FROM || process.env.NOTIFY_TO || "";
    const live = Boolean(from && process.env.NOTIFY_TO);
    const results = [];
    for (const item of items) {
      const patient = world.patients.find((person) => person.id === item.patientId) || {};
      const language = patientLanguage(patient);
      const entry = {
        id: `MSG-${String(sent.length + results.length + 1).padStart(3, "0")}`,
        at: new Date().toISOString(),
        patientId: item.patientId,
        name: patient.name || item.patientId,
        language,
        subject: item.subject,
        body: item.body,
        source: item.source || "bedrock",
        approvedBy: "Naomi Brooks",
        channels: [],
      };

      if (live) {
        try {
          const to = addressFor(item.patientId);
          const response = await sesClient.send(new SendEmailCommand({
            FromEmailAddress: from,
            Destination: { ToAddresses: [to] },
            Content: {
              Simple: {
                Subject: { Data: item.subject, Charset: "UTF-8" },
                Body: {
                  Text: { Data: `${item.body}\n\n— Harborlight Dialysis continuity desk\n(Fictional patient: ${entry.name}. Hackathon demo.)`, Charset: "UTF-8" },
                  Html: { Data: `<p style="font-size:17px;line-height:1.5">${escapeHtml(item.body).replace(/\n/g, "<br>")}</p><p style="color:#666;font-size:13px">Harborlight Dialysis continuity desk · Fictional patient: ${escapeHtml(entry.name)} · Hackathon demo</p>`, Charset: "UTF-8" },
                },
              },
            },
          }));
          entry.channels.push({ type: "email", status: "sent", to, messageId: response.MessageId });
        } catch (error) {
          entry.channels.push({ type: "email", status: "failed", error: `${error.name}: ${error.message}` });
        }
      } else {
        entry.channels.push({ type: "email", status: "preview", note: "Set NOTIFY_TO and SES_FROM in .env to send for real." });
      }

      if (polly && item.voiceScript) {
        try {
          const audio = await polly.synthesize(item.voiceScript, LANGUAGES[language].voice);
          entry.channels.push({ type: "voice", status: "ready", voice: LANGUAGES[language].voice });
          entry.audio = audio;
        } catch (error) {
          entry.channels.push({ type: "voice", status: "failed", error: error.name });
        }
      }
      results.push(entry);
    }
    sent.unshift(...results.map(({ audio, ...rest }) => rest));
    return { results, live };
  }

  return { draft, send, log: () => sent };
}
