// Allowlisted drawing input. Never pass a snapshot or a clinical record to the engine.
import { AIZAWA_GEOMETRY, AIZAWA_POINTS } from './aizawaGeometry';
export const PARTICLE_COUNTS = [96, 192, 384];
export const PALETTE = ['#8abfff', '#74d5c3', '#b19cfa', '#f2bd79', '#f1a7cf'];
const categories = ['clear', 'attention', 'priority', 'no_obligations', 'not_evaluable'];
const category = value => categories.includes(value) ? value : 'not_evaluable';
const strengthByCategory = { priority: .72, attention: .38 };
export function visualModel(input = {}) {
  const source = Array.isArray(input.causes) ? input.causes : [];
  return {
    category: category(input.category),
    preparation: ['ready', 'blocked', 'unknown'].includes(input.preparationState) ? input.preparationState : 'unknown',
    uncertain: input.coverage !== 'complete',
    caution: ['attention', 'priority'].includes(input.lastKnownCaution) || input.archiveCaution === true,
    lastPriority: input.lastKnownCaution === 'priority',
    archive: input.archiveCaution === true,
    causes: ['PUL-OP01', 'PUL-OP02', 'PUL-OP03'].map(id => {
      const item = source.find(c => c && c.dimensionId === id) || {},
        state = category(item.category),
        known = item.freshness === 'fresh' && state !== 'not_evaluable',
        priority = known && (state === 'priority' || item.hasPriority === true),
        last = !known && ['priority', 'attention'].includes(item.lastKnownSeverity) ? item.lastKnownSeverity : null;
      return {
        strength: priority ? .72 : strengthByCategory[known ? state : last] || 0,
        priority,
        known
      };
    })
  };
}
const fraction = n => n - Math.floor(n);
export function makeStars() {
  const stars = new Float32Array(384 * 7);
  for (let i = 0; i < 384; i++) {
    const o = i * 7,
      r = fraction(Math.sin((i + 19) * 127.1) * 43758.5453);
    stars[o] = fraction(i * .61803398875) * Math.PI * 2;
    stars[o + 1] = i % 9 * Math.PI * 2 / 9 + stars[o] * 2 + (r - .5) * .12;
    stars[o + 2] = .35 + r * .65;
    stars[o + 3] = .7 + fraction(r * 19.73) * .6;
    stars[o + 4] = r * Math.PI * 2;
    stars[o + 5] = .55 + fraction(r * 13.11) * 1.1;
    stars[o + 6] = i % 3;
  }
  return stars;
}
// One precomputed Aizawa-inspired volume. Mathematical complexity is decorative;
// only the independent, screen-stable causal field adds operational disturbance.
export function orbitPoint(theta, phi, time, width, height, strengths, causes, out, o = 0) {
  const at = fraction(theta / (Math.PI * 2) + time * .009) * AIZAWA_POINTS,
    index = Math.floor(at), mix = at - index, next = (index + 1) % AIZAWA_POINTS,
    x = AIZAWA_GEOMETRY[index * 3] * (1 - mix) + AIZAWA_GEOMETRY[next * 3] * mix,
    y = AIZAWA_GEOMETRY[index * 3 + 1] * (1 - mix) + AIZAWA_GEOMETRY[next * 3 + 1] * mix,
    z = AIZAWA_GEOMETRY[index * 3 + 2] * (1 - mix) + AIZAWA_GEOMETRY[next * 3 + 2] * mix,
    yaw = .4 + time * .018, cosine = Math.cos(yaw), sine = Math.sin(yaw),
    horizontal = x * cosine + y * sine, away = -x * sine + y * cosine,
    vertical = z * 1.18 - away * .58, depth = away * .82 + z * .4,
    perspective = 1 / (1 + depth * .16),
    px = (horizontal * .94 + vertical * .34) * perspective,
    py = (horizontal * .34 - vertical * .94) * perspective,
    angle = Math.atan2(py / .8, px) + .18,
    radial = Math.min(1, Math.hypot(px, py) / .35);
  let force = 0, priority = 0;
  for (let c = 0; c < 3; c++) {
    const influence = Math.exp((Math.cos(angle - c * Math.PI * 2 / 3) - 1) * 7) * strengths[c] * radial;
    force += influence;
    if (causes[c].priority) priority += influence;
  }
  force = Math.min(.85, force);
  // Continuous, deterministic lanes lose coordination only inside the causal sector.
  // Squared force makes priority visibly separate from attention, without a volume score.
  const layer = Math.sin(phi) * .008,
    radius = Math.max(.2, Math.hypot(px, py)), nx = px / radius, ny = py / radius,
    disorder = force * force,
    lane = Math.sin(theta * 13 + phi * .6 + time * (.48 + .16 * Math.sin(theta * 3))),
    drift = Math.sin(theta * 7 - time * (1.05 + .35 * Math.cos(theta * 5))),
    spread = .18 + .21 * lane,
    turbulentX = force * (.12 * px + .085 * Math.sin(theta * 7 + time * .7)) + disorder * (nx * spread - ny * .34 * drift),
    turbulentY = force * (.12 * py + .085 * Math.cos(theta * 9 - time * .65)) + disorder * (ny * spread + nx * .34 * drift);
  out[o] = width * (.5 + (px + layer + turbulentX) * .33);
  out[o + 1] = height * (.51 + (py + layer + turbulentY) * .43);
  out[o + 2] = .8 + (depth + 1) * .4;
  out[o + 3] = .28 + (depth + 1) * .25;
  out[o + 4] = force;
  out[o + 5] = force > .09 ? priority > .08 ? 4 : 3 : 0;
}
export function position(stars, i, time, width, height, strengths, causes, points) {
  const s = i * 7, o = i * 6;
  orbitPoint(stars[s], stars[s + 1] + time * .16, time, width, height, strengths, causes, points, o);
  points[o + 2] *= stars[s + 5];
  points[o + 3] *= .7 + stars[s + 2] * .3;
  if (points[o + 4] <= .09) points[o + 5] = stars[s + 6];
}
export const FILAMENTS = 12;
export const FILAMENT_STEPS = 128;
export function filamentPoints(model, time, width, height, strengths, points) {
  for (let j = 0; j < FILAMENTS; j++) for (let i = 0; i <= FILAMENT_STEPS; i++) {
    const theta = (j + i / FILAMENT_STEPS) / FILAMENTS * Math.PI * 2;
    orbitPoint(theta, 0, time, width, height, strengths, model.causes, points, (j * (FILAMENT_STEPS + 1) + i) * 6);
  }
  return points;
}
export function staticFilaments(model, time = 0, warmOnly = false) {
  const points = filamentPoints(model, time, 1000, 440, model.causes.map(c => c.strength), new Float32Array(FILAMENTS * (FILAMENT_STEPS + 1) * 6));
  return Array.from({ length: FILAMENTS }, (_, j) => {
    let connected = false;
    return Array.from({ length: FILAMENT_STEPS + 1 }, (_, i) => {
      const o = (j * (FILAMENT_STEPS + 1) + i) * 6;
      if (warmOnly && points[o + 4] <= .09) { connected = false; return ''; }
      const command = connected ? 'L' : 'M'; connected = true;
      return command + points[o].toFixed(2) + ' ' + points[o + 1].toFixed(2);
    }).join(' ');
  });
}
export function priorityPoints(model, width = 1000, height = 440) {
  return signalPoints(model, width, height).filter(p => p.priority);
}
export function signalPoints(model, width = 1000, height = 440) {
  return model.causes.map((cause, i) => {
    // Stable UI anchors: never move a keyboard/touch target on every frame.
    const angle = i * Math.PI * 2 / 3 - .18, x = Math.cos(angle) * .95, y = Math.sin(angle) * .95 * .8;
    return { index: i, x: width * (.5 + x * .33), y: height * (.51 + y * .43), priority: cause.priority, visible: cause.known && cause.strength > 0 };
  }).filter(p => p.visible);
}
export function staticStars(model, time = 0) {
  const seeds = makeStars(),
    points = new Float32Array(96 * 6),
    strengths = model.causes.map(c => c.strength);
  for (let i = 0; i < 96; i++) position(seeds, i, time, 1000, 440, strengths, model.causes, points);
  return Array.from({
    length: 96
  }, (_, i) => ({
    id: i,
    x: points[i * 6],
    y: points[i * 6 + 1],
    r: points[i * 6 + 2],
    alpha: points[i * 6 + 3],
    color: PALETTE[points[i * 6 + 5]]
  }));
}
