import { useEffect, useRef, useState } from "react";
import { crisisClinics, formatClock, patients, quietClinics, FEED } from "@shared/world.js";
import { LINES } from "@shared/script.js";
import { approvePlan, getJSON, runRelay, speakLine } from "./api";
import { sound } from "./audio";
import { Atmosphere } from "./Rain";
import { Board } from "./Board";
import { Prologue } from "./Prologue";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function filmAutoMode() {
  if (new URLSearchParams(window.location.search).get("auto") === "1") return true;
  const hash = window.location.hash || "";
  return /(?:\?|&)auto=1(?:&|$)/.test(hash) || hash.includes("auto=1");
}

function abortError() {
  const error = new Error("abort");
  error.name = "AbortError";
  return error;
}

function lineHoldMs(text) {
  return Math.min(18000, Math.max(2800, String(text || "").length * 55));
}

export function Film({ onExit }) {
  const people = patients();
  const [take, setTake] = useState(1);
  const [phase, setPhase] = useState("cold");
  const [chapter, setChapter] = useState("story");
  const [prologue, setPrologue] = useState(null);
  const [title, setTitle] = useState("");
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
  const [running, setRunning] = useState(false);
  const [archBeat, setArchBeat] = useState(0);
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
      if (!pausedRef.current && !prologue) setClock((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [prologue]);

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

  // Short end-card hold only — no frozen minute of padding
  useEffect(() => {
    if (phase !== "end" || !filmAutoMode()) return undefined;
    let cancelled = false;
    (async () => {
      await wait(4500);
      if (cancelled) return;
      try {
        const blob = await sound.stopCapture();
        if (cancelled) return;
        if (blob) {
          const b64 = await sound.blobToBase64(blob);
          window.__relayDemoAudio = { b64, type: blob.type || "audio/webm" };
        }
      } catch {
        /* recorder optional */
      }
      window.__relayFilmDone = true;
    })();
    return () => { cancelled = true; };
  }, [phase]);

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
      if (!line) return;
      setCaption({ speaker: line.speaker, text: line.text });
      if (line.radio) sound.squelch();
      sound.duck();
      try {
        const buffer = buffers.current.get(lineId);
        if (buffer) await sound.playBuffer(buffer, { radio: line.radio });
        else await sound.speakText(line.text);
      } catch {
        await sleep(lineHoldMs(line.text));
      }
      sound.unduck();
      if (!alive()) throw abortError();
    };
    const loadVoices = async () => {
      // Prefer script injected by the recorder (avoids headless hang)
      const injected = window.__RELAY_SCRIPT__;
      if (injected?.lines?.length && sound.ctx) {
        for (const line of injected.lines) {
          if (!line.audio) continue;
          try {
            const buffer = await sound.decodeBase64(line.audio);
            buffers.current.set(line.id, buffer);
          } catch { /* skip bad line */ }
        }
        return;
      }
      try {
        const payload = await Promise.race([
          getJSON("/api/script"),
          wait(55000).then(() => { throw new Error("Polly script timed out"); }),
        ]);
        for (const line of payload.lines || []) {
          if (!line.audio || !sound.ctx) continue;
          try {
            const buffer = await sound.decodeBase64(line.audio);
            buffers.current.set(line.id, buffer);
          } catch { /* skip */ }
        }
      } catch {
        setWarning("Using this computer’s voice. Polly did not answer.");
      }
    };
    const ambience = (scene) => {
      if (scene === "harbor" || scene === "stormGlass") { sound.thunder(); sound.water(2.4); }
      if (scene === "machine") { sound.clinicHum(2.2); sound.dialysis(2.0); }
      if (scene === "emptyPier" || scene === "radioWall") { sound.powerFail(); sound.splash(); }
      if (scene === "fuelGauge" || scene === "genRoom") { sound.generator(2.4); sound.dialysis(1.6); }
      if (scene === "bridgeOut" || scene === "dryClinic") { sound.splash(); sound.thunder(); }
      if (scene === "ireneHome") { sound.door(); sound.city(1.8); }
      if (scene === "phoneBurst") sound.phoneRing();
      if (scene === "boot") { sound.keyboard(); sound.place(); }
      if (scene === "cityMap" || scene === "seatMath") sound.city(2.0);
      if (scene === "pressure") { sound.alert(); sound.generator(1.8); }
      if (scene === "nodes") sound.tick();
      if (scene === "humanGate") sound.place();
      if (scene === "ramp" || scene === "chairsOpen" || scene === "vanDepart") { sound.door(); sound.city(1.8); }
      if (scene === "signature") sound.approve();
      if (scene === "safetyGate") { sound.alert(); sound.tick(); }
      if (scene === "buildNote") sound.keyboard();
      if (scene === "dawn") { sound.water(2.2); sound.thunder(); }
    };
    const cartoon = async (scene, lineId, hold = 500) => {
      setPrologue(scene);
      setPhase("prologue");
      setTitle("");
      ambience(scene);
      await speak(lineId);
      await sleep(hold);
    };
    /** Visual beat only — no second narration */
    const cutaway = async (scene, hold = 1600) => {
      setPrologue(scene);
      setPhase("prologue");
      setTitle("");
      ambience(scene);
      await sleep(hold);
    };
    const planNight = async () => {
      setChapter("bedrock");
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
      }, 5500);
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
            await wait(900);
          }
        } finally {
          pumping = false;
          if (queue.length && alive()) pump();
        }
      };
      let finalPlan = null;
      let failed = null;
      try {
        sound.keyboard();
        sound.clinicHum(2.0);
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
      setChapter("approve");
      await cartoon("humanGate", "cut_decide", 450);
      setPrologue(null);
      setPlan(finalPlan);
      setPhase("plan");
      setCaption({ speaker: "Naomi Brooks", text: "The plan is on the desk. I decide who moves." });
      let showedRamp = false;
      let showedChairs = false;
      for (let i = 1; i <= finalPlan.assignments.length; i += 1) {
        await sleep(850);
        setRevealed(i);
        sound.place();
        if (!showedRamp && i === Math.min(4, finalPlan.assignments.length)) {
          showedRamp = true;
          await cartoon("ramp", "cut_move", 400);
          setPrologue(null);
          setPhase("plan");
        }
        if (!showedChairs && i === Math.min(8, finalPlan.assignments.length)) {
          showedChairs = true;
          await cutaway("chairsOpen", 1500);
          setPrologue(null);
          setPhase("plan");
        }
      }
      await sleep(600);
      setShowApprove(true);
      setPhase("decision");
      setCaption({ speaker: "", text: "Press Approve when you are ready. Nothing moves until she does." });
      if (filmAutoMode()) {
        await sleep(1600);
        const btn = document.querySelector(".btn.approve");
        if (btn) btn.click();
      }
    };

    (async () => {
      try {
        setPhase("cold");
        setChapter("story");
        setPrologue(null);
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
        setArchBeat(0);
        setClock(2 * 3600 + 14 * 60);
        setTitle("city");
        if (filmAutoMode()) sound.startCapture();
        const loading = loadVoices();
        sound.water(2.5);
        sound.thunder();
        await sleep(4200);
        setTitle("relay");
        await loading;
        await sleep(3800);
        if (!alive()) return;
        setTitle("");

        // Act 1 — unique cartoons only (no repeats)
        await cartoon("harbor", "open1", 550);
        await cartoon("machine", "pro1", 500);
        await cartoon("stormGlass", "pro2", 500);
        await cartoon("emptyPier", "cut_wait", 500);
        await cartoon("fuelGauge", "cut_gen", 500);
        await cartoon("bridgeOut", "pro3", 500);
        await cartoon("ireneHome", "cut_irene", 500);
        await cartoon("phoneBurst", "pro4", 500);
        await cartoon("boot", "pro5", 600);
        setPrologue(null);
        setPhase("quiet");
        setCaption({ speaker: "", text: "The desk is live." });
        sound.place();
        sound.keyboard();
        await sleep(1600);

        // Act 2 — live desk + one unique cutaway per crisis (never reuse Act 1 scenes)
        setChapter("flood");
        await speak("open2");
        await sleep(500);
        jumpClock(2, 17);
        setFlood(1);
        sound.thunder();
        sound.splash();
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
        await cutaway("radioWall", 2100);
        setPrologue(null);
        setPhase("weather");
        jumpClock(2, 21);
        patch("eastbank");
        sound.alert();
        sound.generator(2.0);
        setFeed((items) => [...items, FEED[2]]);
        await speak("east");
        await cutaway("genRoom", 2100);
        setPrologue(null);
        setPhase("weather");
        jumpClock(2, 24);
        patch("wharf");
        sound.powerFail();
        sound.splash();
        setFeed((items) => [...items, FEED[3]]);
        await speak("wharf");
        await cutaway("dryClinic", 2000);
        setPrologue(null);
        setPhase("weather");
        jumpClock(2, 26);
        patch("cedar");
        setFeed((items) => [...items, FEED[4]]);
        await speak("roads");
        await cutaway("cityMap", 2200);
        await cartoon("seatMath", "cut_vans", 550);
        await cartoon("pressure", "pressure", 600);
        setPrologue(null);
        setPhase("weather");
        sound.city(1.8);
        await sleep(800);
        await cartoon("nodes", "cut_think", 550);
        setPrologue(null);
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
    try { await approvePlan(plan); } catch { /* stamp still stands */ }
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

    // Closing act — real scenes through minute 5 (no frozen pad)
    const say = async (lineId) => {
      const line = LINES.find((item) => item.id === lineId);
      if (!line) return;
      setCaption({ speaker: line.speaker, text: line.text });
      sound.duck();
      try {
        const buffer = buffers.current.get(lineId);
        if (buffer) await sound.playBuffer(buffer, { radio: false });
        else {
          const spoken = await speakLine(line.text, line.voice || "Matthew");
          if (spoken.audio && sound.ctx) {
            const buffer = await sound.decodeBase64(spoken.audio);
            await sound.playBuffer(buffer, { radio: false });
          } else {
            await sound.speakText(line.text);
          }
        }
      } catch {
        await sound.speakText(line.text);
      }
      sound.unduck();
    };
    const beat = async (scene, lineId, hold = 500) => {
      setPrologue(scene);
      setPhase("prologue");
      if (scene === "vanDepart") { sound.door(); sound.city(2.0); }
      if (scene === "safetyGate") { sound.alert(); sound.tick(); }
      if (scene === "buildNote") sound.keyboard();
      if (scene === "dawn") { sound.water(2.4); sound.thunder(); }
      if (scene === "signature") sound.approve();
      await say(lineId);
      await wait(hold);
    };

    setChapter("how");
    await beat("vanDepart", "ep1", 550);
    await beat("safetyGate", "ep2", 550);
    setPrologue(null);
    setPhase("architecture");
    setArchBeat(1);
    await say("arch1");
    await wait(500);
    setArchBeat(2);
    await say("arch2");
    await wait(450);
    await beat("buildNote", "ep3", 600);
    await beat("dawn", "ep4", 600);
    await beat("signature", "cut_end", 700);
    setPrologue(null);
    setPhase("end");
    setCaption(null);
  }

  const mode = plan ? "plan" : phase === "planning" ? "trace" : "people";
  const showMonitor = !prologue && !title && phase !== "architecture" && phase !== "end";

  useEffect(() => {
    if (!armed && filmAutoMode()) {
      (async () => {
        await sound.start();
        setArmed(true);
      })();
    }
  }, [armed]);

  if (!armed) {
    return (
      <div className="poster">
        <Atmosphere />
        <div className="poster-copy">
          <p className="eyebrow">5-minute demo film · sound + VFX · 1× playback</p>
          <h1>Relay</h1>
          <p className="deck">
            Unique scenes, natural storm/clinic sound, live Amazon Bedrock, human approve.
            Full-screen with sound on, or use the generated MP4 in /demo.
          </p>
          <button className="btn" onClick={async () => { await sound.start(); setArmed(true); }}>Start the 5-minute film</button>
          <button className="btn ghost" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="film cinema">
      <Atmosphere />
      <div className="letterbox top cinema-bar">
        <span>Relay</span>
        <span className="timecode">{formatClock(clock)}</span>
      </div>
      <div className="stage">
        {title && (
          <div className="titlecard">
            <p className="eyebrow">{title === "city" ? "Tuesday · 2:14 a.m." : "Harborlight Dialysis"}</p>
            <h1>{title === "city" ? "Harbor City" : "Relay"}</h1>
            {title === "relay" && <p className="deck">A continuity desk for the night the clinics fail.</p>}
          </div>
        )}
        {prologue && <Prologue scene={prologue} />}
        {showMonitor && (
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
        )}
        {phase === "architecture" && (
          <div className="arch-film">
            <p className="eyebrow">How Relay works</p>
            <ol>
              <li className={archBeat >= 1 ? "lit" : ""}><b>Amazon Bedrock</b> reads clinics, patients, vans — then submits one plan.</li>
              <li className={archBeat >= 1 ? "lit" : ""}><b>Safety code</b> rejects dark clinics, overfilled chairs, missing van seats.</li>
              <li className={archBeat >= 2 ? "lit" : ""}><b>Naomi</b> keeps or sends back every move. Nothing goes out without her.</li>
              <li className={archBeat >= 2 ? "lit" : ""}><b>Kiro</b> helped build and document the project. Bedrock runs the AI inside it.</li>
            </ol>
          </div>
        )}
        {phase === "end" && plan && (
          <div className="endcard">
            <p className="eyebrow">The night held</p>
            <h2>{plan.summary}</h2>
            <ul className="stats">
              <li><b>{plan.assignments.filter((item) => item.action === "transfer").length}</b><span>moved</span></li>
              <li><b>{plan.assignments.filter((item) => item.action === "finish-on-machine").length}</b><span>finished on the machine</span></li>
              <li><b>0</b><span>sent to a dark clinic</span></li>
            </ul>
            <blockquote>{plan.tradeoff}</blockquote>
            <p className="sign">Approved by Naomi Brooks · {approvedAt}</p>
            <p className="model-id">{plan.source === "bedrock" ? "Amazon Bedrock" : "Safety rules"}{plan.modelId ? ` · ${plan.modelId}` : ""}</p>
            <div className="row">
              <button className="btn" onClick={() => setTake((value) => value + 1)}>Play again</button>
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
