import { useEffect, useState } from "react";
import { crisisClinics, FEED, isReceiving, patients, quietClinics } from "@shared/world.js";
import { approvePlan, getJSON, runRelay } from "./api";
import { Board } from "./Board";

const DEFAULT_NOTES = FEED.map((item) => `${item.at} ${item.source}: ${item.text}`).join("\n");

// isReceiving() drops any clinic whose generator fuel is below this many minutes.
const MIN_GENERATOR_MINUTES = 120;

export function Desk({ onFilm, onArch, onHome }) {
  const people = patients();
  const [clinics, setClinics] = useState(() => quietClinics());
  const [feed, setFeed] = useState([]);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [trace, setTrace] = useState([]);
  const [plan, setPlan] = useState(null);
  const [kept, setKept] = useState([]);
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState(false);
  const [warning, setWarning] = useState("");
  const [custom, setCustom] = useState(false);
  const [editor, setEditor] = useState(true);
  const [panel, setPanel] = useState("people");
  const [health, setHealth] = useState(null);
  const clock = feed.length ? 2 * 3600 + 26 * 60 : 2 * 3600 + 14 * 60;

  async function checkHealth() {
    try {
      setHealth(await getJSON("/api/health"));
    } catch {
      setHealth({ ok: false, message: "The Relay service is not answering." });
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  function loadFlood() {
    setClinics(crisisClinics());
    setFeed(FEED);
    setNotes(DEFAULT_NOTES);
    setCustom(false);
    setPlan(null);
    setKept([]);
    setTrace([]);
    setApproved(false);
    setWarning("");
    setPanel("people");
    setEditor(true);
  }

  function resetQuiet() {
    setClinics(quietClinics());
    setFeed([]);
    setNotes(DEFAULT_NOTES);
    setCustom(false);
    setPlan(null);
    setKept([]);
    setTrace([]);
    setApproved(false);
    setWarning("");
    setPanel("people");
  }

  function updateClinic(id, fields) {
    setCustom(true);
    setPlan(null);
    setKept([]);
    setApproved(false);
    setClinics((list) => list.map((clinic) => (clinic.id === id ? { ...clinic, ...fields } : clinic)));
  }

  async function planNight() {
    if (!custom && !feed.length) {
      setClinics(crisisClinics());
      setFeed(FEED);
    }
    setRunning(true);
    setPlan(null);
    setKept([]);
    setTrace([]);
    setApproved(false);
    setWarning("");
    setPanel("trace");
    let finalPlan = null;
    const useCustom = custom || notes.trim() !== DEFAULT_NOTES;
    try {
      await runRelay(
        useCustom ? { mode: "custom", clinics: custom || feed.length ? clinics : crisisClinics(), notes } : { mode: "tonight" },
        (event, data) => {
          if (event === "tool") setTrace((current) => [...current, data]);
          if (event === "repair") setWarning(data.errors?.[0] || "Correcting the plan.");
          if (event === "status" && data.message) setWarning(data.message);
          if (event === "plan") finalPlan = data.plan;
          if (event === "error") setWarning(data.message);
        },
      );
      if (!finalPlan) throw new Error("No plan came back.");
      setPlan(finalPlan);
      setKept(finalPlan.assignments.map((item) => item.patientId));
      if (!feed.length) setFeed(FEED);
      setPanel("plan");
      setWarning("Review every move. Keep what you want. Send the rest back with new orders.");
    } catch (error) {
      setWarning(error.message);
      setPanel("people");
    } finally {
      setRunning(false);
    }
  }

  function keepAssignment(patientId) {
    setKept((current) => (current.includes(patientId) ? current : [...current, patientId]));
  }

  function sendBack(assignment) {
    setKept((current) => current.filter((id) => id !== assignment.patientId));
    const line = `Naomi: send ${assignment.patientName} back. Do not use ${assignment.toClinicName} for them. Suggest another safe option.`;
    setNotes((text) => (text.includes(line) ? text : `${text.trim()}\n${line}`));
    setCustom(true);
    setWarning(`${assignment.patientName} sent back. Add orders if you want, then plan again.`);
  }

  function rejectPlan() {
    if (!plan) return;
    setNotes((text) => `${text.trim()}\nNaomi: reject the whole plan. Rebuild with the clinic state and orders above.`);
    setCustom(true);
    setPlan(null);
    setKept([]);
    setApproved(false);
    setPanel("people");
    setWarning("Plan rejected. Change clinics or your orders, then ask Bedrock again.");
  }

  async function approve() {
    if (!plan || !kept.length) return;
    const assignments = plan.assignments.filter((item) => kept.includes(item.patientId));
    const dropped = plan.assignments.filter((item) => !kept.includes(item.patientId));
    const next = {
      ...plan,
      assignments,
      unplaced: [
        ...(plan.unplaced || []),
        ...dropped.map((item) => ({
          patientId: item.patientId,
          name: item.patientName,
          reason: "Naomi sent this move back before approval.",
        })),
      ],
      summary: `${assignments.length} moves kept by Naomi. ${dropped.length} sent back.`,
    };
    setPlan(next);
    setApproved(true);
    setWarning("");
    try { await approvePlan(next); } catch { /* shown locally */ }
  }

  const mode = running ? "trace" : panel;
  const revealed = plan ? plan.assignments.length : 0;

  return (
    <div className="desk-shell">
      <div className="topbar">
        <button className="text" onClick={onHome}>Relay</button>
        <div className="row">
          <span className={`engine-pill ${health?.ok ? "live" : "fallback"}`} title={health?.ok ? health.modelId || "" : health?.message || ""}>
            {health === null
              ? "Checking Bedrock…"
              : health.ok
                ? "Bedrock live"
                : "Bedrock offline · using safety rules"}
          </span>
          {health && !health.ok && (
            <button className="btn ghost tiny" type="button" onClick={checkHealth}>Retry</button>
          )}
          <button className="btn ghost" onClick={onArch}>Architecture</button>
          <button className="btn ghost" onClick={onFilm}>Film for video</button>
        </div>
      </div>
      <div className="desk-frame">
        <Board
          clinics={clinics}
          patients={people}
          feed={feed}
          trace={trace}
          plan={plan}
          kept={kept}
          revealed={revealed}
          flood={feed.some((item) => item.id === "wx" || item.id === "custom") ? 1 : 0}
          clock={clock}
          approved={approved}
          showApprove={Boolean(plan) && !approved && kept.length > 0}
          onApprove={approve}
          onKeep={keepAssignment}
          onSendBack={sendBack}
          onRejectPlan={rejectPlan}
          running={running}
          warning={warning}
          mode={mode}
          onMode={setPanel}
        />
      </div>
      <div className="desk-controls">
        <button className="btn" onClick={loadFlood}>1. Load the Tuesday flood</button>
        <button className="btn ghost" onClick={resetQuiet}>Reset to quiet night</button>
        <button className="btn" onClick={planNight} disabled={running}>
          {running ? "Bedrock is drafting…" : plan ? "3. Ask Bedrock again" : "3. Ask Bedrock for a draft"}
        </button>
        <button className="btn ghost" onClick={() => setEditor((value) => !value)}>
          {editor ? "Hide your controls" : "2. Show your controls"}
        </button>
      </div>
      {editor && (
        <div className="editor interactive-editor">
          <div className="orders">
            <p className="eyebrow">Your orders to Bedrock</p>
            <p className="quiet-line">Write what you want. Bedrock drafts from this. You still keep or send back every move.</p>
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setCustom(true);
                setApproved(false);
              }}
              rows={6}
              placeholder="Example: Keep Patrick at Eastbank only if fuel allows. Prefer Main for wheelchair vans."
            />
          </div>
          {clinics.map((clinic) => {
            const receiving = isReceiving(clinic);
            const lowFuel = clinic.generator && clinic.generatorMinutes < MIN_GENERATOR_MINUTES;
            return (
              <div key={clinic.id} className={`clinic-edit ${receiving ? "receiving" : "not-receiving"}`}>
                <strong>{clinic.short}</strong>
                <span className={`clinic-state ${receiving ? "ok" : "off"}`}>
                  {receiving ? "Receiving" : "Not receiving"}
                </span>
                <label><input type="checkbox" checked={clinic.power} onChange={(event) => updateClinic(clinic.id, { power: event.target.checked })} /> Power</label>
                <label><input type="checkbox" checked={clinic.water} onChange={(event) => updateClinic(clinic.id, { water: event.target.checked })} /> Water</label>
                <label>
                  <input
                    type="checkbox"
                    checked={clinic.generator}
                    onChange={(event) =>
                      updateClinic(clinic.id, {
                        generator: event.target.checked,
                        generatorMinutes: event.target.checked ? clinic.generatorMinutes || MIN_GENERATOR_MINUTES : 0,
                      })
                    }
                  /> Generator
                </label>
                <label className={clinic.generator ? "" : "disabled"}>
                  Fuel min
                  <input
                    type="number"
                    min="0"
                    max="600"
                    disabled={!clinic.generator}
                    value={clinic.generator ? clinic.generatorMinutes : 0}
                    onChange={(event) => updateClinic(clinic.id, { generatorMinutes: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Open chairs
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={clinic.openChairs}
                    onChange={(event) => updateClinic(clinic.id, { openChairs: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Road
                  <select value={clinic.road} onChange={(event) => updateClinic(clinic.id, { road: event.target.value })}>
                    <option value="clear">Clear</option>
                    <option value="van-only">Vans only</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
                {lowFuel && (
                  <span className="clinic-hint">
                    Generator fuel under {MIN_GENERATOR_MINUTES} min, so this clinic will not take patients.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
