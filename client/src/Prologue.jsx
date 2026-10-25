/** Unique cartoon beats for the demo film. Adult patients only. Each scene used once. */

const SCENES = {
  harbor: {
    title: "Harbor City · before the flood",
    line: "Rain on the water. Clinics still green. Nobody knows the night will break.",
  },
  machine: {
    title: "Eastbank · nocturnal chair",
    line: "Patrick Nguyen is mid-treatment. The machine keeps time. The storm does not.",
  },
  stormGlass: {
    title: "Rain on the clinic glass",
    line: "Outside, the harbor is rising. Inside, treatment does not wait.",
  },
  emptyPier: {
    title: "Pier · morning list",
    line: "Samuel, Ruth, and Helen were promised chairs at dawn. The clinic will not open.",
  },
  fuelGauge: {
    title: "Eastbank · forty minutes",
    line: "Three can finish on the machine. Patrick has fifty-five minutes left.",
  },
  bridgeOut: {
    title: "South Wharf bridge",
    line: "When a clinic goes dark, someone still needs a chair — and a road that still exists.",
  },
  ireneHome: {
    title: "Irene Walsh · 77",
    line: "Sixty hours since treatment. She needs a wheelchair van, not a closed bridge.",
  },
  phoneBurst: {
    title: "Naomi Brooks · continuity",
    line: "Three clinics calling at once. She is the one who cannot let anyone miss a treatment.",
  },
  boot: {
    title: "She opens Relay",
    line: "Amazon Bedrock will draft the night. Safety code will block unsafe moves. She decides.",
  },
  radioWall: {
    title: "Live radio · Pier",
    line: "Water at the loading dock. The treatment floor is shut. Morning patients cannot come.",
  },
  genRoom: {
    title: "Generator bay",
    line: "Utility power is out. The generator holds — but not long enough for Patrick.",
  },
  dryClinic: {
    title: "South Wharf · no water",
    line: "City water is gone. The treatment system is down. The clinic is closed.",
  },
  cityMap: {
    title: "Roads desk",
    line: "Pier road closed. Wharf bridge closed. Two wheelchair vans. Five seats. No stretcher.",
  },
  seatMath: {
    title: "Five seats · thirteen names",
    line: "Every wheelchair seat has a name waiting on it. The shuttle only reaches clear roads.",
  },
  pressure: {
    title: "The clock does not wait",
    line: "Fuel drops. Roads stay closed. The draft has to be right the first time.",
  },
  nodes: {
    title: "Amazon Bedrock",
    line: "Clinics. Patients. Vans. Roads. One draft — then the safety gate.",
  },
  humanGate: {
    title: "Naomi on the desk",
    line: "The draft is human work now. Keep. Send back. Approve.",
  },
  ramp: {
    title: "Van ramp · boarding",
    line: "Main and North Ridge still have chairs. The vans take the ones who must leave.",
  },
  chairsOpen: {
    title: "Chairs that still open",
    line: "Nobody is sent into the flood. Treatments finish where the lights stay on.",
  },
  signature: {
    title: "Signed by a person",
    line: "The night held. Transfers left. A human signed every move.",
  },
  vanDepart: {
    title: "Clear roads · leaving now",
    line: "Irene on a wheelchair seat. Patrick off the dying generator. Main and Ridge still open.",
  },
  safetyGate: {
    title: "Safety before send",
    line: "Dark clinics rejected. Overfilled vans rejected. Only safe moves reach Naomi.",
  },
  buildNote: {
    title: "How it was built",
    line: "Kiro helped ship the desk. Bedrock runs the draft. Naomi owns the night.",
  },
  dawn: {
    title: "Harbor · after the decision",
    line: "Floodwater still rises. Chairs that stayed open finished their work.",
  },
};

export function Prologue({ scene = "harbor" }) {
  const copy = SCENES[scene] || SCENES.harbor;
  const Scene = SCENES_DRAW[scene] || HarborScene;
  return (
    <div className={`prologue scene-${scene}`} aria-hidden="true">
      <div className="prologue-frame">
        <Scene />
      </div>
      <div className="prologue-caption">
        <p className="eyebrow">{copy.title}</p>
        <p>{copy.line}</p>
      </div>
      <div className="prologue-grain" />
      <div className="prologue-vignette" />
    </div>
  );
}

const SCENES_DRAW = {};

function Person({ x, y, wheelchair = false, tint = "#c9b39a", scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cy="-28" r="16" fill={tint} />
      <rect x="-14" y="-12" width="28" height="36" rx="10" fill="#4a5d6a" />
      {wheelchair ? (
        <g>
          <circle cx="-12" cy="28" r="10" fill="none" stroke="#e2b15a" strokeWidth="3" />
          <circle cx="12" cy="28" r="10" fill="none" stroke="#e2b15a" strokeWidth="3" />
          <path d="M-10 8 H10" stroke="#e2b15a" strokeWidth="3" />
        </g>
      ) : (
        <g stroke="#9aa194" strokeWidth="3">
          <line x1="-8" y1="24" x2="-12" y2="40" />
          <line x1="8" y1="24" x2="12" y2="40" />
        </g>
      )}
    </g>
  );
}

function HarborScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <defs>
        <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1018" /><stop offset="55%" stopColor="#152028" /><stop offset="100%" stopColor="#1a3038" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#hsky)" />
      <circle cx="720" cy="90" r="28" fill="#c9d4c0" opacity="0.25" />
      <path d="M0 300 L80 260 L160 290 L260 230 L360 270 L480 210 L600 255 L720 200 L840 250 L960 220 V540 H0 Z" fill="#1a2822" />
      <g className="flood-rise" opacity="0.9">
        <path d="M0 380 Q120 360 240 385 T480 375 T720 390 T960 370 V540 H0 Z" fill="#163f54" />
        <path d="M0 420 Q160 400 320 425 T640 415 T960 430 V540 H0 Z" fill="#1a4c63" opacity="0.7" />
      </g>
      <g className="rain-lines" stroke="#8eb4c8" strokeWidth="1.5" opacity="0.4">
        {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880].map((x) => (
          <line key={x} x1={x} y1="40" x2={x - 12} y2="280" />
        ))}
      </g>
      <rect x="140" y="200" width="36" height="100" fill="#2a3830" /><rect x="200" y="170" width="44" height="130" fill="#24322a" />
      <rect x="520" y="180" width="50" height="120" fill="#2e3a32" /><rect x="590" y="150" width="38" height="150" fill="#26342c" />
      <text x="72" y="72" fill="#ebe4d6" fontSize="30" fontFamily="Fraunces, Georgia, serif">Harbor before midnight</text>
      <text x="72" y="104" fill="#9aa194" fontSize="14" fontFamily="Outfit, sans-serif">Tuesday · the clinics are still quiet</text>
    </svg>
  );
}

function MachineScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a2420" /><stop offset="100%" stopColor="#0d1210" />
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8a3" /><stop offset="100%" stopColor="#2f6b52" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#wall)" />
      <ellipse cx="480" cy="510" rx="340" ry="28" fill="#000" opacity="0.35" />
      <rect x="210" y="250" width="220" height="160" rx="18" fill="#2a3330" />
      <Person x={320} y={250} />
      <rect x="470" y="200" width="150" height="220" rx="14" fill="#1c2220" stroke="#5a6a62" />
      <rect x="490" y="220" width="110" height="70" rx="8" fill="url(#screen)" className="pulse-screen" />
      <text x="545" y="262" textAnchor="middle" fill="#0b1a14" fontSize="22" fontFamily="IBM Plex Mono, monospace">55</text>
      <text x="545" y="282" textAnchor="middle" fill="#0b1a14" fontSize="11" fontFamily="Outfit, sans-serif">MIN LEFT</text>
      <circle cx="510" cy="340" r="18" fill="#2e3a36" className="pump" />
      <circle cx="580" cy="340" r="18" fill="#2e3a36" className="pump delay" />
      <path d="M360 280 C420 260 450 300 470 290" fill="none" stroke="#e2b15a" strokeWidth="4" className="tube" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Still on the machine</text>
      <text x="80" y="112" fill="#9aa194" fontSize="14" fontFamily="Outfit, sans-serif">Patrick · Harborlight Eastbank</text>
    </svg>
  );
}

function StormGlassScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <defs>
        <linearGradient id="nightOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1520" /><stop offset="100%" stopColor="#1a3040" />
        </linearGradient>
        <linearGradient id="floodWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a5a72" /><stop offset="100%" stopColor="#0d3040" />
        </linearGradient>
      </defs>
      {/* Clinic interior wall */}
      <rect width="960" height="540" fill="#141a16" />
      <rect x="0" y="460" width="960" height="80" fill="#0e1210" />
      {/* Window frame */}
      <rect x="140" y="50" width="680" height="360" rx="6" fill="#2a3230" />
      <rect x="160" y="70" width="640" height="320" fill="url(#nightOut)" />
      {/* Cross muntins */}
      <rect x="470" y="70" width="14" height="320" fill="#3a4540" />
      <rect x="160" y="220" width="640" height="14" fill="#3a4540" />
      {/* Harbor silhouette outside */}
      <path d="M160 250 L220 210 L280 240 L360 190 L440 230 L520 180 L600 220 L700 195 L800 230 V390 H160 Z" fill="#1a2822" opacity="0.85" />
      {/* Flood water rising outside */}
      <rect x="160" y="300" width="640" height="90" fill="url(#floodWater)" className="flood-rise" opacity="0.75" />
      {/* Rain streaks on glass — short dashes, not one long zigzag */}
      <g stroke="#c5e0ef" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        {[180, 210, 250, 290, 330, 370, 410, 450, 510, 550, 590, 630, 670, 710, 750].map((x, i) => (
          <line key={x} x1={x} y1={85 + (i % 4) * 18} x2={x - 8} y2={85 + (i % 4) * 18 + 55} />
        ))}
      </g>
      {/* Interior sill + plant / desk hint */}
      <rect x="140" y="410" width="680" height="28" fill="#3a4540" />
      <circle cx="200" cy="480" r="8" fill="#7ec8a3" opacity="0.5" />
      <text x="80" y="40" fill="#ebe4d6" fontSize="22" fontFamily="Fraunces, Georgia, serif">Clinic window · 2:14 a.m.</text>
    </svg>
  );
}

function EmptyPierScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#101411" />
      <rect x="60" y="90" width="520" height="360" rx="16" fill="#1a221e" stroke="#3a4540" />
      <text x="90" y="140" fill="#9aa194" fontSize="13" letterSpacing="3" fontFamily="Outfit, sans-serif">WAITING ROOM · 5:30 LIST</text>
      <Person x={160} y={300} tint="#d2b48c" /><Person x={260} y={300} tint="#c4a484" /><Person x={360} y={300} tint="#b8956c" />
      <text x="160" y="380" textAnchor="middle" fill="#9aa194" fontSize="12">Samuel</text>
      <text x="260" y="380" textAnchor="middle" fill="#9aa194" fontSize="12">Ruth</text>
      <text x="360" y="380" textAnchor="middle" fill="#9aa194" fontSize="12">Helen</text>
      <rect x="620" y="140" width="280" height="260" rx="14" fill="#0e1411" stroke="#e07a62" strokeWidth="3" />
      <text x="760" y="240" textAnchor="middle" fill="#e07a62" fontSize="42" fontFamily="Fraunces, Georgia, serif">CLOSED</text>
      <text x="760" y="290" textAnchor="middle" fill="#9aa194" fontSize="14">Pier · flooded dock</text>
      <text x="760" y="330" textAnchor="middle" fill="#e07a62" fontSize="13" className="blink">NO POWER</text>
    </svg>
  );
}

function FuelGaugeScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#12180f" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Fuel versus time</text>
      <g transform="translate(120 140)">
        <rect width="280" height="280" rx="20" fill="#1c2420" stroke="#3a4540" />
        <text x="140" y="50" textAnchor="middle" fill="#9aa194" fontSize="13">GENERATOR</text>
        <circle cx="140" cy="160" r="90" fill="none" stroke="#2a3830" strokeWidth="18" />
        <circle cx="140" cy="160" r="90" fill="none" stroke="#e2b15a" strokeWidth="18" strokeDasharray="180 400" className="blink" transform="rotate(-90 140 160)" />
        <text x="140" y="155" textAnchor="middle" fill="#ebe4d6" fontSize="48" fontFamily="IBM Plex Mono, monospace">40</text>
        <text x="140" y="185" textAnchor="middle" fill="#e2b15a" fontSize="14">MIN FUEL</text>
      </g>
      <g transform="translate(520 160)">
        <rect width="360" height="240" rx="16" fill="#1a2018" stroke="#e07a62" />
        <text x="180" y="60" textAnchor="middle" fill="#9aa194" fontSize="13">PATRICK ON MACHINE</text>
        <text x="180" y="130" textAnchor="middle" fill="#e07a62" fontSize="56" fontFamily="IBM Plex Mono, monospace">55</text>
        <text x="180" y="170" textAnchor="middle" fill="#ebe4d6" fontSize="16">minutes still needed</text>
        <text x="180" y="210" textAnchor="middle" fill="#e07a62" fontSize="14">Fuel runs out first</text>
      </g>
    </svg>
  );
}

function BridgeOutScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <defs>
        <linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1018" /><stop offset="100%" stopColor="#1a2830" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#bsky)" />
      <path d="M0 360 H300 L340 300 H620 L660 360 H960 V540 H0 Z" fill="#24302a" />
      <g className="flood-rise">
        <ellipse cx="480" cy="440" rx="400" ry="70" fill="#163f54" opacity="0.85" />
      </g>
      <path d="M200 300 H420" stroke="#e07a62" strokeWidth="10" strokeDasharray="20 14" />
      <path d="M540 300 H760" stroke="#e07a62" strokeWidth="10" strokeDasharray="20 14" />
      <text x="480" y="250" textAnchor="middle" fill="#e07a62" fontSize="36" fontFamily="Fraunces, Georgia, serif">BRIDGE OUT</text>
      <text x="480" y="290" textAnchor="middle" fill="#9aa194" fontSize="14">South Wharf · no crossing</text>
      <text x="80" y="80" fill="#ebe4d6" fontSize="26" fontFamily="Fraunces, Georgia, serif">The road that patients needed</text>
    </svg>
  );
}

function IreneHomeScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0e1210" />
      <rect x="80" y="80" width="420" height="380" rx="18" fill="#1c2420" />
      <rect x="120" y="120" width="160" height="100" rx="8" fill="#152028" stroke="#3a4a52" />
      <g className="rain-lines" stroke="#8eb4c8" strokeWidth="1.5" opacity="0.45">
        <line x1="140" y1="130" x2="130" y2="210" /><line x1="180" y1="130" x2="168" y2="210" /><line x1="220" y1="130" x2="210" y2="210" />
      </g>
      <Person x={280} y={300} wheelchair tint="#c9b39a" scale={1.15} />
      <text x="280" y="400" textAnchor="middle" fill="#ebe4d6" fontSize="20" fontFamily="Fraunces, Georgia, serif">Irene Walsh</text>
      <text x="280" y="428" textAnchor="middle" fill="#e2b15a" fontSize="13">60 hours since treatment</text>
      <g transform="translate(560 140)">
        <rect width="320" height="300" rx="16" fill="#151a17" stroke="#e2b15a" />
        <text x="160" y="70" textAnchor="middle" fill="#e2b15a" fontSize="14">REQUIRES</text>
        <text x="160" y="140" textAnchor="middle" fill="#ebe4d6" fontSize="36" fontFamily="Fraunces, Georgia, serif">Wheelchair</text>
        <text x="160" y="185" textAnchor="middle" fill="#ebe4d6" fontSize="36" fontFamily="Fraunces, Georgia, serif">van seat</text>
        <text x="160" y="250" textAnchor="middle" fill="#9aa194" fontSize="14">Shuttle will not work</text>
      </g>
    </svg>
  );
}

function PhoneBurstScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0a0c0b" />
      <text x="80" y="70" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Three clinics. One phone.</text>
      {[
        { y: 110, label: "PIER CLINIC", sub: "Flooded · closed", hot: true },
        { y: 230, label: "EASTBANK", sub: "Generator · 40 min", hot: true },
        { y: 350, label: "SOUTH WHARF", sub: "No city water", hot: true },
      ].map((row, i) => (
        <g key={row.label} transform={`translate(80 ${row.y})`} className={i === 0 ? "tap" : ""}>
          <rect width="520" height="100" rx="16" fill="#151a17" stroke={row.hot ? "#e2b15a" : "#3a4540"} strokeWidth="2" />
          <circle cx="48" cy="50" r="18" fill="#b7c7a4" className="ring-pulse" />
          <text x="90" y="45" fill="#ebe4d6" fontSize="18" fontFamily="Outfit, sans-serif">{row.label}</text>
          <text x="90" y="72" fill="#9aa194" fontSize="13">{row.sub}</text>
        </g>
      ))}
      <g transform="translate(660 160)">
        <rect width="220" height="280" rx="28" fill="#151a17" stroke="#3a4540" strokeWidth="3" />
        <text x="110" y="80" textAnchor="middle" fill="#e2b15a" fontSize="12">NAOMI</text>
        <text x="110" y="140" textAnchor="middle" fill="#ebe4d6" fontSize="22" fontFamily="Fraunces, Georgia, serif">On call</text>
        <rect x="40" y="190" width="140" height="44" rx="12" fill="#e2b15a" className="tap" />
        <text x="110" y="218" textAnchor="middle" fill="#101411" fontSize="14">Open Relay</text>
      </g>
    </svg>
  );
}

function BootScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#070908" />
      <rect x="80" y="70" width="800" height="400" rx="20" fill="#101411" stroke="#3a4540" className="boot" />
      <text x="120" y="140" fill="#9aa194" fontSize="14" letterSpacing="4" fontFamily="Outfit, sans-serif">HARBORLIGHT DIALYSIS</text>
      <text x="120" y="220" fill="#ebe4d6" fontSize="72" fontFamily="Fraunces, Georgia, serif" className="boot-title">Relay</text>
      <text x="120" y="270" fill="#b7c7a4" fontSize="18" fontFamily="Outfit, sans-serif">Bedrock drafts · code checks · Naomi approves</text>
      <g className="boot-dots" fill="#e2b15a">
        <circle cx="140" cy="340" r="6" /><circle cx="170" cy="340" r="6" /><circle cx="200" cy="340" r="6" />
      </g>
      <text x="120" y="400" fill="#9aa194" fontSize="13" fontFamily="IBM Plex Mono, monospace">desk online · 02:14</text>
    </svg>
  );
}

function RadioWallScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0d1210" />
      <rect x="100" y="80" width="760" height="380" rx="18" fill="#151a17" stroke="#3a4540" />
      <text x="140" y="140" fill="#e2b15a" fontSize="13" letterSpacing="3" fontFamily="IBM Plex Mono, monospace">RADIO · PIER CLINIC</text>
      <text x="140" y="220" fill="#ebe4d6" fontSize="32" fontFamily="Fraunces, Georgia, serif">“Water is at the</text>
      <text x="140" y="270" fill="#ebe4d6" fontSize="32" fontFamily="Fraunces, Georgia, serif">loading dock.”</text>
      <text x="140" y="340" fill="#9aa194" fontSize="16">Alicia Moore · treatment floor shut</text>
      <g transform="translate(700 300)">
        <rect width="100" height="60" rx="10" fill="#2a2010" stroke="#e07a62" />
        <text x="50" y="38" textAnchor="middle" fill="#e07a62" fontSize="14">DARK</text>
      </g>
    </svg>
  );
}

function GenRoomScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#10160e" />
      <rect x="80" y="100" width="400" height="320" rx="16" fill="#1a2218" stroke="#3a4540" />
      <rect x="140" y="160" width="280" height="160" rx="12" fill="#0e140c" stroke="#e2b15a" className="blink" />
      <text x="280" y="230" textAnchor="middle" fill="#e2b15a" fontSize="14">DIESEL GENSET</text>
      <text x="280" y="275" textAnchor="middle" fill="#ebe4d6" fontSize="36" fontFamily="IBM Plex Mono, monospace">RUNNING</text>
      <g transform="translate(540 120)">
        <text x="0" y="40" fill="#ebe4d6" fontSize="24" fontFamily="Fraunces, Georgia, serif">Four on machines</text>
        <text x="0" y="100" fill="#b7c7a4" fontSize="15">Andre · 22m left</text>
        <text x="0" y="140" fill="#b7c7a4" fontSize="15">Helen · 16m left</text>
        <text x="0" y="180" fill="#b7c7a4" fontSize="15">Camille · 11m left</text>
        <text x="0" y="240" fill="#e07a62" fontSize="18" fontFamily="Fraunces, Georgia, serif">Patrick · 55m — cannot finish</text>
      </g>
    </svg>
  );
}

function DryClinicScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#120e0e" />
      <rect x="120" y="80" width="720" height="380" rx="16" fill="#1a1414" stroke="#e07a62" />
      <text x="480" y="180" textAnchor="middle" fill="#e07a62" fontSize="18" letterSpacing="4" fontFamily="Outfit, sans-serif">SOUTH WHARF</text>
      <text x="480" y="260" textAnchor="middle" fill="#ebe4d6" fontSize="42" fontFamily="Fraunces, Georgia, serif">No city water</text>
      <text x="480" y="320" textAnchor="middle" fill="#9aa194" fontSize="16">Treatment system offline · clinic closed</text>
      <g stroke="#e07a62" strokeWidth="3" fill="none">
        <circle cx="480" cy="400" r="28" /><line x1="460" y1="380" x2="500" y2="420" />
      </g>
    </svg>
  );
}

function CityMapScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0e1418" />
      <text x="80" y="70" fill="#ebe4d6" fontSize="26" fontFamily="Fraunces, Georgia, serif">What the roads will allow</text>
      {/* simplified street grid */}
      <g stroke="rgba(231,224,210,0.2)" strokeWidth="3">
        <line x1="100" y1="160" x2="860" y2="160" /><line x1="100" y1="260" x2="860" y2="260" />
        <line x1="100" y1="360" x2="860" y2="360" /><line x1="100" y1="460" x2="500" y2="460" />
        <line x1="220" y1="120" x2="220" y2="480" /><line x1="420" y1="120" x2="420" y2="480" />
        <line x1="620" y1="120" x2="620" y2="400" /><line x1="780" y1="120" x2="780" y2="360" />
      </g>
      <g>
        <rect x="180" y="140" width="80" height="40" rx="6" fill="#3a2a28" /><text x="220" y="166" textAnchor="middle" fill="#e07a62" fontSize="12">PIER ✕</text>
        <rect x="380" y="240" width="80" height="40" rx="6" fill="#3a3520" /><text x="420" y="266" textAnchor="middle" fill="#e2b15a" fontSize="12">EAST</text>
        <rect x="580" y="140" width="90" height="40" rx="6" fill="#3a2a28" /><text x="625" y="166" textAnchor="middle" fill="#e07a62" fontSize="12">WHARF ✕</text>
        <rect x="180" y="340" width="80" height="40" rx="6" fill="#24302a" /><text x="220" y="366" textAnchor="middle" fill="#b7c7a4" fontSize="12">MAIN ✓</text>
        <rect x="580" y="340" width="100" height="40" rx="6" fill="#24302a" /><text x="630" y="366" textAnchor="middle" fill="#b7c7a4" fontSize="12">RIDGE ✓</text>
      </g>
      <text x="80" y="520" fill="#9aa194" fontSize="13">Two vans · five wheelchair seats · shuttle on clear roads only</text>
    </svg>
  );
}

function SeatMathScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0d1214" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">The math of the night</text>
      <g transform="translate(100 140)">
        <rect width="340" height="280" rx="16" fill="#1a2420" stroke="#e2b15a" />
        <text x="170" y="70" textAnchor="middle" fill="#e2b15a" fontSize="14">WHEELCHAIR SEATS</text>
        <text x="170" y="160" textAnchor="middle" fill="#ebe4d6" fontSize="72" fontFamily="IBM Plex Mono, monospace">5</text>
        <text x="170" y="210" textAnchor="middle" fill="#9aa194" fontSize="14">across 2 vans</text>
      </g>
      <g transform="translate(520 140)">
        <rect width="340" height="280" rx="16" fill="#1a2018" stroke="#e07a62" />
        <text x="170" y="70" textAnchor="middle" fill="#e07a62" fontSize="14">PEOPLE WHO NEED THEM</text>
        <text x="170" y="160" textAnchor="middle" fill="#ebe4d6" fontSize="72" fontFamily="IBM Plex Mono, monospace">6+</text>
        <text x="170" y="210" textAnchor="middle" fill="#9aa194" fontSize="14">not everyone fits</text>
      </g>
    </svg>
  );
}

function PressureScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#120e0c" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">What the night is asking</text>
      {[
        { n: "13", label: "people who need a chair" },
        { n: "5", label: "wheelchair van seats" },
        { n: "40", label: "minutes of generator fuel" },
      ].map((card, i) => (
        <g key={card.label} transform={`translate(${90 + i * 290} 160)`}>
          <rect width="260" height="240" rx="18" fill="#1a1612" stroke="#e2b15a" />
          <text x="130" y="110" textAnchor="middle" fill="#e2b15a" fontSize="56" fontFamily="IBM Plex Mono, monospace">{card.n}</text>
          <text x="130" y="170" textAnchor="middle" fill="#ebe4d6" fontSize="15">{card.label}</text>
        </g>
      ))}
      <text x="80" y="460" fill="#9aa194" fontSize="14">Wrong move = a missed treatment. Right move = Naomi still decides.</text>
    </svg>
  );
}

function NodesScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0a100e" />
      <text x="80" y="70" fill="#ebe4d6" fontSize="26" fontFamily="Fraunces, Georgia, serif">Bedrock reads the night</text>
      {[
        { x: 200, y: 200, label: "Clinics" },
        { x: 480, y: 140, label: "Patients" },
        { x: 760, y: 200, label: "Vans" },
        { x: 340, y: 360, label: "Roads" },
        { x: 620, y: 360, label: "Plan" },
      ].map((n, i) => (
        <g key={n.label}>
          <circle cx={n.x} cy={n.y} r="48" fill="#15201a" stroke="#e2b15a" strokeWidth="2" className={i === 4 ? "blink" : "breathe"} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#ebe4d6" fontSize="14">{n.label}</text>
        </g>
      ))}
      <g stroke="#3a5548" strokeWidth="2" opacity="0.7">
        <line x1="248" y1="200" x2="432" y2="140" /><line x1="528" y1="140" x2="712" y2="200" />
        <line x1="200" y1="248" x2="340" y2="312" /><line x1="760" y1="248" x2="620" y2="312" />
        <line x1="388" y1="360" x2="572" y2="360" />
      </g>
    </svg>
  );
}

function HumanGateScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#101411" />
      <circle cx="260" cy="230" r="74" fill="#c9b39a" className="breathe" />
      <rect x="205" y="305" width="110" height="130" rx="22" fill="#4a5d6a" />
      <text x="260" y="470" textAnchor="middle" fill="#ebe4d6" fontSize="18" fontFamily="Fraunces, Georgia, serif">Naomi Brooks</text>
      <g transform="translate(420 140)">
        <rect width="440" height="280" rx="18" fill="#151a17" stroke="#b7c7a4" />
        <text x="220" y="70" textAnchor="middle" fill="#b7c7a4" fontSize="13" letterSpacing="3">HUMAN GATE</text>
        <text x="220" y="140" textAnchor="middle" fill="#ebe4d6" fontSize="36" fontFamily="Fraunces, Georgia, serif">Nothing moves</text>
        <text x="220" y="190" textAnchor="middle" fill="#ebe4d6" fontSize="36" fontFamily="Fraunces, Georgia, serif">until she signs</text>
        <text x="220" y="250" textAnchor="middle" fill="#9aa194" fontSize="14">Keep · send back · approve</text>
      </g>
    </svg>
  );
}

function RampScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0e171d" />
      <text x="80" y="70" fill="#ebe4d6" fontSize="26" fontFamily="Fraunces, Georgia, serif">Boarding the clear road</text>
      <g transform="translate(80 160)">
        <rect width="420" height="200" rx="28" fill="#24302a" stroke="#e2b15a" strokeWidth="3" />
        <circle cx="80" cy="200" r="32" fill="#1a2220" stroke="#9aa194" strokeWidth="4" />
        <circle cx="340" cy="200" r="32" fill="#1a2220" stroke="#9aa194" strokeWidth="4" />
        <text x="210" y="90" textAnchor="middle" fill="#ebe4d6" fontSize="20">Van 1 · Main</text>
        <path d="M420 120 L560 180 L560 220 L420 180 Z" fill="#3a4540" />
      </g>
      <Person x={620} y={280} wheelchair />
      <Person x={720} y={280} wheelchair />
      <Person x={820} y={280} />
      <text x="80" y="460" fill="#9aa194" fontSize="14">Ramp down · seats assigned · no one into the flood</text>
    </svg>
  );
}

function ChairsOpenScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0c1410" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Chairs that still work</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${100 + i * 200} 160)`}>
          <rect width="160" height="220" rx="14" fill="#1a2420" stroke="#b7c7a4" strokeWidth="2" className="tap" />
          <circle cx="80" cy="70" r="22" fill="#c9b39a" />
          <rect x="55" y="100" width="50" height="60" rx="10" fill="#4a5d6a" />
          <text x="80" y="200" textAnchor="middle" fill="#b7c7a4" fontSize="12">{i < 2 ? "MAIN" : "RIDGE"}</text>
        </g>
      ))}
      <text x="80" y="460" fill="#9aa194" fontSize="14">Open floors · dry roads · treatments that finish</text>
    </svg>
  );
}

function SignatureScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0a100c" />
      <text x="480" y="100" textAnchor="middle" fill="#b7c7a4" fontSize="14" letterSpacing="4" fontFamily="Outfit, sans-serif">HARBORLIGHT</text>
      <text x="480" y="170" textAnchor="middle" fill="#ebe4d6" fontSize="44" fontFamily="Fraunces, Georgia, serif">The night held</text>
      <rect x="280" y="230" width="400" height="180" rx="12" fill="#151a17" stroke="#3a4540" />
      <text x="480" y="290" textAnchor="middle" fill="#9aa194" fontSize="13">Approved by</text>
      <path d="M340 340 C400 300 460 360 520 320 C560 300 600 340 640 330" fill="none" stroke="#b7c7a4" strokeWidth="3" className="tube" />
      <text x="480" y="380" textAnchor="middle" fill="#ebe4d6" fontSize="16" fontFamily="Fraunces, Georgia, serif">Naomi Brooks</text>
      <text x="480" y="460" textAnchor="middle" fill="#9aa194" fontSize="14">Treatments finished · transfers left · a person signed</text>
    </svg>
  );
}

function VanDepartScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0c1418" />
      <path d="M0 380 H960" stroke="rgba(231,224,210,0.2)" strokeWidth="6" strokeDasharray="18 14" />
      <g className="flood-rise" transform="translate(80 200)">
        <rect width="360" height="150" rx="26" fill="#24302a" stroke="#e2b15a" strokeWidth="3" />
        <circle cx="70" cy="150" r="30" fill="#1a2220" stroke="#9aa194" strokeWidth="4" />
        <circle cx="290" cy="150" r="30" fill="#1a2220" stroke="#9aa194" strokeWidth="4" />
        <text x="180" y="75" textAnchor="middle" fill="#ebe4d6" fontSize="18">Van → Main</text>
        <text x="180" y="105" textAnchor="middle" fill="#e2b15a" fontSize="13">3 wheelchair seats</text>
      </g>
      <g transform="translate(520 220)">
        <rect width="360" height="130" rx="22" fill="#1e2a32" stroke="#b7c7a4" strokeWidth="2" />
        <circle cx="70" cy="130" r="26" fill="#1a2220" stroke="#9aa194" strokeWidth="3" />
        <circle cx="290" cy="130" r="26" fill="#1a2220" stroke="#9aa194" strokeWidth="3" />
        <text x="180" y="70" textAnchor="middle" fill="#ebe4d6" fontSize="18">Shuttle → Ridge</text>
        <text x="180" y="100" textAnchor="middle" fill="#b7c7a4" fontSize="13">Patrick aboard</text>
      </g>
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Leaving on roads that still open</text>
      <text x="80" y="480" fill="#9aa194" fontSize="14">No one pointed at a dark clinic</text>
    </svg>
  );
}

function SafetyGateScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#101411" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Before anything leaves</text>
      {[
        { label: "Dark clinic?", result: "REJECTED", ok: false },
        { label: "Overfilled van?", result: "REJECTED", ok: false },
        { label: "Clear road + open chair?", result: "ALLOWED", ok: true },
        { label: "Human approve?", result: "REQUIRED", ok: true },
      ].map((row, i) => (
        <g key={row.label} transform={`translate(100 ${120 + i * 85})`}>
          <rect width="760" height="70" rx="12" fill="#151a17" stroke={row.ok ? "#b7c7a4" : "#e07a62"} />
          <text x="36" y="42" fill="#ebe4d6" fontSize="18">{row.label}</text>
          <text x="700" y="42" textAnchor="end" fill={row.ok ? "#b7c7a4" : "#e07a62"} fontSize="16" fontFamily="IBM Plex Mono, monospace">{row.result}</text>
        </g>
      ))}
    </svg>
  );
}

function BuildNoteScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <rect width="960" height="540" fill="#0a100e" />
      <text x="80" y="90" fill="#ebe4d6" fontSize="28" fontFamily="Fraunces, Georgia, serif">Built for the night</text>
      {[
        { title: "Kiro", line: "Scaffolded the app, docs, and demo film" },
        { title: "Amazon Bedrock", line: "Reads clinics, patients, vans — drafts one plan" },
        { title: "Safety code", line: "Blocks dark clinics and impossible seats" },
        { title: "Naomi", line: "Keeps or sends back every move" },
      ].map((row, i) => (
        <g key={row.title} transform={`translate(${80 + (i % 2) * 440} ${140 + Math.floor(i / 2) * 160})`}>
          <rect width="400" height="130" rx="16" fill="#15201a" stroke="#3a4540" />
          <text x="28" y="48" fill="#e2b15a" fontSize="18" fontFamily="Outfit, sans-serif">{row.title}</text>
          <text x="28" y="88" fill="#ebe4d6" fontSize="15">{row.line}</text>
        </g>
      ))}
    </svg>
  );
}

function DawnScene() {
  return (
    <svg viewBox="0 0 960 540" className="toon">
      <defs>
        <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2430" /><stop offset="55%" stopColor="#3a4a3a" /><stop offset="100%" stopColor="#6a7a58" />
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#dawnSky)" />
      <circle cx="720" cy="120" r="36" fill="#e2b15a" opacity="0.55" />
      <path d="M0 340 L120 300 L240 330 L400 270 L560 320 L720 280 L960 310 V540 H0 Z" fill="#1a2822" />
      <ellipse cx="480" cy="430" rx="420" ry="55" fill="#1a4c63" opacity="0.55" className="flood-rise" />
      <text x="80" y="80" fill="#ebe4d6" fontSize="30" fontFamily="Fraunces, Georgia, serif">Dawn still wet</text>
      <text x="80" y="120" fill="#c9d4c0" fontSize="15" fontFamily="Outfit, sans-serif">The flood did not wait. The desk did not freeze.</text>
    </svg>
  );
}

SCENES_DRAW.harbor = HarborScene;
SCENES_DRAW.machine = MachineScene;
SCENES_DRAW.stormGlass = StormGlassScene;
SCENES_DRAW.emptyPier = EmptyPierScene;
SCENES_DRAW.fuelGauge = FuelGaugeScene;
SCENES_DRAW.bridgeOut = BridgeOutScene;
SCENES_DRAW.ireneHome = IreneHomeScene;
SCENES_DRAW.phoneBurst = PhoneBurstScene;
SCENES_DRAW.boot = BootScene;
SCENES_DRAW.radioWall = RadioWallScene;
SCENES_DRAW.genRoom = GenRoomScene;
SCENES_DRAW.dryClinic = DryClinicScene;
SCENES_DRAW.cityMap = CityMapScene;
SCENES_DRAW.seatMath = SeatMathScene;
SCENES_DRAW.pressure = PressureScene;
SCENES_DRAW.nodes = NodesScene;
SCENES_DRAW.humanGate = HumanGateScene;
SCENES_DRAW.ramp = RampScene;
SCENES_DRAW.chairsOpen = ChairsOpenScene;
SCENES_DRAW.signature = SignatureScene;
SCENES_DRAW.vanDepart = VanDepartScene;
SCENES_DRAW.safetyGate = SafetyGateScene;
SCENES_DRAW.buildNote = BuildNoteScene;
SCENES_DRAW.dawn = DawnScene;
