import { useEffect, useState } from "react";
import { getJSON } from "./api";
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
        <p className="deck">You run the night. Bedrock drafts. You decide.</p>
        <p className="who">
          You are Naomi Brooks, continuity manager on call. Six clinics. Four hundred and twenty patients.
          Load the flood, change clinic power and roads, give Bedrock your orders, then keep or send back every move.
        </p>
        <div className="row">
          <button className="btn" onClick={() => go("desk")}>Work the night</button>
          <button className="btn ghost" onClick={() => go("arch")}>Architecture</button>
          <button className="btn ghost" onClick={() => go("film")}>5-min demo film</button>
        </div>
        <p className="fine">The desk is silent. Use the 5-minute demo film (sound + cartoons + Bedrock) when you record for judges.</p>
        {health?.ok && <p className="fine">Amazon Bedrock is ready to plan with you.</p>}
        {health && !health.ok && <p className="warn-line">Bedrock is not answering yet. {health.message}</p>}
      </div>
    </div>
  );
}
