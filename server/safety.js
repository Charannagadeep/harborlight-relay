import { canFinish, isReceiving, needsDecision } from "../shared/world.js";
import { crisisWorld } from "../shared/world.js";

function clinicName(world, id) {
  return world.clinics.find((clinic) => clinic.id === id)?.short || id;
}

function enrich(input, world) {
  const assignments = (input.assignments || []).map((assignment) => {
    const patient = world.patients.find((item) => item.id === assignment.patientId);
    const from = world.clinics.find((clinic) => clinic.id === patient?.homeClinic);
    const to = world.clinics.find((clinic) => clinic.id === assignment.toClinicId);
    return {
      patientId: assignment.patientId,
      patientName: patient?.name || assignment.patientId,
      age: patient?.age || null,
      mobility: patient?.mobility || "ambulatory",
      hoursSince: patient?.hoursSince || null,
      minutesRemaining: patient?.minutesRemaining ?? null,
      fromClinicId: patient?.homeClinic || "",
      fromClinicName: from?.short || "",
      toClinicId: assignment.toClinicId,
      toClinicName: to?.short || assignment.toClinicId,
      action: assignment.action,
      transport: assignment.transport,
      leaveBy: assignment.leaveBy,
      reason: assignment.reason,
    };
  });
  return {
    summary: String(input.summary || "").trim(),
    tradeoff: String(input.tradeoff || "").trim(),
    assignments,
    unplaced: input.unplaced || [],
    messages: {
      patients: String(input.messages?.patients || "").trim(),
      drivers: String(input.messages?.drivers || "").trim(),
      chargeNurses: String(input.messages?.chargeNurses || "").trim(),
    },
    watchItems: Array.isArray(input.watchItems) ? input.watchItems.map(String) : [],
    source: input.source || "bedrock",
  };
}

function normalizeAction(value) {
  const text = String(value || "").toLowerCase().replace(/_/g, "-");
  if (text.includes("finish")) return "finish-on-machine";
  if (text.includes("transfer") || text.includes("move")) return "transfer";
  return text;
}

export function validatePlan(raw, world, { strict = true } = {}) {
  const input = typeof raw === "string" ? safeJson(raw) : raw || {};
  const errors = [];
  const assignments = Array.isArray(input.assignments) ? input.assignments : [];
  const normalized = assignments.map((assignment) => ({
    ...assignment,
    patientId: assignment.patientId || assignment.patient || assignment.id,
    toClinicId: assignment.toClinicId || assignment.toClinic || assignment.clinicId,
    action: normalizeAction(assignment.action),
    transport: String(assignment.transport || "").trim(),
    leaveBy: String(assignment.leaveBy || "").trim(),
    reason: String(assignment.reason || "").trim(),
  }));

  const seen = new Set();
  const chairs = Object.fromEntries(world.clinics.map((clinic) => [clinic.id, clinic.openChairs]));
  let vanSeats = world.transport.vans.reduce((sum, van) => sum + van.seats, 0);

  for (const assignment of normalized) {
    const patient = world.patients.find((item) => item.id === assignment.patientId);
    if (!patient) {
      errors.push(`Unknown patient ${assignment.patientId}.`);
      continue;
    }
    if (seen.has(patient.id)) {
      errors.push(`${patient.name} is assigned twice.`);
      continue;
    }
    seen.add(patient.id);
    if (!assignment.reason || assignment.reason.length < 8) {
      errors.push(`Give a real reason for ${patient.name}.`);
    }
    if (!assignment.leaveBy) errors.push(`Say when ${patient.name} leaves.`);

    if (assignment.action === "finish-on-machine") {
      const home = world.clinics.find((clinic) => clinic.id === patient.homeClinic);
      if (assignment.toClinicId !== patient.homeClinic) {
        errors.push(`${patient.name} can only finish at ${clinicName(world, patient.homeClinic)}.`);
      }
      if (!canFinish(patient, home)) {
        errors.push(`${patient.name} cannot finish on the machine. Move them.`);
      }
      continue;
    }

    if (assignment.action !== "transfer") {
      errors.push(`${patient.name} needs action transfer or finish-on-machine.`);
      continue;
    }

    const destination = world.clinics.find((clinic) => clinic.id === assignment.toClinicId);
    if (!destination || !isReceiving(destination)) {
      errors.push(`${patient.name} cannot go to ${assignment.toClinicId}. That clinic is not receiving.`);
      continue;
    }
    if ((chairs[destination.id] || 0) <= 0) {
      errors.push(`${destination.short} has no chair left for ${patient.name}.`);
      continue;
    }
    chairs[destination.id] -= 1;

    if (patient.mobility === "wheelchair") {
      if (!/van/i.test(assignment.transport)) {
        errors.push(`${patient.name} uses a wheelchair and needs a wheelchair van.`);
      }
      if (destination.road === "closed") errors.push(`${destination.short} road is closed.`);
      vanSeats -= 1;
      if (vanSeats < 0) errors.push("Not enough wheelchair van seats.");
    } else {
      if (destination.road !== "clear") {
        errors.push(`${patient.name} is ambulatory and can only go where the shuttle can drive. ${destination.short} is ${destination.road}.`);
      }
      if (/van/i.test(assignment.transport) && !/shuttle/i.test(assignment.transport)) {
        errors.push(`Do not spend a van seat on ${patient.name}. The shuttle can take ambulatory patients.`);
      }
    }
  }

  const needing = world.patients.filter((patient) => needsDecision(patient, world.clinics));
  const unplaced = Array.isArray(input.unplaced) ? input.unplaced : [];
  for (const patient of needing) {
    if (seen.has(patient.id)) continue;
    const listed = unplaced.find((item) => item.patientId === patient.id || item.name === patient.name);
    if (!strict && listed?.reason) continue;
    errors.push(`${patient.name} still needs a decision.`);
  }

  const messages = input.messages || {};
  for (const key of ["patients", "drivers", "chargeNurses"]) {
    if (!messages[key] || String(messages[key]).trim().length < 30) {
      errors.push(`Write the ${key} message in plain language.`);
    }
  }
  if (!input.summary || String(input.summary).trim().length < 20) errors.push("Write a two-sentence summary Naomi can say out loud.");
  if (!input.tradeoff || String(input.tradeoff).trim().length < 20) errors.push("Name the hardest tradeoff.");

  if (errors.length) return { ok: false, errors: [...new Set(errors)].slice(0, 8) };
  return { ok: true, plan: enrich({ ...input, assignments: normalized, unplaced }, world) };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function fallbackPlan(world) {
  const chairs = Object.fromEntries(world.clinics.map((clinic) => [clinic.id, clinic.openChairs]));
  const needing = world.patients.filter((patient) => needsDecision(patient, world.clinics));
  const finishers = needing.filter((patient) => canFinish(patient, world.clinics.find((clinic) => clinic.id === patient.homeClinic)));
  const movers = needing.filter((patient) => !finishers.includes(patient));
  const wheelchair = movers.filter((patient) => patient.mobility === "wheelchair").sort((a, b) => b.hoursSince - a.hoursSince);
  const ambulatory = movers.filter((patient) => patient.mobility !== "wheelchair").sort((a, b) => b.hoursSince - a.hoursSince);
  const assignments = [];

  for (const patient of finishers) {
    const clinic = world.clinics.find((item) => item.id === patient.homeClinic);
    assignments.push({
      patientId: patient.id,
      toClinicId: patient.homeClinic,
      action: "finish-on-machine",
      transport: "Stay on the machine",
      leaveBy: "now",
      reason: `${patient.minutesRemaining} minutes left on the machine, and the generator has ${clinic.generatorMinutes}. They finish where they are.`,
    });
  }

  const vans = [...world.transport.vans].sort((a, b) => a.readyOrder - b.readyOrder);
  let index = 0;
  for (const van of vans) {
    let seats = van.seats;
    while (seats > 0 && index < wheelchair.length) {
      const patient = wheelchair[index];
      let destination = world.clinics.find((clinic) => clinic.id === van.base);
      if (!destination || !isReceiving(destination) || chairs[destination.id] <= 0) {
        destination = world.clinics.find((clinic) => isReceiving(clinic) && clinic.road !== "closed" && chairs[clinic.id] > 0);
      }
      if (!destination) break;
      chairs[destination.id] -= 1;
      seats -= 1;
      index += 1;
      assignments.push({
        patientId: patient.id,
        toClinicId: destination.id,
        action: "transfer",
        transport: van.name,
        leaveBy: van.ready === "now" ? "2:28 a.m." : van.ready,
        reason: `${patient.hoursSince} hours since treatment. Wheelchair. ${van.name} has a seat into ${destination.short}.`,
      });
    }
  }

  for (const patient of ambulatory) {
    const destination = world.clinics.find((clinic) => isReceiving(clinic) && clinic.road === "clear" && chairs[clinic.id] > 0);
    if (!destination) continue;
    chairs[destination.id] -= 1;
    const onMachine = patient.status === "on-machine";
    assignments.push({
      patientId: patient.id,
      toClinicId: destination.id,
      action: "transfer",
      transport: "Clinic shuttle",
      leaveBy: onMachine ? "2:28 a.m." : "2:50 a.m.",
      reason: onMachine
        ? `${patient.minutesRemaining} minutes left on the machine. The generator will not cover it. Shuttle to ${destination.short}.`
        : `${patient.hoursSince} hours since treatment. ${clinicName(world, patient.homeClinic)} cannot open. Shuttle to ${destination.short}.`,
    });
  }

  const transfers = assignments.filter((assignment) => assignment.action === "transfer");
  const finishes = assignments.filter((assignment) => assignment.action === "finish-on-machine");
  const mainLeft = chairs.main ?? 0;
  const ridgeLeft = chairs.ridge ?? 0;

  return {
    summary: `${transfers.length} patients move while the roads are still passable. ${finishes.length} finish at Eastbank before the generator runs out. Pier and South Wharf stay closed.`,
    tradeoff: `The van seats run out before the chairs do. Wheelchair patients take both vans, so Cedar Grove stays in reserve even with empty chairs. Main has ${mainLeft} chair${mainLeft === 1 ? "" : "s"} left and North Ridge has ${ridgeLeft}.`,
    assignments,
    unplaced: [],
    messages: {
      patients: "This is Harborlight continuity. Your clinic cannot treat safely tonight. If you are already on a machine at Eastbank and we have not moved you, stay and finish. Everyone else will get a call with a chair and a ride. Do not come to Pier or South Wharf.",
      drivers: "Both wheelchair vans stay on the inland roads. The Pier approach and the South Wharf bridge are closed. Van 2 takes two patients to North Ridge. Van 1 takes three to Harborlight Main. Do not drive to Pier or South Wharf.",
      chargeNurses: "Eastbank, finish the three patients who can beat the generator, and move Patrick Nguyen by shuttle now. Main and North Ridge, you are receiving. Pier and South Wharf stay closed. Cedar Grove is reserve only.",
    },
    watchItems: [
      "Eastbank's generator is the clock for the people still on machines.",
      "Cedar Grove is unused on purpose. The van seats are carrying wheelchair patients.",
      `Main has ${mainLeft} open chair${mainLeft === 1 ? "" : "s"} after this plan. North Ridge has ${ridgeLeft}.`,
    ],
    source: "rules",
  };
}

export function assertTuesday() {
  const world = crisisWorld();
  const checked = validatePlan(fallbackPlan(world), world, { strict: true });
  if (!checked.ok) {
    throw new Error(checked.errors.join("\n"));
  }
  const plan = checked.plan;
  const patrick = plan.assignments.find((assignment) => assignment.patientId === "patrick");
  const helen = plan.assignments.find((assignment) => assignment.patientId === "helencho");
  const vans = plan.assignments.filter((assignment) => assignment.mobility === "wheelchair" && assignment.action === "transfer");
  if (patrick?.action !== "transfer") throw new Error("Patrick should move");
  if (helen?.action !== "finish-on-machine") throw new Error("Helen Cho should finish");
  if (vans.length !== 5) throw new Error(`Expected 5 van rides, got ${vans.length}`);
  if (plan.assignments.some((assignment) => ["pier", "wharf"].includes(assignment.toClinicId) && assignment.action === "transfer")) {
    throw new Error("Assigned someone to a dark clinic");
  }
  if (plan.assignments.length !== 13) throw new Error(`Expected 13 decisions, got ${plan.assignments.length}`);
  return plan;
}

if (process.argv[1]?.endsWith("safety.js")) {
  const plan = assertTuesday();
  console.log(`tuesday plan ok · ${plan.assignments.length} decisions`);
  for (const assignment of plan.assignments) {
    console.log(`${assignment.patientName} → ${assignment.toClinicName} · ${assignment.action} · ${assignment.transport}`);
  }
}
