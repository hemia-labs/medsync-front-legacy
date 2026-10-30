const { sequence, anatomicalRange, normalizeSurfaces } = require('../../utils/odontogram/dentalContract');
// Parse the complete input before emitting any operation. No partially applied commands.
function parseCommand(text, selected, mode, catalog, aliases = {}, navigation = null) {
  const order = sequence(mode);
  const walk = navigation || order;
  if (walk.length !== order.length || new Set(walk).size !== order.length || walk.some(n => !order.includes(n))) throw Error('Recorrido inválido.');
  if (!text.trim()) return { ops: [], advance: true, targets: [selected], nextTooth: walk[(walk.indexOf(selected)+1)%walk.length] };
  const ops = [], targets = [];
  let advance = false, cursor = selected;
  for (const segment of text.toLowerCase().split(/[,;]/)) {
    const match = segment.trim().match(/^(?:(\d{2})(?:-(\d{2}))?\s+)?([a-záéíóú]+)(!)?(?:\s+([modvlpi?]+))?$/);
    if (!match) throw Error('Comando inválido. Ejemplo: 16 car mo, 18 aus.');
    const pieces = match[2] ? anatomicalRange(match[1], match[2], mode) : [match[1] ? Number(match[1]) : cursor];
    if (pieces.some(n => !order.includes(n))) throw Error('La pieza no pertenece a esta dentición.');
    const name = match[3].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const code = Object.prototype.hasOwnProperty.call(aliases, name) ? aliases[name] : ['sano','revisado'].includes(name) ? 'ok' : name;
    if (code === 'ok' || code === 'pres') {
      if (match[4] || match[5]) throw Error('Revisar no admite caras ni intención.');
      pieces.forEach(tooth => ops.push({ type: code === 'ok' ? 'tooth.review' : 'presence.correct', tooth })); advance = code === 'ok';
    } else {
      const tool = catalog.find(item => item.code === code);
      if (!tool) throw Error('Abreviatura desconocida.');
      if (match[4] && !['restoration','procedure'].includes(tool.kind)) throw Error('Este hallazgo no admite intención indicada.');
      if (tool.surface && !match[5]) throw Error('Indica caras o ?; no se asumirá una cara.');
      if (!tool.surface && match[5]) throw Error('Este hallazgo es de pieza completa.');
      const pending = match[5] === '?';
      const surfaces = tool.surface && !pending ? normalizeSurfaces(match[5]) : null;
      pieces.forEach(tooth => ops.push({ type: 'finding.add', tooth, code, intent: match[4] ? 'indicated' : tool.intent, surfaces, surface_pending: pending }));
      advance = tool.kind === 'presence';
    }
    targets.push(...pieces);
    const last = pieces[pieces.length-1];
    cursor = advance ? walk[(walk.indexOf(last)+1)%walk.length] : last;
  }
  if (ops.length > 100) throw Error('El comando supera 100 operaciones.');
  return { ops, targets, advance, nextTooth: cursor };
}
module.exports = { parseCommand };
