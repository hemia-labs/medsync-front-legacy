// Aggregated numbers only: this class never accepts a chart, patient, note or URL.
class UsageAggregate {
  constructor(clock = () => performance.now()) { this.clock=clock;this.last=clock();this.interaction=this.last;this.hidden=false;this.modes=new Set();this.active=0;this.paused=0;this.operations=0;this.corrections=0;this.errors=0; }
  sample() { const now=this.clock(),delta=Math.max(0,now-this.last);const active=this.hidden?0:Math.max(0,Math.min(now,this.interaction+30000)-this.last);this.active+=Math.min(delta,active);this.paused+=delta-Math.min(delta,active);this.last=now; }
  interact(mode) { if(!['keyboard','touch','mouse'].includes(mode))return;this.sample();this.interaction=this.clock();this.modes.add(mode); }
  visibility(hidden) { this.sample();this.hidden=Boolean(hidden);if(!hidden)this.interaction=this.clock(); }
  record(operations,corrections) { this.operations+=operations;this.corrections+=corrections; }
  error() { this.errors++; }
  take(dentition) { this.sample();const data={dentition,modality:this.modes.size>1?'hybrid':this.modes.size?[...this.modes][0]:'idle',operations:this.operations,corrections:this.corrections,errors:this.errors,active_seconds:Math.floor(this.active/1000),paused_seconds:Math.floor(this.paused/1000)};this.operations=0;this.corrections=0;this.errors=0;this.active=0;this.paused=0;return data; }
}
module.exports={UsageAggregate};
