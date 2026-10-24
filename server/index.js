import express from "express";
import cors from "cors";
import { createBedrock } from "./bedrock.js";
import { createPolly } from "./polly.js";
import { crisisWorld, patients, quietClinics, transport } from "../shared/world.js";

const REGION = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1";
const PORT = Number(process.env.PORT || 8787);
const app = express();
const bedrock = createBedrock(REGION);
const polly = createPolly(REGION);
const log = [];

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function worldFromBody(body) {
  if (body?.mode === "custom" && Array.isArray(body.clinics)) {
    const clinics = quietClinics().map((clinic) => {
      const posted = body.clinics.find((item) => item.id === clinic.id);
      if (!posted) return clinic;
      const road = ["clear", "closed", "van-only"].includes(posted.road) ? posted.road : clinic.road;
      const generator = Boolean(posted.generator);
      return {
        ...clinic,
        power: Boolean(posted.power),
        water: Boolean(posted.water),
        generator,
        generatorMinutes: generator ? Math.max(0, Math.min(600, Number(posted.generatorMinutes) || 0)) : 0,
        utility: generator ? false : Boolean(posted.power),
        road,
        openChairs: Math.max(0, Math.min(40, Number(posted.openChairs ?? clinic.openChairs) || 0)),
      };
    });
    const note = String(body.notes || "").slice(0, 4000);
    const feed = note
      ? [{ id: "custom", at: "now", source: "Continuity desk", text: note }]
      : [{ id: "custom", at: "now", source: "Continuity desk", text: "Naomi updated the clinic board and asked for a plan." }];
    return { scenario: "custom", clinics, patients: patients(), transport: transport(), feed };
  }
  return crisisWorld();
}

app.get("/api/health", async (_req, res) => {
  try {
    const modelId = await bedrock.whenReady();
    res.json({ ok: true, modelId, region: REGION, polly: true });
  } catch (error) {
    res.status(200).json({ ok: false, modelId: null, region: REGION, message: error.message });
  }
});

app.get("/api/world", (_req, res) => {
  res.json({ quiet: { clinics: quietClinics(), patients: patients() }, crisis: crisisWorld() });
});

app.get("/api/script", async (_req, res) => {
  try {
    const lines = await polly.script();
    const voiced = lines.filter((line) => line.audio).length;
    console.log(`Polly lines ready: ${voiced}/${lines.length}`);
    res.json({ lines });
  } catch (error) {
    res.status(200).json({ lines: [], message: error.message });
  }
});

app.post("/api/speak", async (req, res) => {
  try {
    const text = String(req.body?.text || "").slice(0, 600);
    const voice = req.body?.voice || "Matthew";
    if (!text) return res.json({ audio: null });
    const audio = await polly.synthesize(text, voice);
    res.json({ audio });
  } catch (error) {
    res.json({ audio: null, message: error.message });
  }
});

app.post("/api/relay", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const ping = setInterval(() => res.write(`: ping\n\n`), 4000);
  try {
    const world = worldFromBody(req.body || {});
    await bedrock.planNight(world, { strict: world.scenario !== "custom", onEvent: send });
  } catch (error) {
    send("error", { message: error.message || "Relay failed" });
  } finally {
    clearInterval(ping);
    res.end();
  }
});

app.post("/api/approve", (req, res) => {
  const entry = {
    id: `HL-${String(log.length + 1).padStart(3, "0")}`,
    at: new Date().toISOString(),
    approvedBy: "Naomi Brooks",
    source: req.body?.plan?.source || "unknown",
    modelId: req.body?.plan?.modelId || null,
    requestId: req.body?.plan?.requestId || null,
    decisions: req.body?.plan?.assignments?.length || 0,
  };
  log.unshift(entry);
  res.json(entry);
});

app.get("/api/log", (_req, res) => {
  res.json({ log });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Relay service on http://127.0.0.1:${PORT}`);
  bedrock.whenReady()
    .then((modelId) => console.log(`Ready · ${modelId}`))
    .catch((error) => console.error(`Bedrock not ready: ${error.message}`));
});
