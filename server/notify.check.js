// Offline self-test for patient notifications: `npm run check:notify`.
// Uses a fake Bedrock and fake SES, so it needs no AWS credentials.
import assert from "node:assert/strict";
import { crisisWorld, HOTLINE } from "../shared/world.js";
import { fallbackPlan, validatePlan } from "./safety.js";
import { checkMessages, createNotifier, recipients, templateMessage } from "./notify.js";

const world = crisisWorld();
const checked = validatePlan(fallbackPlan(world), world, { strict: true });
assert.ok(checked.ok, "the rules plan should pass the safety check");
const plan = checked.plan;
const people = recipients(plan, world);
assert.equal(people.length, plan.assignments.length);

// 1. The plain template always passes the gate.
assert.deepEqual(checkMessages(people.map(templateMessage), people), []);

// 2. The gate catches a wrong clinic, a missing hotline, and medical advice.
const bad = people.map(templateMessage);
bad[0] = { ...bad[0], body: "Go to the Pier clinic. Limit your fluids tonight." , english: "Go to the Pier clinic. Limit your fluids tonight." };
const errors = checkMessages(bad, people);
assert.ok(errors.some((e) => e.includes("hotline")), "missing hotline is caught");
assert.ok(errors.some((e) => e.includes("medical advice")), "clinical advice is caught");

// 3. A fake Bedrock that gets it wrong once, then repairs.
let calls = 0;
const runtime = {
  async send() {
    calls += 1;
    const messages = people.map(templateMessage).map(({ source, ...m }) => m);
    if (calls === 1) messages[0] = { ...messages[0], body: messages[0].body.replace(HOTLINE, "the hotline") };
    return {
      $metadata: { requestId: `fake-${calls}` },
      stopReason: "tool_use",
      output: { message: { role: "assistant", content: [{ toolUse: { toolUseId: `t${calls}`, name: "submit_messages", input: { messages } } }] } },
    };
  },
};
const sentEmails = [];
const ses = { async send(command) { sentEmails.push(command.input); return { MessageId: `ses-${sentEmails.length}` }; } };
const polly = { async synthesize() { return "ZmFrZQ=="; } };
const notifier = createNotifier("us-east-1", { runtime, ses, polly, getModelId: async () => "fake-model" });

const events = [];
const draft = await notifier.draft(plan, world, { onEvent: (name, data) => events.push([name, data]) });
assert.equal(draft.source, "bedrock");
assert.equal(calls, 2, "one repair round");
assert.ok(events.some(([name]) => name === "repair"));
assert.equal(draft.messages.length, people.length);

// 4. Preview mode sends nothing; live mode routes to plus-tagged addresses.
delete process.env.NOTIFY_TO;
const preview = await notifier.send(draft.messages.slice(0, 2), world);
assert.equal(preview.live, false);
assert.equal(sentEmails.length, 0);

process.env.NOTIFY_TO = "naomi@example.com";
process.env.SES_FROM = "naomi@example.com";
const live = await notifier.send(draft.messages, world);
assert.equal(live.live, true);
assert.equal(sentEmails.length, people.length);
assert.ok(sentEmails[0].Destination.ToAddresses[0].startsWith("naomi+"));
assert.ok(live.results.every((r) => r.channels.some((c) => c.type === "voice" && c.status === "ready")));

console.log(`Notifications OK · ${people.length} people · ${[...new Set(people.map((p) => p.languageName))].join(", ")} · repair loop and SES routing verified`);
for (const person of people) console.log(`  ${person.name} (${person.languageName}) → ${person.goTo.clinicName} · ${person.ride}${person.doNotGoTo ? ` · not ${person.doNotGoTo}` : ""}`);
