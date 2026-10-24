import { useEffect, useState } from "react";
import { describeClinic } from "@shared/world.js";

function fan(index, count, clinic) {
  const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
  const radius = count > 1 ? 16 : 0;
  return {
    x: clinic.x + Math.cos(angle) * radius,
    y: clinic.y + Math.sin(angle) * radius * 0.72,
  };
}

function MovingDot({ from, to, wheelchair }) {
  const [point, setPoint] = useState(from);
  useEffect(() => {
    const origin = from;
    const start = performance.now();
    let frame = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1100);
      const eased = 1 - (1 - t) ** 3;
      setPoint({
        x: origin.x + (to.x - origin.x) * eased,
        y: origin.y + (to.y - origin.y) * eased - Math.sin(eased * Math.PI) * 22,
      });
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to.x, to.y]);
  if (wheelchair) {
    return <rect className="person wheelchair" x={point.x - 3.5} y={point.y - 3.5} width="7" height="7" rx="1" />;
  }
  return <circle className="person" cx={point.x} cy={point.y} r="4" />;
}

export function Map({ clinics, patients, assignments = [], flood = 0 }) {
  const homes = Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic]));
  return (
    <svg className="city" viewBox="0 0 1000 640" role="img" aria-label="Harbor City clinics">
      <rect width="1000" height="640" className="water" />
      <path
        className="land"
        d="M150 70 C230 28 360 86 470 42 C590 8 710 74 860 34 L948 58 L986 176 L958 292 L992 402 L908 456 L820 430 L748 498 L642 468 L548 528 L430 496 L348 568 L246 536 L198 458 L146 404 L118 286 L156 168 Z"
      />
      <path className="river" d="M530 48 C572 150 496 230 558 328 C624 430 548 512 612 610" />
      <path className="road" d="M236 386 C330 340 390 280 438 228" />
      <path className="road" d="M438 228 C540 180 610 150 676 132" />
      <path className="road" d="M676 132 C760 170 820 210 852 252" />
      <path className="road" d="M438 228 C520 300 620 360 712 424" />
      <path className="road" d="M358 524 C400 470 420 360 438 228" />
      <g className="flood" style={{ opacity: flood }}>
        <ellipse cx="210" cy="430" rx="120" ry="70" />
        <ellipse cx="330" cy="560" rx="150" ry="62" />
      </g>
      {assignments.map((assignment) => {
        const from = homes[assignment.fromClinicId];
        const to = homes[assignment.toClinicId];
        if (!from || !to || from.id === to.id) return null;
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 36;
        return (
          <path
            key={assignment.patientId}
            className="route"
            d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
          />
        );
      })}
      {clinics.map((clinic) => {
        const status = describeClinic(clinic);
        return (
          <g key={clinic.id} className={`marker ${status.tone}`}>
            <circle className="halo" cx={clinic.x} cy={clinic.y} r="16" />
            <circle className="dot" cx={clinic.x} cy={clinic.y} r="8" />
            <text x={clinic.x} y={clinic.y + 30} textAnchor="middle" className="marker-name">{clinic.short}</text>
            <text x={clinic.x} y={clinic.y + 44} textAnchor="middle" className="marker-status">{status.label}</text>
          </g>
        );
      })}
      {patients.map((patient, index) => {
        const home = homes[patient.homeClinic];
        if (!home) return null;
        const atHome = patients.filter((item) => item.homeClinic === patient.homeClinic);
        const homeIndex = atHome.findIndex((item) => item.id === patient.id);
        const from = fan(homeIndex, atHome.length, home);
        const assignment = assignments.find((item) => item.patientId === patient.id);
        const destination = assignment ? homes[assignment.toClinicId] : null;
        let to = from;
        if (destination) {
          const arriving = assignments.filter((item) => item.toClinicId === destination.id);
          const slot = Math.max(0, arriving.findIndex((item) => item.patientId === patient.id));
          to = fan(slot, arriving.length, destination);
        }
        return (
          <MovingDot
            key={patient.id}
            from={from}
            to={to}
            wheelchair={patient.mobility === "wheelchair"}
          />
        );
      })}
      <text x="28" y="36" className="map-label">Harbor City</text>
      <text x="28" y="54" className="map-sub">N</text>
    </svg>
  );
}
