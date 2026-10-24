# Kiro pass — Harborlight Relay

You are editing the existing Relay app at this workspace root.

## Goal
Make one small, shippable improvement that proves Kiro was used on this project, without breaking Bedrock, Polly, film mode, or safety validation.

## Do this
1. Read `README.md`, `shared/world.js`, `server/bedrock.js`, and `server/safety.js`.
2. Add a short **Kiro build note** section at the bottom of `README.md` describing:
   - Persona: Naomi Brooks, continuity manager at Harborlight Dialysis
   - Bedrock tools: get_clinic_status, get_patients_requiring_placement, get_transport_and_roads, submit_plan
   - Safety gate: code rejects unsafe chair/van/generator/road assignments; human must approve
3. In `client/src/Architecture.jsx`, make sure the architecture view clearly names Amazon Bedrock tool use and the human approve step (tighten copy only if needed).
4. Run `node server/safety.js` and fix anything you break.
5. Do not touch `.env`. Do not commit secrets. Do not invent new AWS services.

## Done when
README has the Kiro build note, architecture copy is clear, and `node server/safety.js` exits 0.
