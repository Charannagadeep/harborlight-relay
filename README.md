# Relay

Naomi Brooks is the continuity manager at Harborlight Dialysis. Six clinics, 420 patients. When a flood closes clinics at 2 a.m., she has to place every person who cannot miss a treatment. Relay reads the night with Amazon Bedrock, checks every chair and van seat in code, and waits for her approval.

Fictional patients. This is not a medical device.

## Run it

```bash
npm install
cp .env.example .env
```

Put the workshop AWS credentials in `.env`. Do not commit that file.

```bash
npm run dev
```

Open http://127.0.0.1:5173 and press **Begin the night**.

- The film has rain, radio, and a score. Headphones help.
- Space pauses. Esc leaves.
- **Skip to the plan** jumps to the Bedrock call, for a second take.
- **Open the desk** loads the flood and runs Bedrock again, with clinic controls.
- **Architecture** is the shot that explains how it is built.

## What Bedrock does

Bedrock is the planner. It must call three tools (`get_clinic_status`, `get_patients_requiring_placement`, `get_transport_and_roads`) and then `submit_plan`. The service rejects a plan that sends someone to a dark clinic, overfills a chair, or spends a van seat it does not have. Amazon Polly speaks the narrator and the radio when the account allows it.

## Film the five minutes

1. Architecture, press play, and say who Naomi is.
2. Begin the night and let it run through the flood.
3. Hold on the Bedrock tool calls. That is the AWS shot.
4. Approve the plan. The end card is the model’s own words.
5. Leave a way for judges to reach the team.

The slide in the room said the video is due at 11:00 a.m. Saturday, uploaded to the Box folder. Aim to have it in before 10:30.

## Team

Send the other four GitHub usernames and they will be added to the repo.
