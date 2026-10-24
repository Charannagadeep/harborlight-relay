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
  revealed = 0,
  flood = 0,
  clock,
  approved,
  showApprove,
  onApprove,
  running,
  warning,
  mode = "people",
}) {
  const scroller = useRef(null);
  const shown = plan ? plan.assignments.slice(0, revealed) : [];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [shown.length, trace.length, feed.length]);

  const transfers = shown.filter((item) => item.action === "transfer").length;
  const finishes = shown.filter((item) => item.action === "finish-on-machine").length;

  return (
    <section className="board">
      <header className="board-head">
        <div>
          <p className="eyebrow">Harborlight Dialysis</p>
          <h2>Continuity desk</h2>
        </div>
        <div className="head-meta">
          <span>Naomi Brooks · on call</span>
          <strong>{formatClock(clock)}</strong>
        </div>
      </header>
      <div className="map-panel">
        <Map clinics={clinics} patients={patients} assignments={shown} flood={flood} />
      </div>
      <aside className="side" ref={scroller}>
        <div className="feed">
          <p className="eyebrow">Incoming</p>
          {feed.length === 0 && <p className="quiet-line">The board is green.</p>}
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
            {trace.length === 0 && <p className="quiet-line">Relay is reading the night.</p>}
            {trace.map((item, index) => (
              <article key={`${item.name}-${index}`} className="trace-item">
                <code>{item.name}</code>
                <p>{item.summary}</p>
              </article>
            ))}
            {running && <p className="quiet-line">On the line with Bedrock…</p>}
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
            <p className="eyebrow">{plan.source === "bedrock" ? "Planned by Amazon Bedrock" : "Placed by the safety rules"}</p>
            <p className="summary">{plan.summary}</p>
            <p className="counts">{transfers} moving · {finishes} finishing on the machine</p>
            {shown.map((assignment) => (
              <article key={assignment.patientId} className="assign">
                <div>
                  <strong>{assignment.patientName}</strong>
                  <span>{assignment.fromClinicName} → {assignment.toClinicName}</span>
                </div>
                <em>{assignment.action === "finish-on-machine" ? "Finish on the machine" : prettyRide(assignment.transport)}</em>
                <p>{assignment.reason}</p>
              </article>
            ))}
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
            {showApprove && !approved && (
              <button className="btn approve" onClick={onApprove}>Approve the plan</button>
            )}
            {approved && <p className="stamp">Approved · Naomi Brooks</p>}
          </div>
        )}
        {warning && <p className="warn-line">{warning}</p>}
      </aside>
      <footer className="board-foot">
        <span>6 clinics · 420 patients on the service · 13 in this decision</span>
        <span>Fictional night. A person approves every move.</span>
      </footer>
    </section>
  );
}
