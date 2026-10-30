// One queue per mounted patient/chart editor. No browser persistence of clinical data.
const id = () => window.crypto.randomUUID();
const copy = value => JSON.parse(JSON.stringify(value));
class CaptureSession {
  constructor(chart, send, notify, makeId = id, confirmed = () => {}) {
    this.chart = copy(chart); this.send = send; this.notify = notify; this.makeId = makeId;
    this.pending = []; this.groups = []; this.inflight = null; this.state = 'saved'; this.timer = null; this.disposed = false;
    this.error = null; this.undoStack = []; this.running = null; this.uncertain = false; this.attempts = 0;
    this.confirmed = confirmed;
  }
  emit() { if (!this.disposed) this.notify(this); }
  enqueue(ops) {
    if (this.disposed || ['error', 'conflict', 'offline'].includes(this.state)) throw Error('Resuelve el guardado pendiente antes de continuar.');
    if (!Array.isArray(ops) || !ops.length) return;
    if (ops.length > 100) throw Error('La intención supera 100 operaciones.');
    this.pending.push(...ops.map(op => ({ ...copy(op), client_op_id: this.makeId() })));
    this.groups.push(ops.length);
    this.state = 'pending'; this.emit();
    clearTimeout(this.timer);
    if (this.pending.length >= 20) return this.flush();
    this.timer = setTimeout(() => this.flush(), 400);
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (this.disposed || !this.pending.length && !this.inflight) return;
    this.running = this.drain();
    try { return await this.running; } finally { this.running = null; this.emit(); }
  }
  async drain() {
    while (!this.disposed && (this.pending.length || this.inflight)) {
      if (!this.inflight) {
        // A multi-tooth command is indivisible, even when it exceeds the usual
        // 20-operation batching threshold. Never partially persist one intent.
        let count = this.groups.shift();
        while (this.groups.length && count + this.groups[0] <= 20) count += this.groups.shift();
        this.inflight = { batch_id: this.makeId(), base_revision: this.chart.revision, generation: this.chart.generation,
          catalog_version: this.chart.edit_catalog_version || this.chart.catalog_version,
          ...(this.chart.alias_version ? { alias_version: this.chart.alias_version } : {}), ops: this.pending.splice(0, count) };
        this.before = copy(this.chart);
      }
      this.attempts++; this.state = 'saving'; this.error = null; this.emit();
      let result;
      try { result = await this.send(this.chart.id_chart, copy(this.inflight)); }
      catch (error) { result = { success: false, status: 0, message: error.message }; }
      if (this.disposed) return;
      if (!result.success) {
        this.state = result.status === 409 ? 'conflict' : !result.status ? 'offline' : 'error';
        this.uncertain = this.uncertain || !result.status || result.status >= 500;
        this.error = result.message || 'No se pudo confirmar el guardado.'; this.emit(); return;
      }
      if (result.data.revision !== this.before.revision) this.undoStack.push({ before: this.before, after: copy(result.data), ops: copy(this.inflight.ops) });
      try { this.confirmed(result.data.revision !== this.before.revision ? this.inflight.ops.map(op => op.type) : []); } catch (error) { /* Optional feedback never interrupts a confirmed clinical save. */ }
      if (this.undoStack.length > 30) this.undoStack.shift();
      this.chart = copy(result.data); this.inflight = null; this.uncertain = false;
    }
    if (!this.disposed) { this.state = 'saved'; this.emit(); }
  }
  async retry() { if (this.running) return this.running; return this.flush(); }
  hasPending() { return Boolean(this.pending.length || this.inflight || this.running); }
  cancelPending() {
    if (this.inflight) throw Error('Primero confirma el resultado del lote enviado.');
    clearTimeout(this.timer); this.pending = []; this.groups = []; this.state = 'saved'; this.emit();
  }
  cancelLastPending() {
    if (!this.groups.length) return;
    clearTimeout(this.timer);
    const count = this.groups.pop(); this.pending.splice(this.pending.length - count, count);
    this.state = this.inflight ? 'saving' : this.pending.length ? 'pending' : 'saved';
    if (!this.inflight && this.pending.length) this.timer = setTimeout(() => this.flush(), 400);
    this.emit();
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
module.exports = { CaptureSession };
