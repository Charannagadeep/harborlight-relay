export const sound = new Soundscape();

function Soundscape() {
  this.started = false;
  this.ctx = null;
  this.volume = 0.85;
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

  this.rainGain = ctx.createGain();
  this.rainGain.gain.value = 0.16;
  this.rainGain.connect(this.master);

  this.scoreGain = ctx.createGain();
  this.scoreGain.gain.value = 0.85;
  this.scoreGain.connect(this.master);

  this.voiceGain = ctx.createGain();
  this.voiceGain.gain.value = 1;
  this.voiceGain.connect(this.master);

  this.sfx = ctx.createGain();
  this.sfx.gain.value = 0.62;
  this.sfx.connect(this.master);

  this.radioFilter = ctx.createBiquadFilter();
  this.radioFilter.type = "bandpass";
  this.radioFilter.frequency.value = 1500;
  this.radioFilter.Q.value = 0.65;
  this.radioFilter.connect(this.voiceGain);

  this.makeRain();
  this.makeScore();
  this.started = true;
  if (ctx.state === "suspended") await ctx.resume();
};

Soundscape.prototype.makeRain = function makeRain() {
  const ctx = this.ctx;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + white * 0.02) / 1.02;
    data[i] = brown * 3.2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 650;
  source.connect(high);
  high.connect(this.rainGain);
  source.start();

  const rumble = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const low = rumble.getChannelData(0);
  let last = 0;
  for (let i = 0; i < low.length; i += 1) {
    last = (last + (Math.random() * 2 - 1) * 0.04) / 1.04;
    low[i] = last * 4;
  }
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumble;
  rumbleSource.loop = true;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 180;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.35;
  rumbleSource.connect(lowpass);
  lowpass.connect(rumbleGain);
  rumbleGain.connect(this.rainGain);
  rumbleSource.start();
};

Soundscape.prototype.makeScore = function makeScore() {
  const ctx = this.ctx;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.012;
  lfo.connect(lfoGain);
  [110, 130.81, 164.81].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.05 : 0.028;
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
  this.rainGain.gain.setTargetAtTime(0.055, time, 0.18);
  this.scoreGain.gain.setTargetAtTime(0.32, time, 0.22);
};

Soundscape.prototype.unduck = function unduck() {
  if (!this.ctx) return;
  const time = this.ctx.currentTime;
  this.rainGain.gain.setTargetAtTime(0.16, time, 0.45);
  this.scoreGain.gain.setTargetAtTime(0.85, time, 0.5);
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
    source.onended = () => {
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
    utterance.rate = 0.94;
    utterance.pitch = 0.92;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
};

Soundscape.prototype.squelch = function squelch() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const length = Math.floor(ctx.sampleRate * 0.09);
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
  gain.gain.value = 0.18;
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
  this.blip(540, 0.07, 0.05);
};

Soundscape.prototype.place = function place() {
  this.blip(740, 0.09, 0.07);
};

Soundscape.prototype.alert = function alert() {
  this.blip(520, 0.12, 0.06);
  setTimeout(() => this.blip(660, 0.14, 0.05), 160);
};

Soundscape.prototype.powerFail = function powerFail() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.6);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc.connect(gain);
  gain.connect(this.sfx);
  osc.start(now);
  osc.stop(now + 0.75);
};

Soundscape.prototype.thunder = function thunder() {
  if (!this.ctx) return;
  const ctx = this.ctx;
  const duration = 2.6;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const env = (1 - i / data.length) ** 1.6;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 2.2);
  const gain = ctx.createGain();
  gain.gain.value = 0.55;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.sfx);
  source.start();
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
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1.7);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(start);
    osc.stop(start + 1.8);
  });
};
