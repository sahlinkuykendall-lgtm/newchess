// Tiny chiptune engine on the Web Audio API: pulse/triangle/noise voices,
// a step sequencer for music and one-shot sound effects. No audio files.

const midi = n => 440 * 2 ** ((n - 69) / 12);

class Chip {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  // Must be called from a user gesture (iOS requirement).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.32;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.7;
      this.sfxBus.connect(this.master);
      const real = new Float32Array(32), imag = new Float32Array(32);
      for (let n = 1; n < 32; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
      this.pulse25 = this.ctx.createPeriodicWave(real, imag);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.track && !this.timer) this.play(this.trackName);
  }

  tone(bus, { freq, to = null, type = 'square', start, dur, vol = 0.2, attack = 0.005 }) {
    const o = this.ctx.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulse25); else o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(bus);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  noise(bus, { start, dur, vol = 0.2, hp = 1000 }) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(start);
    s.stop(start + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime, b = this.sfxBus;
    const T = (o) => this.tone(b, { ...o, start: t + (o.at ?? 0) });
    switch (name) {
      case 'click': T({ freq: 1200, dur: 0.05, vol: 0.12 }); break;
      case 'select': T({ freq: 660, dur: 0.06, vol: 0.15 }); T({ freq: 990, dur: 0.08, vol: 0.15, at: 0.05 }); break;
      case 'cancel': T({ freq: 500, to: 300, dur: 0.1, vol: 0.12 }); break;
      case 'step': T({ freq: 180, to: 120, dur: 0.05, vol: 0.12, type: 'triangle' }); break;
      case 'hit':
        this.noise(b, { start: t, dur: 0.12, vol: 0.35, hp: 600 });
        T({ freq: 220, to: 70, dur: 0.15, vol: 0.25 });
        break;
      case 'crit':
        this.noise(b, { start: t, dur: 0.2, vol: 0.45, hp: 400 });
        T({ freq: 880, to: 110, dur: 0.25, vol: 0.25 });
        T({ freq: 1320, dur: 0.08, vol: 0.12, type: 'pulse', at: 0.02 });
        break;
      case 'heal': [72, 76, 79, 84].forEach((n, i) => T({ freq: midi(n), dur: 0.15, vol: 0.14, type: 'triangle', at: i * 0.06 })); break;
      case 'charge': T({ freq: 200, to: 1600, dur: 0.6, vol: 0.18, type: 'pulse' }); this.noise(b, { start: t + 0.5, dur: 0.6, vol: 0.4, hp: 200 }); break;
      case 'boom': this.noise(b, { start: t, dur: 0.6, vol: 0.55, hp: 80 }); T({ freq: 120, to: 30, dur: 0.6, vol: 0.35 }); break;
      case 'ko': T({ freq: 600, to: 80, dur: 0.45, vol: 0.2, type: 'pulse' }); break;
      case 'turn': [67, 72].forEach((n, i) => T({ freq: midi(n), dur: 0.12, vol: 0.14, type: 'pulse', at: i * 0.09 })); break;
      case 'enemyTurn': [60, 55].forEach((n, i) => T({ freq: midi(n), dur: 0.14, vol: 0.14, type: 'pulse', at: i * 0.1 })); break;
      case 'victory': [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => T({ freq: midi(n), dur: i === 6 ? 0.7 : 0.14, vol: 0.18, type: 'pulse', at: i * 0.12 })); break;
      case 'defeat': [64, 62, 60, 55].forEach((n, i) => T({ freq: midi(n), dur: i === 3 ? 0.8 : 0.25, vol: 0.16, type: 'triangle', at: i * 0.25 })); break;
    }
  }

  // ---- music -------------------------------------------------------------
  play(trackName) {
    if (this.trackName === trackName && this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.trackName = trackName;
    this.track = TRACKS[trackName] ?? null;
    this.step = 0;
    if (!this.ctx || !this.track) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() { clearInterval(this.timer); this.timer = null; this.track = null; this.trackName = null; }

  schedule() {
    const tr = this.track;
    if (!tr || !this.ctx) return;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      if (this.musicOn) this.playStep(tr, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % tr.length;
      this.nextTime += stepDur;
    }
  }

  playStep(tr, i, t, sd) {
    const b = this.musicBus;
    const lead = tr.lead[i];
    if (lead) this.tone(b, { freq: midi(lead), start: t, dur: sd * (tr.leadLen ?? 1.8), vol: 0.16, type: 'pulse' });
    const bass = tr.bass[i];
    if (bass) this.tone(b, { freq: midi(bass), start: t, dur: sd * 1.6, vol: 0.28, type: 'triangle' });
    if (tr.arp) {
      const chord = tr.chords[Math.floor(i / 16) % tr.chords.length];
      this.tone(b, { freq: midi(chord[i % chord.length] + 12), start: t, dur: sd * 0.8, vol: 0.05, type: 'square' });
    }
    const dr = tr.drums?.[i % 16];
    if (dr === 'k') this.tone(b, { freq: 150, to: 40, start: t, dur: 0.12, vol: 0.5, type: 'sine' });
    if (dr === 's') this.noise(b, { start: t, dur: 0.1, vol: 0.22, hp: 1500 });
    if (dr === 'h') this.noise(b, { start: t, dur: 0.03, vol: 0.08, hp: 7000 });
  }
}

// Helpers to write patterns: '.' rest, otherwise MIDI numbers separated by spaces.
const seq = s => s.trim().split(/\s+/).map(x => (x === '.' ? null : Number(x)));
const pumpBass = roots => roots.flatMap(r => Array.from({ length: 16 }, (_, i) => (i % 2 ? null : (i % 4 === 2 ? r + 12 : r))));

const TRACKS = {
  title: {
    bpm: 112, length: 64, arp: true, leadLen: 3.5,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    lead: seq(`
      69 . . . 72 . . . 76 . . . 74 . 72 .
      69 . . . 72 . . . 77 . . . 76 . 72 .
      67 . . . 72 . . . 76 . . . 79 . 76 .
      74 . . . . . 71 . 74 . . . . . . .`),
    bass: pumpBass([45, 41, 48, 43]),
    drums: ['k', null, null, null, 'h', null, null, null, 's', null, null, null, 'h', null, null, null],
  },
  battle: {
    bpm: 148, length: 64, arp: true,
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
    lead: seq(`
      69 . 72 . 76 . 74 72 . 69 . 67 69 . . .
      65 . 69 . 72 . 71 69 . 65 . 64 65 . . .
      67 . 71 . 74 . 72 71 . 67 . 69 71 . 74 .
      76 . . 75 76 . 80 . 83 . 81 . 80 . 76 .`),
    bass: pumpBass([45, 41, 43, 40]),
    drums: ['k', null, 'h', null, 's', null, 'h', 'k', 'k', null, 'h', null, 's', null, 'h', 'h'],
  },
};

export const audio = new Chip();
