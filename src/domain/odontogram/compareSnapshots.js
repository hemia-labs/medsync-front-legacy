const { sequence } = require('../../utils/odontogram/dentalContract');
function compareSnapshots(before, after) {
  const sameChart = before.id_chart === after.id_chart;
  const teeth = [];
  for (const number of sequence('mixed')) {
    const left = before.teeth[number], right = after.teeth[number];
    if (!left && !right) continue;
    const old = left ? left.findings.filter(f => f.status === 'active') : [];
    const current = right ? right.findings.filter(f => f.status === 'active') : [];
    const added = current.filter(f => !sameChart || !old.some(item => item.id === f.id));
    const removed = old.filter(f => !sameChart || !current.some(item => item.id === f.id)).map(f => {
      const state = sameChart && right && right.findings.find(item => item.id === f.id);
      return { ...f, resulting_status: state ? state.status : 'not_in_snapshot' };
    });
    const changed = current.filter(f => sameChart && old.some(item => item.id === f.id && JSON.stringify([item.surfaces,item.surface_pending,item.intent]) !== JSON.stringify([f.surfaces,f.surface_pending,f.intent]))).map(f=>({...f,before:old.find(item=>item.id===f.id)}));
    const noteChanged = (left && left.note || '') !== (right && right.note || '');
    const reviewChanged = JSON.stringify(left && [left.reviewed_revision,Boolean(left.review_invalidated)]) !== JSON.stringify(right && [right.reviewed_revision,Boolean(right.review_invalidated)]);
    if (added.length || removed.length || changed.length || noteChanged || reviewChanged || !left || !right) teeth.push({ number, added, removed, changed,
      before_note: left ? left.note : '', after_note: right ? right.note : '', note_changed: noteChanged, review_changed: reviewChanged, before_included: Boolean(left), after_included: Boolean(right) });
  }
  return { from: { id_chart: before.id_chart, revision: before.revision, status: before.status }, to: { id_chart: after.id_chart, revision: after.revision, status: after.status }, teeth };
}
module.exports = { compareSnapshots };
