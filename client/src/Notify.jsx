import { useRef, useState } from "react";
import { LANGUAGES } from "@shared/world.js";
import { speakLine } from "./api";

function sourceLabel(message) {
  if (message.edited) return "Edited by Naomi";
  if (message.source === "template") return "Plain template";
  return "Drafted by Bedrock";
}

function statusLine(result) {
  if (!result) return null;
  return result.channels.map((channel) => {
    if (channel.type === "email" && channel.status === "sent") return `Email sent · SES ${channel.messageId?.slice(0, 12) || ""}…`;
    if (channel.type === "email" && channel.status === "preview") return "Email preview only";
    if (channel.type === "email") return `Email failed · ${channel.error}`;
    if (channel.type === "voice" && channel.status === "ready") return `Voice ready · Polly ${channel.voice}`;
    return `Voice failed · ${channel.error}`;
  }).join(" · ");
}

export function Notify({
  approved,
  drafts,
  trace,
  running,
  sending,
  results,
  live,
  source,
  onDraft,
  onEdit,
  onToggle,
  onSend,
}) {
  const [open, setOpen] = useState({});
  const [playing, setPlaying] = useState("");
  const audio = useRef(null);

  async function play(message) {
    const voice = LANGUAGES[message.language]?.voice || "Joanna";
    const existing = results[message.patientId]?.audio;
    setPlaying(message.patientId);
    try {
      const data = existing ? { audio: existing } : await speakLine(message.voiceScript || message.body, voice);
      if (!data.audio) return;
      audio.current?.pause();
      audio.current = new Audio(`data:audio/mpeg;base64,${data.audio}`);
      audio.current.onended = () => setPlaying("");
      await audio.current.play();
    } catch {
      setPlaying("");
    }
  }

  if (!approved) {
    return (
      <div className="notify">
        <p className="eyebrow">Patient messages</p>
        <p className="quiet-line">Approve the moves first. Then Bedrock writes to each person you kept.</p>
      </div>
    );
  }

  const chosen = drafts.filter((message) => message.selected);
  const sentCount = Object.keys(results).length;

  return (
    <div className="notify">
      <p className="eyebrow">Patient messages · Amazon Bedrock</p>
      {!drafts.length && !running && (
        <>
          <p className="quiet-line">Bedrock writes one message per kept move, in each person's language. Code checks every clinic, time, and phone number. You read and send.</p>
          <button className="btn" type="button" onClick={onDraft}>Draft patient messages</button>
        </>
      )}

      {trace.map((item, index) => (
        <article key={`${item.name}-${index}`} className="trace-item">
          <code>{item.name}</code>
          <p>{item.summary}</p>
        </article>
      ))}
      {running && <p className="quiet-line">Bedrock is writing. Nothing has been sent.</p>}

      {source === "template" && drafts.length > 0 && (
        <p className="warn-line">Bedrock's drafts did not pass the safety check, so plain English templates are shown. Edit them or draft again.</p>
      )}

      {drafts.map((message) => {
        const result = results[message.patientId];
        const language = LANGUAGES[message.language]?.name || "English";
        return (
          <article key={message.patientId} className={`note ${message.selected ? "" : "skipped"} ${result ? "done" : ""}`}>
            <header>
              <div>
                <strong>{message.name}</strong>
                <span>{message.audience === "emergency contact" ? "To emergency contact" : "To patient"} · {language} · {sourceLabel(message)}</span>
              </div>
              {!result && (
                <label className="note-pick">
                  <input type="checkbox" checked={message.selected} onChange={() => onToggle(message.patientId)} /> Send
                </label>
              )}
            </header>
            <input
              className="note-subject"
              value={message.subject}
              disabled={Boolean(result)}
              onChange={(event) => onEdit(message.patientId, { subject: event.target.value })}
              aria-label={`Subject for ${message.name}`}
            />
            <textarea
              value={message.body}
              rows={5}
              disabled={Boolean(result)}
              onChange={(event) => onEdit(message.patientId, { body: event.target.value })}
              aria-label={`Message for ${message.name}`}
            />
            <div className="note-actions">
              {message.language !== "en" && (
                <button type="button" className="btn tiny ghost" onClick={() => setOpen((state) => ({ ...state, [message.patientId]: !state[message.patientId] }))}>
                  {open[message.patientId] ? "Hide English" : "Show English"}
                </button>
              )}
              <button type="button" className="btn tiny ghost" onClick={() => play(message)} disabled={playing === message.patientId}>
                {playing === message.patientId ? "Playing…" : "Hear voice call"}
              </button>
            </div>
            {open[message.patientId] && <p className="note-english">{message.english}</p>}
            {result && <p className="note-status">{statusLine(result)}</p>}
          </article>
        );
      })}

      {drafts.length > 0 && sentCount < drafts.length && (
        <div className="plan-actions">
          <button className="btn approve" type="button" onClick={onSend} disabled={sending || !chosen.length}>
            {sending ? "Sending…" : `Send ${chosen.length} message${chosen.length === 1 ? "" : "s"}`}
          </button>
          <button className="btn ghost" type="button" onClick={onDraft} disabled={running || sending}>Draft again</button>
        </div>
      )}
      {sentCount > 0 && (
        <p className="stamp">
          {live ? `${sentCount} sent by Amazon SES` : `${sentCount} previewed · set NOTIFY_TO to send`} · approved by Naomi Brooks
        </p>
      )}
    </div>
  );
}
