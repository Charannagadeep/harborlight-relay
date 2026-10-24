import { useEffect, useState } from "react";
import { getJSON } from "./api";
import { Atmosphere } from "./Rain";

const STEPS = [
  {
    title: "The night comes in",
    text: "Charge nurses and the roads desk send notes. Pier is flooded. Eastbank is on a generator. South Wharf has lost water.",
  },
  {
    title: "Rules decide what is safe",
    text: "A clinic can receive patients only with power, water, an open road, and a free chair. A generator with under two hours of fuel cannot take anyone new. Bedrock cannot override this.",
  },
  {
    title: "Bedrock reads the night",
    text: "Amazon Bedrock calls three tools: clinic status, the patients who need a decision, and the vans and roads. The tools are the source of truth.",
  },
  {
    title: "Bedrock writes the plan",
    text: "The model submits who moves, who finishes on the machine, which van, and why. It also writes the messages for patients, drivers, and charge nurses.",
  },
  {
    title: "The service checks the plan",
    text: "Every chair, van seat, and generator minute is checked in code. A bad assignment is sent back. If the model cannot repair it, the rules engine places the night and the log says so.",
  },
  {
    title: "Naomi approves",
    text: "Nothing is sent until Naomi Brooks approves it. The decision is stored with the Bedrock request id.",
  },
];

export function Architecture({ onFilm, onHome }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getJSON("/api/health").then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setActive((value) => (value + 1) % STEPS.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [playing]);

  const step = STEPS[active];

  return (
    <div className="arch">
      <Atmosphere density={70} />
      <div className="arch-top">
        <button className="text" onClick={onHome}>Relay</button>
        <div className="row">
          <button className="btn ghost" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play the architecture"}</button>
          <button className="btn" onClick={onFilm}>Play the night</button>
        </div>
      </div>
      <div className="arch-body">
        <ol>
          {STEPS.map((item, index) => (
            <li key={item.title}>
              <button className={index === active ? "on" : ""} onClick={() => { setPlaying(false); setActive(index); }}>
                <span>0{index + 1}</span>
                {item.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="arch-card">
          <p className="eyebrow">How Relay is built</p>
          <h1>{step.title}</h1>
          <p>{step.text}</p>
          <p className="model-id">
            {health?.ok ? `Amazon Bedrock · ${health.modelId}` : "Amazon Bedrock · Converse with tool use"}
          </p>
          <p className="model-id">Amazon Polly speaks the radio and the narrator when the account allows it.</p>
        </div>
      </div>
    </div>
  );
}
