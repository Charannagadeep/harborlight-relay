import { useEffect, useState } from "react";
import { getJSON } from "./api";
import { sound } from "./audio";
import { Atmosphere } from "./Rain";
import { Film } from "./Film";
import { Desk } from "./Desk";
import { Architecture } from "./Architecture";

function viewFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (hash === "film" || hash === "desk" || hash === "arch") return hash;
  return "poster";
}

export default function App() {
  const [view, setView] = useState(viewFromHash);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const sync = () => setView(viewFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      for (let i = 0; i < 20 && !stop; i += 1) {
        try {
          const next = await getJSON("/api/health");
          if (!stop) setHealth(next);
          if (next.ok || next.message) return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    };
    poll();
    return () => { stop = true; };
  }, []);

  function go(next) {
    window.location.hash = next === "poster" ? "" : next;
    setView(next);
  }

  if (view === "film") return <Film onExit={() => go("poster")} />;
  if (view === "desk") return <Desk onFilm={() => go("film")} onArch={() => go("arch")} onHome={() => go("poster")} />;
  if (view === "arch") return <Architecture onFilm={() => go("film")} onHome={() => go("poster")} />;

  return (
    <div className="poster">
      <Atmosphere />
      <div className="poster-copy">
        <p className="eyebrow">Harborlight Dialysis · Continuity desk</p>
        <h1>Relay</h1>
        <p className="deck">When the clinics close, no one misses a treatment.</p>
        <p className="who">
          Naomi Brooks is the continuity manager on call. Six clinics. Four hundred and twenty patients.
          At 2:14 a.m. the harbor starts to flood, and the morning chairs are already promised.
        </p>
        <div className="row">
          <button className="btn" onClick={async () => { await sound.start(); go("film"); }}>Begin the night</button>
          <button className="btn ghost" onClick={() => go("desk")}>Open the desk</button>
          <button className="btn ghost" onClick={() => go("arch")}>Architecture</button>
        </div>
        <p className="fine">Sound on. Headphones if you have them. Fictional patients. A person approves every move.</p>
        {health?.ok && <p className="fine">Amazon Bedrock is planning the night.</p>}
        {health && !health.ok && <p className="warn-line">Bedrock is not answering yet. {health.message}</p>}
      </div>
    </div>
  );
}
