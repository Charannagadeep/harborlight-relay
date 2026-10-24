import { useEffect, useRef } from "react";
import { formatClock } from "@shared/world.js";
import { Map } from "./Map";

function prettyRide(value) {
  const text = String(value || "");
  if (/van/i.test(text)) return "Wheelchair van";
  if (/shuttle/i.test(text)) return "Clinic shuttle";
  return text;
}

export function Board({
  clinics,
  patients,
  feed,
  trace,
  plan,
  kept = [],
  revealed = 0,
  flood = 0,
  clock,
  approved,
  showApprove,
  onApprove,
  onKeep,
  onSendBack,
  onRejectPlan,
  running,
  warning,
  mode = "people",
  onMode,
}) {
  const scroller = useRef(null);
  const shown = plan ? plan.assignments.slice(0, revealed) : [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [shown.length, trace.length, feed.length]);

  // Film mode has no keep/send-back handlers — treat every assignment as kept.
  const interactive = Boolean(onKeep && onSendBack);
  const activeIds = interactive ? kept : shown.map((item) => item.patientId);
  const keptRows = shown.filter((item) => activeIds.includes(item.patientId));
  const transfers = keptRows.filter((item) => item.action === "transfer").length;
  const finishes = keptRows.filter((item) => item.action === "finish-on-machine").length;

  return (
    <section className="board">
      <header className="board-head">
        <div>
          <p className="eyebrow">Harborlight Dialysis</p>
          <h2>Continuity desk</h2>
        </div>
        <div className="head-meta">
          <span>You are Naomi Brooks · on call</span>
          <strong>{formatClock(clock)}</strong>
        </div>
      </header>
      <div className="map-panel">
        <Map
          clinics={clinics}
          patients={patients}
          assignments={shown.filter((item) => activeIds.includes(item.patientId))}
          flood={flood}
        />
      </div>
      <aside className="side" ref={scroller}>
        {onMode && (
          <div className="panel-tabs">
            <button className={mode === "people" ? "active" : ""} onClick={() => onMode("people")} type="button">Patients</button>
            <button className={mode === "trace" ? "active" : ""} onClick={() => onMode("trace")} type="button" disabled={!trace.length && !running}>Bedrock</button>
            <button className={mode === "plan" ? "active" : ""} onClick={() => onMode("plan")} type="button" disabled={!plan}>Your review</button>
          </div>
        )}
        <div className="feed">
          <p className="eyebrow">Incoming</p>
          {feed.length === 0 && <p className="quiet-line">Load the flood or flip clinic power to start the night.</p>}
          {feed.map((item) => (
            <article key={item.id} className="feed-item">
              <p className="feed-meta">{item.at} · {item.source}</p>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        {mode === "trace" && (
          <div className="trace">
            <p className="eyebrow">Amazon Bedrock</p>
            {trace.length === 0 && <p className="quiet-line">Ask Bedrock for a draft when you are ready.</p>}
            {trace.map((item, index) => (
              <article key={`${item.name}-${index}`} className="trace-item">
                <code>{item.name}</code>
                <p>{item.summary}</p>
              </article>
            ))}
            {running && <p className="quiet-line">Bedrock is drafting. You approve nothing yet.</p>}
          </div>
        )}
        {mode === "people" && (
          <div className="people">
            <p className="eyebrow">Tonight’s list</p>
            {patients.map((patient) => (
              <article key={patient.id} className="person-row">
                <div>
                  <strong>{patient.name}</strong>
                  <span>{patient.age} · {patient.mobility === "wheelchair" ? "Wheelchair" : "Can walk to a shuttle"}</span>
                </div>
                <em>{patient.status === "on-machine" ? `${patient.minutesRemaining} min left` : `${patient.hoursSince}h since treatment`}</em>
              </article>
            ))}
          </div>
        )}
        {mode === "plan" && plan && (
          <div className="plan">
            <p className="eyebrow">{plan.source === "bedrock" ? "Draft from Amazon Bedrock" : "Draft from the safety rules"}</p>
            <p className="summary">{plan.summary}</p>
            <p className="counts">
              {interactive
                ? `${kept.length} kept · ${transfers} moving · ${finishes} finishing · ${shown.length - kept.length} sent back`
                : `${transfers} moving · ${finishes} finishing on the machine`}
            </p>
            {shown.map((assignment) => {
              const isKept = activeIds.includes(assignment.patientId);
              return (
                <article key={assignment.patientId} className={`assign ${isKept ? "kept" : "sent-back"}`}>
                  <div>
                    <strong>{assignment.patientName}</strong>
                    <span>{assignment.fromClinicName} → {assignment.toClinicName}</span>
                  </div>
                  <em>{assignment.action === "finish-on-machine" ? "Finish on the machine" : prettyRide(assignment.transport)}</em>
                  <p>{assignment.reason}</p>
                  {!approved && interactive && (
                    <div className="assign-actions">
                      <button type="button" className={`btn tiny ${isKept ? "" : "ghost"}`} onClick={() => onKeep(assignment.patientId)}>Keep</button>
                      <button type="button" className="btn tiny ghost" onClick={() => onSendBack(assignment)}>Send back</button>
                    </div>
                  )}
                  {interactive && !isKept && !approved && <p className="quiet-line">Sent back · will not go out on approval</p>}
                </article>
              );
            })}
            {revealed >= plan.assignments.length && (
              <>
                <p className="tradeoff">{plan.tradeoff}</p>
                <div className="messages">
                  <h3>Patients</h3>
                  <p>{plan.messages.patients}</p>
                  <h3>Drivers</h3>
                  <p>{plan.messages.drivers}</p>
                  <h3>Charge nurses</h3>
                  <p>{plan.messages.chargeNurses}</p>
                </div>
                {plan.modelId && <p className="model-id">{plan.modelId}{plan.requestId ? ` · ${plan.requestId}` : ""}</p>}
              </>
            )}
            {!approved && (
              <div className="plan-actions">
                {showApprove && (
                  <button className="btn approve" onClick={onApprove}>
                    {interactive ? `Approve kept moves (${kept.length})` : "Approve the plan"}
                  </button>
                )}
                {interactive && onRejectPlan && <button className="btn ghost" type="button" onClick={onRejectPlan}>Reject whole draft</button>}
              </div>
            )}
            {approved && <p className="stamp">Approved · Naomi Brooks{interactive ? ` · ${kept.length} moves` : ""}</p>}
          </div>
        )}
        {warning && <p className="warn-line">{warning}</p>}
      </aside>
      <footer className="board-foot">
        <span>You set the clinics. Bedrock drafts. You keep or send back every move.</span>
        <span>Fictional night. Silent desk.</span>
      </footer>
    </section>
  );
}
