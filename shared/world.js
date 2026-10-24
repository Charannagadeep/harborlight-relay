export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const CLINICS = [
  {
    id: "main",
    address: "410 Harbor Avenue, Harbor City",
    name: "Harborlight Main",
    short: "Main",
    nurse: "Receiving desk",
    x: 438,
    y: 228,
    chairs: 28,
    openChairs: 8,
    inTreatment: 18,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "24 hours",
    neighborhood: "Harbor",
  },
  {
    id: "ridge",
    address: "88 Ridgeline Road, Harbor City",
    name: "North Ridge",
    short: "North Ridge",
    nurse: "Receiving desk",
    x: 676,
    y: 132,
    chairs: 16,
    openChairs: 5,
    inTreatment: 9,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "24 hours",
    neighborhood: "North Ridge",
  },
  {
    id: "cedar",
    address: "1270 Cedar Grove Parkway, Harbor City",
    name: "Cedar Grove",
    short: "Cedar Grove",
    nurse: "Receiving desk",
    x: 852,
    y: 252,
    chairs: 10,
    openChairs: 3,
    inTreatment: 6,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "24 hours",
    neighborhood: "Cedar Grove",
  },
  {
    id: "eastbank",
    address: "35 Eastbank Street, Harbor City",
    name: "Eastbank",
    short: "Eastbank",
    nurse: "Chris Daley",
    x: 712,
    y: 424,
    chairs: 14,
    openChairs: 0,
    inTreatment: 4,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "nocturnal",
    neighborhood: "Eastbank",
  },
  {
    id: "pier",
    address: "2 Pier Way, Harbor City",
    name: "Pier Clinic",
    short: "Pier",
    nurse: "Alicia Moore",
    x: 236,
    y: 386,
    chairs: 12,
    openChairs: 6,
    inTreatment: 0,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "Opens 5:30",
    neighborhood: "The Pier",
  },
  {
    id: "wharf",
    address: "600 South Wharf Road, Harbor City",
    name: "South Wharf",
    short: "South Wharf",
    nurse: "Night alarm",
    x: 358,
    y: 524,
    chairs: 10,
    openChairs: 5,
    inTreatment: 0,
    power: true,
    water: true,
    utility: true,
    generator: false,
    generatorMinutes: 0,
    road: "clear",
    shift: "Opens 6:00",
    neighborhood: "South Wharf",
  },
];

const PEOPLE = [
  { id: "irene", name: "Irene Walsh", age: 77, hoursSince: 60, mobility: "wheelchair", homeClinic: "wharf", status: "due", minutesRemaining: null, window: "6:00 a.m." },
  { id: "marcus", name: "Marcus Ellison", age: 67, hoursSince: 54, mobility: "wheelchair", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "dorothy", name: "Dorothy Lang", age: 74, hoursSince: 51, mobility: "wheelchair", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "samuel", name: "Samuel Price", age: 61, hoursSince: 49, mobility: "ambulatory", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "ruth", name: "Ruth Abebe", age: 69, hoursSince: 48, mobility: "ambulatory", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "luis", language: "es", name: "Luis Ortega", age: 55, hoursSince: 47, mobility: "wheelchair", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "helenp", language: "ko", name: "Helen Park", age: 72, hoursSince: 46, mobility: "ambulatory", homeClinic: "pier", status: "due", minutesRemaining: null, window: "5:30 a.m." },
  { id: "frank", name: "Frank Odell", age: 63, hoursSince: 44, mobility: "ambulatory", homeClinic: "wharf", status: "due", minutesRemaining: null, window: "6:00 a.m." },
  { id: "grace", language: "es", name: "Grace Ibrahim", age: 68, hoursSince: 43, mobility: "wheelchair", homeClinic: "wharf", status: "due", minutesRemaining: null, window: "6:00 a.m." },
  { id: "patrick", name: "Patrick Nguyen", age: 70, hoursSince: 6, mobility: "ambulatory", homeClinic: "eastbank", status: "on-machine", minutesRemaining: 55, window: "On the machine" },
  { id: "andre", name: "Andre Wallace", age: 58, hoursSince: 5, mobility: "ambulatory", homeClinic: "eastbank", status: "on-machine", minutesRemaining: 22, window: "On the machine" },
  { id: "helencho", language: "ko", name: "Helen Cho", age: 64, hoursSince: 5, mobility: "wheelchair", homeClinic: "eastbank", status: "on-machine", minutesRemaining: 16, window: "On the machine" },
  { id: "camille", name: "Camille Brooks", age: 49, hoursSince: 4, mobility: "ambulatory", homeClinic: "eastbank", status: "on-machine", minutesRemaining: 11, window: "On the machine" },
];

// Fictional callback line every patient message must include.
export const HOTLINE = "(555) 014-2200";

export const LANGUAGES = {
  en: { name: "English", voice: "Joanna" },
  es: { name: "Spanish", voice: "Lupe" },
  ko: { name: "Korean", voice: "Seoyeon" },
};

export function patientLanguage(patient) {
  return LANGUAGES[patient?.language] ? patient.language : "en";
}

export const FEED = [
  {
    id: "wx",
    at: "2:17 a.m.",
    source: "Weather service",
    text: "Coastal flood warning for the Pier and South Wharf. Low roads will close within the hour.",
  },
  {
    id: "pier",
    at: "2:19 a.m.",
    source: "Alicia Moore · Pier",
    text: "Water is at the loading dock. Treatment floor is powered down. No one is on a machine. The 5:30 patients cannot come here.",
  },
  {
    id: "east",
    at: "2:21 a.m.",
    source: "Chris Daley · Eastbank",
    text: "Utility power is gone. Generator is up with about 40 minutes of fuel. Four patients are mid-treatment and stable. Three can finish. Patrick Nguyen has 55 minutes left. He will not.",
  },
  {
    id: "wharf",
    at: "2:24 a.m.",
    source: "South Wharf alarm",
    text: "City water is offline. The treatment system cannot run. Clinic is closed. Three morning patients still need chairs.",
  },
  {
    id: "roads",
    at: "2:26 a.m.",
    source: "Priya Shah · Roads",
    text: "Pier approach is closed. South Wharf bridge is closed. Main and North Ridge are clear. Cedar Grove is high-clearance vans only. Two wheelchair vans are up. No stretcher.",
  },
];

export function quietClinics() {
  return clone(CLINICS);
}

export function crisisClinics() {
  const list = quietClinics();
  const byId = Object.fromEntries(list.map((clinic) => [clinic.id, clinic]));
  Object.assign(byId.pier, {
    power: false,
    water: false,
    utility: false,
    road: "closed",
    openChairs: 0,
    inTreatment: 0,
    generator: false,
    generatorMinutes: 0,
  });
  Object.assign(byId.wharf, {
    power: true,
    water: false,
    road: "closed",
    openChairs: 0,
    inTreatment: 0,
  });
  Object.assign(byId.eastbank, {
    power: true,
    water: true,
    utility: false,
    generator: true,
    generatorMinutes: 40,
    road: "clear",
    openChairs: 0,
    inTreatment: 4,
  });
  Object.assign(byId.cedar, { road: "van-only" });
  return list;
}

export function patients() {
  return clone(PEOPLE);
}

export function transport() {
  return {
    vans: [
      { id: "van-2", name: "Wheelchair van 2", seats: 2, base: "ridge", ready: "now", readyOrder: 0 },
      { id: "van-1", name: "Wheelchair van 1", seats: 3, base: "main", ready: "2:31 a.m.", readyOrder: 1 },
    ],
    shuttle: "The clinic shuttle reaches only clinics whose road is clear.",
    shuttleReaches: ["main", "ridge"],
    stretcher: false,
  };
}

export function quietWorld() {
  return { scenario: "quiet", clinics: quietClinics(), patients: patients(), transport: transport(), feed: [] };
}

export function crisisWorld() {
  return { scenario: "tuesday-flood", clinics: crisisClinics(), patients: patients(), transport: transport(), feed: clone(FEED) };
}

export function isReceiving(clinic) {
  if (!clinic?.power || !clinic.water) return false;
  if (clinic.road === "closed") return false;
  if (clinic.openChairs <= 0) return false;
  if (clinic.generator && clinic.generatorMinutes < 120) return false;
  return true;
}

export function canFinish(patient, clinic) {
  if (!patient || patient.status !== "on-machine") return false;
  if (!clinic || clinic.id !== patient.homeClinic) return false;
  if (!clinic.power || !clinic.water) return false;
  if (clinic.road === "closed") return false;
  if (clinic.generator) return patient.minutesRemaining <= clinic.generatorMinutes;
  return true;
}

export function needsDecision(patient, clinics) {
  if (patient.status === "on-machine") return true;
  const home = clinics.find((clinic) => clinic.id === patient.homeClinic);
  if (!home) return true;
  if (!home.power || !home.water || home.road === "closed") return true;
  return false;
}

export function describeClinic(clinic) {
  if (!clinic.power && !clinic.water) return { tone: "bad", label: "Flooded · dark" };
  if (!clinic.water) return { tone: "bad", label: "No water" };
  if (!clinic.power) return { tone: "bad", label: "No power" };
  if (clinic.road === "closed") return { tone: "bad", label: "Road closed" };
  if (clinic.generator) return { tone: "warn", label: `Generator · ${clinic.generatorMinutes} min` };
  if (clinic.road === "van-only") return { tone: "warn", label: "Vans only" };
  if (clinic.shift === "nocturnal") return { tone: "safe", label: "Nocturnal" };
  if (clinic.inTreatment === 0) return { tone: "safe", label: clinic.shift };
  if (clinic.openChairs === 0) return { tone: "safe", label: "In treatment" };
  return { tone: "safe", label: "Open" };
}

export function formatClock(totalSeconds) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600) % 24;
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? "a.m." : "p.m.";
  return `${hour12}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${suffix}`;
}
