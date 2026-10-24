export const sound = new Soundscape();

function Soundscape() {
  this.started = false;
  this.ctx = null;
  this.volume = 0.92;
  this.voice = null;
  this.muted = false;
}

Soundscape.prototype.start = async function start() {
  if (this.started) {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return;
  }
  const ctx = new AudioContext();
  this.ctx = ctx;
  this.master = ctx.createGain();
  this.master.gain.value = this.volume;
  this.master.connect(ctx.destination);
  this.captureDest = ctx.createMediaStreamDestination();
  this.master.connect(this.captureDest);

  this.rainGain = ctx.createGain();
  this.rainGain.gain.value = 0.22;
  this.rainGain.connect(this.master);

  this.scoreGain = ctx.createGain();
  this.scoreGain.gain.value = 0.55;
  this.scoreGain.connect(this.master);

  this.voiceGain = ctx.createGain();
  this.voiceGain.gain.value = 1.15;
  this.voiceGain.connect(this.master);

  this.sfx = ctx.createGain();
  this.sfx.gain.value = 0.88;
  this.sfx.connect(this.master);

  this.radioFilter = ctx.createBiquadFilter();
  this.radioFilter.type = "bandpass";
  this.radioFilter.frequency.value = 1500;
  this.radioFilter.Q.value = 0.65;
  this.radioFilter.connect(this.voiceGain);

  this.makeRain();
  this.makeWind();
  this.makeScore();
  this.started = true;
  if (ctx.state === "suspended") await ctx.resume();
};

Soundscape.prototype.noiseBuffer = function noiseBuffer(seconds, color = "white") {
  const ctx = this.ctx;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "brown") {
      last = (last + white * 0.02) / 1.02;
      data[i] = last * 3.5;
    } else if (color === "pink") {
      last = 0.98 * last + 0.02 * white;
      data[i] = last * 2.2;
    } else {
      data[i] = white;
    }
  }
  return buffer;
};

Soundscape.prototype.makeRain = function makeRain() {
  const ctx = this.ctx;
  // Close rain (drops / hiss)
  const close = ctx.createBufferSource();
  close.buffer = this.noiseBuffer(2.4, "pink");
  close.loop = true;
  const high = ctx.createBiquadFilter();
  high.type = "bandpass";
  high.frequency.value = 2200;
  high.Q.value = 0.45;
  const closeGain = ctx.createGain();
  closeGain.gain.value = 0.55;
  close.connect(high);
  high.connect(closeGain);
  closeGain.connect(this.rainGain);
  close.start();

  // Distant storm rumble
  const rumble = ctx.createBufferSource();
  rumble.buffer = this.noiseBuffer(3, "brown");
  rumble.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 160;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.45;
  rumble.connect(low);
  low.connect(rumbleGain);
  rumbleGain.connect(this.rainGain);
  rumble.start();
};

/** Soft wind layer under the rain */
Soundscape.prototype.makeWind = function makeWind() {
  const ctx = this.ctx;
  this.windGain = ctx.createGain();
  this.windGain.gain.value = 0.12;
  this.windGain.connect(this.master);
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer(4, "pink");
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 380;
  filter.Q.value = 0.7;
  src.connect(filter);
  filter.connect(this.windGain);
  src.start();
};

Soundscape.prototype.makeScore = function makeScore() {
  const ctx = this.ctx;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.01;
  lfo.connect(lfoGain);
  [98, 146.83, 196].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.035 : 0.018;
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.scoreGain);
    osc.start();
  });
  lfo.start();
};

Soundscape.prototype.duck = function duck() {
  if (!this.ctx) return;
  const time = this.ctx.currentTime;
  this.rainGain.gain.setTargetAtTime(0.08, time, 0.12);
  this.scoreGain.gain.setTargetAtTime(0.22, time, 0.15);
  if (this.windGain) this.windGain.gain.setTargetAtTime(0.04, time, 0.12);
  this.sfx.gain.setTargetAtTime(0.45, time, 0.1);
};

Soundscape.prototype.unduck = function unduck() {
  if (!this.ctx) return;
  const time = this.ctx.currentTime;
  this.rainGain.gain.setTargetAtTime(0.22, time, 0.4);
  this.scoreGain.gain.setTargetAtTime(0.55, time, 0.45);
  if (this.windGain) this.windGain.gain.setTargetAtTime(0.12, time, 0.4);
  this.sfx.gain.setTargetAtTime(0.88, time, 0.35);
};

Soundscape.prototype.setMuted = function setMuted(muted) {
  this.muted = muted;
  if (!this.ctx) return;
  this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
};

Soundscape.prototype.togglePause = async function togglePause() {
  if (!this.ctx) return;
  if (this.ctx.state === "running") {
    await this.ctx.suspend();
    window.speechSynthesis?.pause();
  } else {
    await this.ctx.resume();
    window.speechSynthesis?.resume();
  }
};

Soundscape.prototype.stopVoice = function stopVoice() {
  if (this.voice) {
    try { this.voice.stop(); } catch { /* already ended */ }
    this.voice = null;
  }
  window.speechSynthesis?.cancel();
};

Soundscape.prototype.decodeBase64 = async function decodeBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return this.ctx.decodeAudioData(bytes.buffer.slice(0));
};

Soundscape.prototype.playBuffer = function playBuffer(buffer, { radio = false } = {}) {
  this.stopVoice();
  const source = this.ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(radio ? this.radioFilter : this.voiceGain);
  this.voice = source;
  source.start();
  return new Promise((resolve) => {
    const ms = Math.ceil((buffer.duration || 1) * 1000) + 180;
    const timer = setTimeout(() => {
      if (this.voice === source) this.voice = null;
      resolve();
    }, ms);
    source.onended = () => {
      clearTimeout(timer);
      if (this.voice === source) this.voice = null;
      resolve();
    };
  });
};

Soundscape.prototype.speakText = function speakText(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 0.94;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const ms = Math.min(20000, Math.max(2200, String(text || "").length * 52));
    const timer = setTimeout(finish, ms);
    utterance.onend = () => { clearTimeout(timer); finish(); };
    utterance.onerror = () => { clearTimeout(timer); finish(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

Soundscape.prototype.squelch = function squelch() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const length = Math.floor(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / length) * Math.PI);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.value = 0.22;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  source.start();
};

Soundscape.prototype.blip = function blip(frequency, duration, level) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + duration + 0.02);
};

Soundscape.prototype.tick = function tick() {
  this.blip(620, 0.05, 0.06);
};

Soundscape.prototype.place = function place() {
  this.blip(780, 0.07, 0.08);
};

Soundscape.prototype.alert = function alert() {
  this.blip(540, 0.1, 0.08);
  setTimeout(() => this.blip(700, 0.12, 0.07), 140);
};

Soundscape.prototype.powerFail = function powerFail() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 380;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + 1.1);
  // Electrical crack
  const crack = ctx.createBufferSource();
  crack.buffer = this.noiseBuffer(0.12, "white");
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.18, now);
  cg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  const cf = ctx.createBiquadFilter();
  cf.type = "highpass";
  cf.frequency.value = 1200;
  crack.connect(cf);
  cf.connect(cg);
  cg.connect(this.sfx);
  crack.start(now);
};

/** Soft dialysis pump + quiet monitor beep */
Soundscape.prototype.dialysis = function dialysis(seconds = 2.0) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const beats = Math.max(2, Math.floor(seconds / 0.7));
  for (let i = 0; i < beats; i += 1) {
    const t = now + i * 0.7;
    const thump = ctx.createOscillator();
    const tg = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(62, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    tg.gain.setValueAtTime(0.11, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    thump.connect(tg);
    tg.connect(this.sfx);
    thump.start(t);
    thump.stop(t + 0.22);
    const beep = ctx.createOscillator();
    const bg = ctx.createGain();
    beep.type = "sine";
    beep.frequency.value = 920;
    bg.gain.setValueAtTime(0.0001, t + 0.25);
    bg.gain.exponentialRampToValueAtTime(0.035, t + 0.27);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    beep.connect(bg);
    bg.connect(this.sfx);
    beep.start(t + 0.25);
    beep.stop(t + 0.4);
  }
};

Soundscape.prototype.thunder = function thunder() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const duration = 2.8;
  const buffer = this.noiseBuffer(duration, "brown");
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const env = (1 - i / data.length) ** 1.35;
    data[i] *= env * 1.4;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1100, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 2.4);
  const gain = ctx.createGain();
  gain.gain.value = 0.72;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  source.start();
};

/** Water slap / flood surge */
Soundscape.prototype.splash = function splash() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer(0.55, "white");
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(280, now + 0.45);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  src.start(now);
};

/** Harbor water lapping */
Soundscape.prototype.water = function water(seconds = 2.2) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer(seconds, "pink");
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 520;
  filter.Q.value = 0.55;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.2);
  gain.gain.setValueAtTime(0.14, now + seconds - 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  src.start(now);
  src.stop(now + seconds + 0.05);
};

/** Quiet clinic HVAC / fluorescent hum */
Soundscape.prototype.clinicHum = function clinicHum(seconds = 2.5) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 118;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.05, now + 0.3);
  gain.gain.setValueAtTime(0.045, now + seconds - 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + seconds + 0.05);
  // Soft 60Hz buzz harmonic
  const buzz = ctx.createOscillator();
  const bg = ctx.createGain();
  buzz.type = "triangle";
  buzz.frequency.value = 60;
  bg.gain.value = 0.018;
  buzz.connect(bg);
  bg.connect(this.sfx);
  buzz.start(now);
  buzz.stop(now + seconds);
};

/** Phone vibration / ring */
Soundscape.prototype.phoneRing = function phoneRing() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i += 1) {
    const t = now + i * 0.45;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(980, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.3);
  }
};

/** Soft keyboard / desk click */
Soundscape.prototype.keyboard = function keyboard() {
  if (!this.ctx) return;
  for (let i = 0; i < 5; i += 1) {
    setTimeout(() => this.blip(1400 + Math.random() * 400, 0.03, 0.04), i * 70);
  }
};

/** Wooden door / room tone shift */
Soundscape.prototype.door = function door() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + 0.4);
};

/** Generator rumble */
Soundscape.prototype.generator = function generator(seconds = 2.4) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 48;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 140;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.25);
  gain.gain.setValueAtTime(0.1, now + seconds - 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + seconds + 0.05);
};

/** Distant city traffic wash (not siren) */
Soundscape.prototype.city = function city(seconds = 2.0) {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer(seconds, "pink");
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.09, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  src.start(now);
  src.stop(now + seconds + 0.05);
};

Soundscape.prototype.approve = function approve() {
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  [220, 277.18, 329.63, 440].forEach((frequency, index) => {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const start = now + index * 0.035;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1.5);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(start);
    osc.stop(start + 1.6);
  });
};

Soundscape.prototype.startCapture = function startCapture() {
  if (!this.ctx || !this.captureDest || this.recorder) return;
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
  this.chunks = [];
  try {
    this.recorder = mime
      ? new MediaRecorder(this.captureDest.stream, { mimeType: mime, audioBitsPerSecond: 192000 })
      : new MediaRecorder(this.captureDest.stream);
  } catch {
    this.recorder = null;
    return;
  }
  this.recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) this.chunks.push(event.data);
  };
  this.recorder.start(400);
};

Soundscape.prototype.stopCapture = function stopCapture() {
  return new Promise((resolve) => {
    if (!this.recorder || this.recorder.state === "inactive") {
      resolve(null);
      return;
    }
    this.recorder.onstop = () => {
      const type = this.recorder.mimeType || "audio/webm";
      const blob = new Blob(this.chunks || [], { type });
      this.recorder = null;
      resolve(blob.size ? blob : null);
    };
    try { this.recorder.requestData(); } catch { /* ignore */ }
    this.recorder.stop();
  });
};

Soundscape.prototype.blobToBase64 = function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      resolve(text.includes(",") ? text.split(",")[1] : text);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
