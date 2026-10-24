import { useEffect, useRef, useState } from "react";
import { crisisClinics, formatClock, patients, quietClinics, FEED } from "@shared/world.js";
import { LINES } from "@shared/script.js";
import { approvePlan, getJSON, runRelay, speakLine } from "./api";
import { sound } from "./audio";
import { Atmosphere } from "./Rain";
import { Board } from "./Board";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function abortError() {
  const error = new Error("abort");
  error.name = "AbortError";
  return error;
}

export function Film({ onExit }) {
  const people = patients();
  const [take, setTake] = useState(1);
  const [phase, setPhase] = useState("cold");
  const [title, setTitle] = useState("city");
  const [clinics, setClinics] = useState(() => quietClinics());
  const [feed, setFeed] = useState([]);
  const [trace, setTrace] = useState([]);
  const [plan, setPlan] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [approved, setApproved] = useState(false);
  const [approvedAt, setApprovedAt] = useState("");
  const [caption, setCaption] = useState(null);
  const [clock, setClock] = useState(2 * 3600 + 14 * 60);
  const [paused, setPaused] = useState(false);
  const [flood, setFlood] = useState(0);
  const [flicker, setFlicker] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [warning, setWarning] = useState("");
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [armed, setArmed] = useState(() => sound.started);
  const pausedRef = useRef(false);
  const runRef = useRef(0);
  const planRef = useRef(null);
  const clockRef = useRef(clock);
  const buffers = useRef(new Map());

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { planRef.current = plan; }, [plan]);
  useEffect(() => { clockRef.current = clock; }, [clock]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) setClock((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function jumpClock(hours, minutes) {
    const target = hours * 3600 + minutes * 60;
    setClock((value) => Math.max(value, target));
  }

  function flash() {
    setFlicker(true);
    setTimeout(() => setFlicker(false), 220);
  }

  function patch(id) {
    const next = crisisClinics().find((clinic) => clinic.id === id);
    setClinics((list) => list.map((clinic) => (clinic.id === id ? next : clinic)));
  }

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onExit();
      if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => {
          const next = !value;
          sound.togglePause();
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  useEffect(() => {
    if (!armed) return undefined;
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    const sleep = async (ms) => {
      let left = ms;
      while (left > 0) {
        if (!alive()) throw abortError();
        while (pausedRef.current && alive()) await wait(40);
        const step = Math.min(40, left);
        await wait(step);
        left -= step;
      }
    };
    const speak = async (lineId) => {
      const line = LINES.find((item) => item.id === lineId);
      setCaption({ speaker: line.speaker, text: line.text });
      if (line.radio) sound.squelch();
      sound.duck();
      const buffer = buffers.current.get(lineId);
      if (buffer) await sound.playBuffer(buffer, { radio: line.radio });
      else await sound.speakText(line.text);
      sound.unduck();
      if (!alive()) throw abortError();
    };
    const loadVoices = async () => {
      try {
        const payload = await getJSON("/api/script");
        for (const line of payload.lines || []) {
          if (!line.audio || !sound.ctx) continue;
          const buffer = await sound.decodeBase64(line.audio);
          buffers.current.set(line.id, buffer);
        }
      } catch {
        setWarning("The narrator is using this computer’s voice. Polly did not answer.");
      }
    };
    const planNight = async () => {
      setPhase("planning");
      setRunning(true);
      setTrace([]);
      setPlan(null);
      planRef.current = null;
      setRevealed(0);
      setShowApprove(false);
      jumpClock(2, 27);
      const lines = [
        "Three clinics can still take someone. Two cannot.",
        "Five wheelchair seats. Not six.",
        "Patrick Nguyen will not finish before the fuel runs out.",
      ];
      let index = 0;
      setCaption({ speaker: "Relay", text: lines[0] });
      const rotator = setInterval(() => {
        if (planRef.current) return;
        index = (index + 1) % lines.length;
        setCaption({ speaker: "Relay", text: lines[index] });
      }, 7000);
      const queue = [];
      let pumping = false;
      const pump = async () => {
        if (pumping) return;
        pumping = true;
        try {
          while (queue.length && alive()) {
            const item = queue.shift();
            setTrace((current) => [...current, item]);
            setCaption({ speaker: "Amazon Bedrock", text: item.summary });
            sound.tick();
            await wait(700);
          }
        } finally {
          pumping = false;
          if (queue.length && alive()) pump();
        }
      };
      let finalPlan = null;
      let failed = null;
      try {
        sound.thunder();
        await runRelay({ mode: "tonight" }, (event, data) => {
          if (event === "tool") {
            queue.push(data);
            pump();
          } else if (event === "repair") {
            setCaption({ speaker: "Relay", text: data.errors?.[0] || "That plan broke a rule. Trying again." });
            sound.alert();
          } else if (event === "status" && data.message) {
            setWarning(data.message);
          } else if (event === "plan") {
            finalPlan = data.plan;
            planRef.current = data.plan;
            clearInterval(rotator);
          } else if (event === "error") {
            failed = data.message;
          }
        });
      } finally {
        clearInterval(rotator);
        setRunning(false);
      }
      if (!alive()) throw abortError();
      if (!finalPlan) throw new Error(failed || "No plan came back.");
      setPlan(finalPlan);
      setPhase("plan");
      setCaption({ speaker: "Naomi Brooks", text: "The plan is on the desk." });
      for (let i = 1; i <= finalPlan.assignments.length; i += 1) {
        await sleep(720);
        setRevealed(i);
        sound.place();
      }
      await sleep(500);
      setShowApprove(true);
      setPhase("decision");
      setCaption({ speaker: "", text: "Nothing moves until she approves it." });
    };

    (async () => {
      try {
        setPhase("cold");
        setClinics(quietClinics());
        setFeed([]);
        setTrace([]);
        setPlan(null);
        setRevealed(0);
        setApproved(false);
        setShowApprove(false);
        setFlood(0);
        setWarning("");
        setCaption(null);
        setClock(2 * 3600 + 14 * 60);
        setTitle("city");
        const loading = loadVoices();
        await sleep(1500);
        setTitle("relay");
        await loading;
        await sleep(1100);
        if (!alive()) return;
        setTitle("");
        setPhase("quiet");
        await speak("open1");
        await sleep(350);
        await speak("open2");
        await sleep(900);
        jumpClock(2, 17);
        setFlood(1);
        sound.thunder();
        setFeed([FEED[0]]);
        setPhase("weather");
        await speak("weather");
        await sleep(450);
        jumpClock(2, 19);
        patch("pier");
        flash();
        sound.powerFail();
        setFeed((items) => [...items, FEED[1]]);
        await speak("pier");
        await sleep(400);
        jumpClock(2, 21);
        patch("eastbank");
        sound.alert();
        setFeed((items) => [...items, FEED[2]]);
        await speak("east");
        await sleep(400);
        jumpClock(2, 24);
        patch("wharf");
        sound.powerFail();
        setFeed((items) => [...items, FEED[3]]);
        await speak("wharf");
        await sleep(350);
        jumpClock(2, 26);
        patch("cedar");
        setFeed((items) => [...items, FEED[4]]);
        await speak("roads");
        await sleep(700);
        setCaption({ speaker: "", text: "Thirteen people. Five van seats. Forty minutes of fuel." });
        await sleep(1300);
        await planNight();
      } catch (error) {
        if (error.name !== "AbortError") setWarning(error.message);
      }
    })();

    return () => {
      runRef.current += 1;
      sound.stopVoice();
    };
  }, [take, armed]);

  async function approve() {
    if (!plan || approved) return;
    setApproved(true);
    setShowApprove(false);
    const stamp = formatClock(clockRef.current);
    setApprovedAt(stamp);
    sound.approve();
    try { await approvePlan(plan); } catch { /* the stamp still stands on the desk */ }
    setCaption({ speaker: "Naomi Brooks", text: plan.summary });
    try {
      sound.duck();
      const spoken = await speakLine(plan.summary, "Matthew");
      if (spoken.audio && sound.ctx) {
        const buffer = await sound.decodeBase64(spoken.audio);
        await sound.playBuffer(buffer, { radio: false });
      } else {
        await sound.speakText(plan.summary);
      }
      sound.unduck();
    } catch {
      sound.unduck();
    }
    setPhase("end");
  }

  function skipToPlan() {
    runRef.current += 1;
    sound.stopVoice();
    setTitle("");
    setClinics(crisisClinics());
    setFeed(FEED);
    setFlood(1);
    setWarning("");
    setApproved(false);
    jumpClock(2, 27);
    const id = runRef.current;
    const alive = () => runRef.current === id;
    (async () => {
      const sleep = async (ms) => {
        let left = ms;
        while (left > 0) {
          if (!alive()) throw abortError();
          await wait(Math.min(40, left));
          left -= 40;
        }
      };
      setPhase("planning");
      setRunning(true);
      setTrace([]);
      setPlan(null);
      setRevealed(0);
      setShowApprove(false);
      setCaption({ speaker: "Relay", text: "Reading the night." });
      let finalPlan = null;
      try {
        await runRelay({ mode: "tonight" }, (event, data) => {
          if (event === "tool") {
            setTrace((current) => [...current, data]);
            setCaption({ speaker: "Amazon Bedrock", text: data.summary });
            sound.tick();
          } else if (event === "repair") {
            setCaption({ speaker: "Relay", text: data.errors?.[0] || "Correcting the plan." });
          } else if (event === "plan") {
            finalPlan = data.plan;
          } else if (event === "status" && data.message) {
            setWarning(data.message);
          }
        });
        if (!alive()) return;
        if (!finalPlan) throw new Error("No plan came back.");
        setPlan(finalPlan);
        setPhase("plan");
        for (let i = 1; i <= finalPlan.assignments.length; i += 1) {
          await sleep(500);
          setRevealed(i);
          sound.place();
        }
        setShowApprove(true);
        setPhase("decision");
        setCaption({ speaker: "", text: "Nothing moves until she approves it." });
      } catch (error) {
        if (error.name !== "AbortError") setWarning(error.message);
      } finally {
        setRunning(false);
      }
    })();
  }

  const mode = plan ? "plan" : phase === "planning" ? "trace" : "people";

  if (!armed) {
    return (
      <div className="poster">
        <Atmosphere />
        <div className="poster-copy">
          <p className="eyebrow">Video take · sound on</p>
          <h1>Relay</h1>
          <p className="deck">This mode is for recording the demo. Work the night on the silent desk instead.</p>
          <button className="btn" onClick={async () => { await sound.start(); setArmed(true); }}>Start the film</button>
          <button className="btn ghost" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="film">
      <Atmosphere />
      <div className="letterbox top">
        <span>Relay</span>
        <span className="timecode">{formatClock(clock)}</span>
        <span className="controls">
          <button onClick={() => { setPaused((value) => !value); sound.togglePause(); }}>{paused ? "Play" : "Pause"}</button>
          <button onClick={() => { const next = !muted; setMuted(next); sound.setMuted(next); }}>{muted ? "Sound on" : "Mute"}</button>
          <button onClick={skipToPlan}>Skip to the plan</button>
          <button onClick={onExit}>Leave</button>
        </span>
      </div>
      <div className="stage">
        {title && (
          <div className="titlecard">
            <p className="eyebrow">{title === "city" ? "Tuesday · 2:14 a.m." : "Harborlight Dialysis"}</p>
            <h1>{title === "city" ? "Harbor City" : "Relay"}</h1>
            {title === "relay" && <p className="deck">Naomi Brooks is on call.</p>}
          </div>
        )}
        <div className={`monitor ${flicker ? "flicker" : ""} ${phase === "cold" ? "dim" : ""}`}>
          <Board
            clinics={clinics}
            patients={people}
            feed={feed}
            trace={trace}
            plan={plan}
            revealed={revealed}
            flood={flood}
            clock={clock}
            approved={approved}
            showApprove={showApprove}
            onApprove={approve}
            running={running}
            warning={warning}
            mode={mode}
          />
        </div>
        {phase === "end" && plan && (
          <div className="endcard">
            <p className="eyebrow">The night held</p>
            <h2>{plan.summary}</h2>
            <ul className="stats">
              <li><b>{plan.assignments.filter((item) => item.action === "transfer").length}</b><span>moved</span></li>
              <li><b>{plan.assignments.filter((item) => item.action === "finish-on-machine").length}</b><span>finished on the machine</span></li>
              <li><b>{plan.assignments.filter((item) => ["pier", "wharf"].includes(item.toClinicId) && item.action === "transfer").length}</b><span>sent to a dark clinic</span></li>
            </ul>
            <blockquote>{plan.tradeoff}</blockquote>
            <p className="sign">Approved by Naomi Brooks · {approvedAt}</p>
            <p className="model-id">{plan.source === "bedrock" ? "Amazon Bedrock" : "Safety rules"}{plan.modelId ? ` · ${plan.modelId}` : ""}</p>
            <div className="row">
              <button className="btn" onClick={() => setTake((value) => value + 1)}>Play the night again</button>
              <button className="btn ghost" onClick={onExit}>Leave</button>
            </div>
          </div>
        )}
      </div>
      <div className="letterbox bottom">
        {caption && (
          <div className="caption">
            {caption.speaker && <p className="speaker">{caption.speaker}</p>}
            <p>{caption.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
