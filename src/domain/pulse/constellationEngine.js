import { makeStars, position, filamentPoints, FILAMENTS, FILAMENT_STEPS, PALETTE, PARTICLE_COUNTS } from './visualModel';
const FRAME = 1000 / 30;
export class ConstellationEngine {
  constructor(canvas, model, options = {}) {
    this.canvas = canvas;
    this.model = model;
    this.options = options;
    this.win = options.window || window;
    this.doc = options.document || document;
    this.now = options.now || (() => performance.now());
    this.raf = 0;
    this.disposed = false;
    this.reasons = new Set();
    this.lastFrame = null;
    this.lastDrawStamp = null;
    this.elapsed = options.elapsed || 0;
    this.recognition = null;
    this.width = 1;
    this.height = 1;
    this.scale = 1;
    this.count = PARTICLE_COUNTS.includes(options.count) ? options.count : canvas.clientWidth < 600 ? 192 : 384;
    this.seeds = makeStars();
    this.points = new Float32Array(384 * 6);
    this.filaments = new Float32Array(FILAMENTS * (FILAMENT_STEPS + 1) * 6);
    this.strengths = new Float32Array(model.causes.map(c => c.strength));
    this.sprites = [];
    this.costs = new Float64Array(2048);
    this.intervals = new Float64Array(2048);
    this.frames = 0;
    this.work = 0;
    this.lastState = '';
    this.slowWindows = 0;
    this.qualityDrops = 0;
    this.listeners = 0;
    this.observers = 0;
    const start = this.now();
    try {
      this.context = canvas.getContext('2d', {
        alpha: true
      });
      if (!this.context) throw Error('context');
      this.makeSprites();
      this.visibility = () => this.suspend('hidden-tab', this.doc.hidden);
      this.lost = event => {
        if (event.preventDefault) event.preventDefault();
        this.suspend('context-lost', true);
      };
      this.restored = () => {
        if (this.disposed || !this.reasons.has('context-lost')) return;
        try {
          this.context = this.canvas.getContext('2d', {
            alpha: true
          });
          if (!this.context) throw Error('context');
          this.makeSprites();
          this.resize();
          this.suspend('context-lost', false);
          this.renderStill();
        } catch (_) {
          this.fail('context');
        }
      };
      this.doc.addEventListener('visibilitychange', this.visibility);
      this.listeners++;
      canvas.addEventListener('contextlost', this.lost);
      this.listeners++;
      canvas.addEventListener('contextrestored', this.restored);
      this.listeners++;
      this.resizeObserver = new this.win.ResizeObserver(() => {
        if (!this.disposed) {
          this.resize();
          this.renderStill();
        }
      });
      this.resizeObserver.observe(canvas);
      this.observers++;
      this.intersectionObserver = new this.win.IntersectionObserver(entries => {
        if (!this.disposed) this.suspend('out-of-view', !entries.some(e => e.isIntersecting));
      }, {
        threshold: 0
      });
      this.intersectionObserver.observe(canvas);
      this.observers++;
      this.reasons.add('owner');
      if (this.doc.hidden) this.reasons.add('hidden-tab');
      const bounds = canvas.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= this.win.innerHeight) this.reasons.add('out-of-view');
      this.resize();
      this.draw();
      this.initMs = this.now() - start;
      this.state();
    } catch (_) {
      this.dispose();
      throw Error('PULSE_RENDER_UNAVAILABLE');
    }
  }
  makeSprites() {
    this.sprites.forEach(s => {
      s.width = s.height = 1;
    });
    this.sprites = PALETTE.map(color => {
      const s = this.doc.createElement('canvas');
      s.width = s.height = 32;
      const c = s.getContext('2d');
      if (!c) throw Error('sprite');
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, color + 'c0');
      g.addColorStop(.15, color + '60');
      g.addColorStop(.45, color + '18');
      g.addColorStop(1, color + '00');
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    });
  }
  resize() {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.min(2000, r.width));
    this.height = Math.max(1, Math.min(1200, r.height));
    this.scale = Math.min(this.win.devicePixelRatio || 1, 1.5, Math.sqrt(2000000 / (this.width * this.height)));
    this.canvas.width = Math.max(1, Math.floor(this.width * this.scale));
    this.canvas.height = Math.max(1, Math.floor(this.height * this.scale));
  }
  suspend(reason, enabled) {
    if (this.disposed) return;
    if (reason === 'owner' && enabled) for (let i = 0; i < 3; i++) this.strengths[i] = this.model.causes[i].strength;
    if (enabled) this.reasons.add(reason);else this.reasons.delete(reason);
    if (this.reasons.size) {
      if (this.raf) this.win.cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.lastFrame = null;
      this.lastDrawStamp = null;
    } else this.schedule();
    this.state();
  }
  state() {
    const state = this.disposed ? 'disposed' : this.reasons.has('context-lost') ? 'context-lost' : this.reasons.size ? 'paused' : 'running';
    if (state !== this.lastState) {
      this.lastState = state;
      if (this.options.onState) this.options.onState(state);
    }
  }
  setVisual(model) {
    if (this.disposed) return;
    this.model = model;
    // Escalation is immediate. Relaxation is decorative, never a resolution claim.
    for (let i = 0; i < 3; i++) this.strengths[i] = this.reasons.size ? model.causes[i].strength : Math.max(this.strengths[i], model.causes[i].strength);
    this.renderStill();
  }
  acknowledge(index) {
    if (this.disposed || ![0,1,2].includes(index) || this.reasons.size) return;
    this.recognition = { index, started: this.elapsed };
  }
  setQuality(count) {
    if (!this.disposed && PARTICLE_COUNTS.includes(count)) this.count = count;
  }
  schedule() {
    if (!this.disposed && !this.reasons.size && !this.raf) this.raf = this.win.requestAnimationFrame(t => this.tick(t));
  }
  tick(time) {
    this.raf = 0;
    if (this.disposed || this.reasons.size) return;
    const delta = this.lastFrame === null ? FRAME : time - this.lastFrame;
    if (delta + .4 >= FRAME) {
      const actualInterval = this.lastDrawStamp === null ? 0 : time - this.lastDrawStamp,
        dt = Math.min(actualInterval, 100);
      this.lastDrawStamp = time;
      this.lastFrame = time - (delta >= FRAME ? delta % FRAME : 0);
      this.elapsed += dt;
      for (let i = 0; i < 3; i++) this.strengths[i] += (this.model.causes[i].strength - this.strengths[i]) * (1 - Math.exp(-dt / 1600));
      const start = this.now();
      try {
        this.draw();
      } catch (_) {
        this.fail('draw');
        return;
      }
      const cost = this.now() - start,
        index = this.frames % 2048;
      this.costs[index] = cost;
      this.intervals[index] = actualInterval;
      this.work += cost;
      this.frames++;
      if (this.frames % 120 === 0) this.adapt();
    }
    this.schedule();
  }
  adapt() {
    const n = Math.min(this.frames, 120),
      samples = [];
    for (let i = 0; i < n; i++) samples.push(this.costs[(this.frames - i - 1) % 2048]);
    samples.sort((a, b) => a - b);
    const slow = samples[Math.floor(n * .95)] > 4 || samples.reduce((a, b) => a + b, 0) / n > 2.5;
    this.slowWindows = slow ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 2) return;
    this.slowWindows = 0;
    const tier = PARTICLE_COUNTS.indexOf(this.count);
    if (tier > 0) {
      this.count = PARTICLE_COUNTS[tier - 1];
      this.qualityDrops++;
      if (this.options.onQuality) this.options.onQuality();
    } else this.fail('performance');
  }
  renderStill() {
    if (this.disposed || ['context-lost', 'hidden-tab', 'out-of-view', 'deactivated', 'hidden'].some(r => this.reasons.has(r))) return;
    try {
      this.draw();
    } catch (_) {
      this.fail('draw');
    }
  }
  draw() {
    const c = this.context,
      w = this.width,
      h = this.height;
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < this.count; i++) position(this.seeds, i, this.elapsed / 1000, w, h, this.strengths, this.model.causes, this.points);
    filamentPoints(this.model, this.elapsed / 1000, w, h, this.strengths, this.filaments);
    for (let arm = 0; arm < FILAMENTS; arm++) {
      c.beginPath();
      for (let i = 0; i <= FILAMENT_STEPS; i++) {
        const o = (arm * (FILAMENT_STEPS + 1) + i) * 6;
        if (!i) c.moveTo(this.filaments[o], this.filaments[o + 1]);else c.lineTo(this.filaments[o], this.filaments[o + 1]);
      }
      c.strokeStyle = PALETTE[arm % 3];
      c.globalAlpha = .045;
      c.lineWidth = 5;
      c.stroke();
      c.globalAlpha = .26;
      c.lineWidth = .65;
      c.stroke();
      c.beginPath();
      let connected = false;
      for (let i = 0; i <= FILAMENT_STEPS; i++) {
        const o = (arm * (FILAMENT_STEPS + 1) + i) * 6;
        if (this.filaments[o + 4] > .09) {
          if (connected) c.lineTo(this.filaments[o], this.filaments[o + 1]);else c.moveTo(this.filaments[o], this.filaments[o + 1]);
          connected = true;
        } else connected = false;
      }
      c.strokeStyle = PALETTE[3];
      c.globalAlpha = .38;
      c.lineWidth = 1;
      c.stroke();
    }
    for (let i = 0; i < this.count; i++) {
      const o = i * 6,
        x = this.points[o],
        y = this.points[o + 1],
        r = this.points[o + 2],
        color = this.points[o + 5],
        size = r * 14;
      c.globalAlpha = this.points[o + 3];
      c.drawImage(this.sprites[color], x - size / 2, y - size / 2, size, size);
      c.beginPath();
      c.arc(x, y, r * .72, 0, Math.PI * 2);
      c.fillStyle = PALETTE[color];
      c.fill();
    }
    if (this.recognition) {
      const progress = (this.elapsed - this.recognition.started) / 2400;
      if (progress >= 1) this.recognition = null;
      else {
        // One quiet trail in the verified area. Remaining disturbances keep their meaning.
        c.strokeStyle = '#a4e8d8'; c.lineWidth = 2;
        c.globalAlpha = Math.sin(Math.PI * progress) * .7;
        for (let arm = 0; arm < FILAMENTS; arm++) {
          c.beginPath(); let connected = false;
          for (let i = 0; i <= FILAMENT_STEPS; i++) {
            const o = (arm * (FILAMENT_STEPS + 1) + i) * 6,
              x = this.filaments[o], y = this.filaments[o + 1],
              angle = Math.atan2((y/h-.51)/.43/.8,(x/w-.5)/.33) + .18,
              local = Math.cos(angle - this.recognition.index * Math.PI * 2/3) > .8,
              segment = (arm + i/FILAMENT_STEPS)/FILAMENTS;
            if (local && segment > progress*.85 && segment < progress*.85+.15) {
              if (connected) c.lineTo(x,y); else c.moveTo(x,y); connected = true;
            } else connected = false;
          }
          c.stroke();
        }
      }
    }
    c.globalAlpha = 1;
    // Interactive diamond markers belong to the HTML owner, outside the renderer.
  }
  fail(code) {
    if (this.disposed) return;
    this.suspend('failure', true);
    if (this.options.onFailure) this.options.onFailure(code);
  }
  inspect() {
    const n = Math.min(this.frames, 2048);
    return {
      frames: this.frames,
      workMs: this.work,
      costs: Array.from(this.costs || []).slice(0, n),
      intervals: Array.from(this.intervals || []).slice(0, n).filter(v => v > 0),
      initMs: this.initMs || 0,
      elapsedMs: this.elapsed,
      count: this.count,
      qualityDrops: this.qualityDrops,
      dpr: this.scale,
      backingPixels: this.canvas ? this.canvas.width * this.canvas.height : 0,
      rafScheduled: !!this.raf,
      reasons: [...this.reasons],
      listeners: this.listeners,
      observers: this.observers,
      disposed: this.disposed
    };
  }
  resetMetrics() {
    if (this.disposed) return;
    this.frames = 0;
    this.work = 0;
    this.costs.fill(0);
    this.intervals.fill(0);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.raf) this.win.cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.visibility) this.doc.removeEventListener('visibilitychange', this.visibility);
    if (this.canvas && this.lost) this.canvas.removeEventListener('contextlost', this.lost);
    if (this.canvas && this.restored) this.canvas.removeEventListener('contextrestored', this.restored);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    this.listeners = 0;
    this.observers = 0;
    this.sprites.forEach(s => {
      s.width = s.height = 1;
    });
    this.sprites = [];
    if (this.canvas) this.canvas.width = this.canvas.height = 1;
    this.model = this.context = this.seeds = this.points = this.filaments = this.costs = this.intervals = this.recognition = null;
    this.options = {};
    this.reasons.clear();
  }
}
