import { useState } from "react";
import { crisisClinics, FEED, patients, quietClinics } from "@shared/world.js";
import { approvePlan, runRelay } from "./api";
import { Board } from "./Board";

export function Desk({ onFilm, onArch, onHome }) {
  const people = patients();
  const [clinics, setClinics] = useState(() => quietClinics());
  const [feed, setFeed] = useState([]);
  const [notes, setNotes] = useState(FEED.map((item) => `${item.at} ${item.source}: ${item.text}`).join("\n"));
  const [trace, setTrace] = useState([]);
  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState(false);
  const [warning, setWarning] = useState("");
  const [custom, setCustom] = useState(false);
  const [editor, setEditor] = useState(false);
  const clock = feed.length ? 2 * 3600 + 26 * 60 : 2 * 3600 + 14 * 60;

  function loadFlood() {
    setClinics(crisisClinics());
    setFeed(FEED);
    setCustom(false);
    setPlan(null);
    setTrace([]);
    setApproved(false);
    setWarning("");
  }

  function updateClinic(id, fields) {
    setCustom(true);
    setClinics((list) => list.map((clinic) => (clinic.id === id ? { ...clinic, ...fields } : clinic)));
  }

  async function planNight() {
    if (!custom) {
      setClinics(crisisClinics());
      setFeed(FEED);
    }
    setRunning(true);
    setPlan(null);
    setTrace([]);
    setApproved(false);
    setWarning("");
    let finalPlan = null;
    try {
      await runRelay(custom ? { mode: "custom", clinics, notes } : { mode: "tonight" }, (event, data) => {
        if (event === "tool") setTrace((current) => [...current, data]);
        if (event === "repair") setWarning(data.errors?.[0] || "Correcting the plan.");
        if (event === "status" && data.message) setWarning(data.message);
        if (event === "plan") finalPlan = data.plan;
        if (event === "error") setWarning(data.message);
      });
      if (!finalPlan) throw new Error("No plan came back.");
      setPlan(finalPlan);
      if (!feed.length) setFeed(FEED);
    } catch (error) {
      setWarning(error.message);
    } finally {
      setRunning(false);
    }
  }

  async function approve() {
    if (!plan) return;
    setApproved(true);
    try { await approvePlan(plan); } catch { /* shown locally */ }
  }

  const mode = running ? "trace" : plan ? "plan" : "people";

  return (
    <div className="desk-shell">
      <div className="topbar">
        <button className="text" onClick={onHome}>Relay</button>
        <div className="row">
          <button className="btn" onClick={onFilm}>Play the night</button>
          <button className="btn ghost" onClick={onArch}>Architecture</button>
        </div>
      </div>
      <div className="desk-frame">
        <Board
          clinics={clinics}
          patients={people}
          feed={feed}
          trace={trace}
          plan={plan}
          revealed={plan ? plan.assignments.length : 0}
          flood={feed.some((item) => item.id === "wx" || item.id === "custom") ? 1 : 0}
          clock={clock}
          approved={approved}
          showApprove={Boolean(plan) && !approved}
          onApprove={approve}
          running={running}
          warning={warning}
          mode={mode}
        />
      </div>
      <div className="desk-controls">
        <button className="btn" onClick={loadFlood}>Load the Tuesday flood</button>
        <button className="btn" onClick={planNight} disabled={running}>{running ? "Relay is planning…" : "Plan with Bedrock"}</button>
        <button className="btn ghost" onClick={() => setEditor((value) => !value)}>{editor ? "Hide clinic controls" : "Adjust the clinics"}</button>
      </div>
      {editor && (
        <div className="editor">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="clinic-edit">
              <strong>{clinic.short}</strong>
              <label><input type="checkbox" checked={clinic.power} onChange={(event) => updateClinic(clinic.id, { power: event.target.checked })} /> Power</label>
              <label><input type="checkbox" checked={clinic.water} onChange={(event) => updateClinic(clinic.id, { water: event.target.checked })} /> Water</label>
              <label><input type="checkbox" checked={clinic.generator} onChange={(event) => updateClinic(clinic.id, { generator: event.target.checked, generatorMinutes: clinic.generatorMinutes || 40 })} /> Generator</label>
              <label>Fuel min <input type="number" min="0" max="600" value={clinic.generatorMinutes} onChange={(event) => updateClinic(clinic.id, { generator: true, generatorMinutes: Number(event.target.value) })} /></label>
              <label>
                Road
                <select value={clinic.road} onChange={(event) => updateClinic(clinic.id, { road: event.target.value })}>
                  <option value="clear">Clear</option>
                  <option value="van-only">Vans only</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
          ))}
          <textarea value={notes} onChange={(event) => { setNotes(event.target.value); setCustom(true); }} rows={5} />
        </div>
      )}
    </div>
  );
}
