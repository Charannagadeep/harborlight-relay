# Relay · Harborlight Continuity Desk

**SpartHill Hacks 2026 · AWS Track**

Naomi Brooks is the continuity manager at Harborlight Dialysis. Six clinics. About 420 patients. When a coastal flood hits at 2:14 a.m., clinics go dark, roads close, and thirteen people need a decision before morning.

**Relay** is the desk she uses that night.

- **You** set the clinics and give orders.
- **Amazon Bedrock** drafts who finishes on the machine and who moves.
- **Code** rejects unsafe chairs, vans, roads, and generator fuel.
- **You** keep or send back every move, then approve.

Fictional adult patients. Aggregate operational data. Not a medical device.

Live repo: https://github.com/Charannagadeep/harborlight-relay

---

## What you do on the website

The website is **silent and interactive**. Sound belongs only in film mode for the demo video.

1. Open http://127.0.0.1:5173
2. Click **Work the night**
3. **Load the Tuesday flood**
4. Use **your controls**: flip power, water, generator fuel, open chairs, and roads; write orders to Bedrock
5. Click **Ask Bedrock for a draft**
6. On **Your review**, **Keep** or **Send back** each person
7. **Approve kept moves**, or **Reject whole draft** and ask again

If every clinic is dark, Relay refuses a fake plan. There is nowhere safe to send anyone.

### Modes

| Mode | Purpose |
|------|---------|
| **Work the night** (`#desk`) | Main product. Silent. You drive. |
| **Architecture** (`#arch`) | How Bedrock, safety, and human approve fit together. |
| **Film for video** (`#film`) | Cinematic take for the 5-minute Box video (rain, radio, Polly, score). |

---

## How it works (end to end)

```
You (Naomi)
  → set clinics + orders
  → POST /api/relay (SSE)
Amazon Bedrock (tool use)
  → get_clinic_status
  → get_patients_requiring_placement
  → get_transport_and_roads
  → submit_plan
server/safety.js
  → accept or reject the plan
You
  → Keep / Send back each assignment
  → POST /api/approve
```

### Amazon Bedrock (AI inside the app)

Bedrock is the **planner**. It must call three read tools, then `submit_plan` once:

| Tool | What it returns |
|------|-----------------|
| `get_clinic_status` | Power, water, road, generator minutes, open chairs |
| `get_patients_requiring_placement` | Everyone who needs a decision, including people on a machine |
| `get_transport_and_roads` | Van seats, shuttle limits, closed / van-only roads |

The model id is resolved from inference profiles in `us-east-1` (Claude Sonnet via Bedrock).

### Safety gate (code, not the model)

`server/safety.js` rejects plans that:

- send someone to a clinic that is not receiving (no power/water, closed road, no chairs, short generator fuel)
- overfill chairs or wheelchair van seats
- put an ambulatory patient on a van seat the shuttle could take
- keep someone on a machine the generator cannot cover

If Bedrock cannot repair a rejected plan, a deterministic **rules** fallback places the night and the UI says so (`source: "rules"`).

### Human approve

Nothing is treated as final until you approve. Keep/send-back edits are stored with the approval log in memory (`POST /api/approve`).

### Amazon Polly (film only)

Polly neural voices speak narrator and radio lines during **Film for video**. The silent desk does not play them.

### Kiro (builder, not runtime)

**Kiro is not inside the running website.** It is the AWS agentic IDE/CLI used to build and document this repo.

What Kiro did on this project:

- Session on `/Users/charan/Desktop/Sparthill/relay`
- Added the Kiro build note and tightened architecture copy
- Task file: `KIRO_TASK.md`

What Bedrock does: plans the night **inside** the app when you ask.

---

## The Tuesday flood scenario

Default crisis in `shared/world.js`:

- **Pier** and **South Wharf** — flooded / dark
- **Eastbank** — utility power out, ~40 minutes of generator fuel, four people mid-treatment
- **Cedar Grove** — vans only
- **Main** and **North Ridge** — still able to receive
- **13 adults** need a decision (finish on machine or transfer by van/shuttle)

You can change any of that on the desk before asking Bedrock.

---

## Run locally

Needs Node 20+, workshop AWS credentials with Bedrock (and Polly if you record the film).

```bash
git clone https://github.com/Charannagadeep/harborlight-relay.git
cd harborlight-relay
npm install
cp .env.example .env
```

Put temporary workshop keys in `.env` (never commit this file):

```bash
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
# optional: BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Web UI | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8787 |
| Health | http://127.0.0.1:8787/api/health |

Useful scripts:

```bash
npm run check   # run safety self-test (13-person Tuesday plan)
npm run build   # production client build → dist/
```

---

## Project layout

```
relay/
  client/           React + Vite UI (desk, film, architecture)
  server/           Express API, Bedrock tool loop, Polly, safety
  shared/           Clinics, patients, flood scenario, script lines
  KIRO_TASK.md      Prompt used for the Kiro pass
  .env.example      Credential template (no secrets)
```

| Path | Role |
|------|------|
| `client/src/Desk.jsx` | Interactive silent desk |
| `client/src/Board.jsx` | Map, feed, Keep/Send back, approve |
| `client/src/Film.jsx` | Video take with sound |
| `client/src/Architecture.jsx` | Judge-facing architecture walkthrough |
| `server/bedrock.js` | Converse + tool use + repair |
| `server/safety.js` | Validate + rules fallback |
| `server/polly.js` | Neural TTS for film lines |
| `server/index.js` | `/api/relay`, `/api/approve`, `/api/speak`, `/api/world` |
| `shared/world.js` | Scenario data + receiving / finish rules |

---

## Film the five-minute video

Judges watch the video. Workshop text says **10:30 a.m. Saturday**; the room slide said **11:00 a.m.** Upload to the event Box folder.

Suggested shot list:

1. **Architecture** — who Naomi is, Bedrock tools, safety, human approve
2. **Film for video** — flood, radio, Bedrock tools on screen (sound on)
3. **Desk** — you load the flood, change a clinic, ask Bedrock, keep/send back, approve
4. End with a way for judges to reach the team

Gate: Amazon Bedrock must do real work in the demo. This app passes that gate when `/api/relay` runs tool use live.

---

## Team

Repo owner: [Charannagadeep](https://github.com/Charannagadeep)

Collaborators invited with write access:

- [Gundananda](https://github.com/Gundananda)
- [juileegiramkar](https://github.com/juileegiramkar)
- [SuprithaMallaradhya](https://github.com/SuprithaMallaradhya)

Accept the invite: https://github.com/Charannagadeep/harborlight-relay/invitations

Send any remaining GitHub usernames to be added.

---

## Kiro build note

Kiro was used on this project to tighten documentation and the architecture view. Runtime planning is Amazon Bedrock.

- **Persona.** Naomi Brooks, continuity manager at Harborlight Dialysis. She owns six clinics and 420 patients and approves or rejects every plan. Relay never moves a patient on its own.
- **Bedrock tools.** `get_clinic_status`, `get_patients_requiring_placement`, `get_transport_and_roads`, then `submit_plan`.
- **Safety gate.** `server/safety.js` rejects unsafe assignments. If the model cannot repair, rules place the night and the UI says so. Nothing is final until a human approves.
