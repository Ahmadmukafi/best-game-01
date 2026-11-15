// EMBER & ANVIL — audio.js
// All sound is synthesised with WebAudio: no audio files, no network.
// One SoundEngine owns the AudioContext, a master gain and a mute flag.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._crackleTimer = 0;
  }

  // Must be called from a user gesture at least once; afterwards it is safe
  // to call play() any time. Calling it twice is harmless.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFreq, filterType) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType || 'bandpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // UI click.
  pop() { this._tone(660, 0.07, 'triangle', 0.18, 880); }

  // Bellows pump: a short airy whoosh.
  whoosh() { this._noise(0.18, 0.12, 900, 'bandpass'); }

  // Hammer strike: metallic clang with a bright ring.
  clang(good) {
    this._tone(good ? 1180 : 840, 0.16, 'square', 0.16, good ? 900 : 620);
    this._tone(good ? 1760 : 1250, 0.28, 'sine', 0.14, good ? 1500 : 1050);
    this._noise(0.06, 0.1, 3200, 'highpass');
  }

  // Dull thud for a missed strike.
  thud() { this._tone(140, 0.16, 'sine', 0.22, 70); }

  // Quench: a steam hiss.
  hiss() { this._noise(0.7, 0.2, 5200, 'highpass'); }

  // Coins landing.
  coin() {
    this._tone(1318, 0.09, 'sine', 0.2);
    setTimeout(() => this._tone(1760, 0.14, 'sine', 0.2), 70);
  }

  // A customer storming out.
  angry() {
    this._tone(220, 0.22, 'sawtooth', 0.16, 110);
    this._tone(165, 0.3, 'sawtooth', 0.14, 82);
  }

  // Day-clear fanfare.
  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.2), i * 110));
  }

  // Win jingle.
  winJingle() {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.2), i * 130));
  }

  // Lose cue.
  loseCue() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.34, 'sine', 0.18), i * 170));
  }

  // Low-timer warning tick.
  tick() { this._tone(980, 0.05, 'square', 0.08); }

  // Quiet forge crackle while playing: call every frame with dt.
  update(dt, playing) {
    if (!this.ctx || this.muted || !playing) return;
    this._crackleTimer -= dt;
    if (this._crackleTimer <= 0) {
      this._crackleTimer = 0.25 + Math.random() * 0.9;
      this._noise(0.05, 0.03, 1800 + Math.random() * 2000, 'bandpass');
    }
  }
}
