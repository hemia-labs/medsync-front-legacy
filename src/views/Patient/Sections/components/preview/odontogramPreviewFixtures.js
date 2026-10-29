// CO26 visual fixtures only. Never pass patient IDs or connect services to this module.
export const dentitions = [
  { id: 'permanent', label: 'Permanente' },
  { id: 'primary', label: 'Temporal' },
  { id: 'mixed', label: 'Mixta' }
];
const range = (q, count, reverse = false) =>
  Array.from(
    { length: count },
    (_, i) => q * 10 + (reverse ? count - i : i + 1)
  );
export const rows = {
  upper: [...range(1, 8, true), ...range(2, 8)],
  lower: [...range(4, 8, true), ...range(3, 8)],
  primaryUpper: [...range(5, 5, true), ...range(6, 5)],
  primaryLower: [...range(8, 5, true), ...range(7, 5)]
};
export function sequence(mode) {
  const permanent = [...rows.upper, ...range(3, 8, true), ...range(4, 8)];
  const primary = [...rows.primaryUpper, ...range(7, 5, true), ...range(8, 5)];
  return mode === 'mixed'
    ? [...permanent, ...primary]
    : mode === 'primary'
    ? primary
    : permanent;
}
export const tools = [
  { code: 'car', label: 'Caries', kind: 'condition', surface: true },
  { code: 'fx', label: 'Fractura', kind: 'condition' },
  { code: 'rr', label: 'Restos radiculares', kind: 'condition' },
  { code: 'res', label: 'Resina', kind: 'restoration', surface: true },
  { code: 'a', label: 'Amalgama', kind: 'restoration', surface: true },
  { code: 'sel', label: 'Sellador', kind: 'restoration', surface: true },
  { code: 'cor', label: 'Corona', kind: 'restoration' },
  { code: 'endo', label: 'Endodoncia', kind: 'restoration' },
  { code: 'imp', label: 'Implante', kind: 'restoration' },
  { code: 'ext', label: 'Extracción indicada', kind: 'condition' },
  { code: 'aus', label: 'Ausente', kind: 'presence' },
  { code: 'ne', label: 'No erupcionado', kind: 'presence' }
];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export function finding(code, surfaces = '', indicated = false) {
  return {
    ...tools.find((t) => t.code === code),
    surfaces,
    indicated,
    id: 'demo-' + code + '-' + surfaces
  };
}
export function makeTeeth(populated = true) {
  const teeth = {};
  sequence('mixed').forEach((n) => {
    teeth[n] = { findings: [], reviewed: false, note: '' };
  });
  if (populated) {
    const examples = {
      18: [finding('aus')],
      17: [finding('res', 'O')],
      16: [finding('car', 'MO'), finding('res', 'D')],
      14: [finding('a', 'OD')],
      21: [finding('fx')],
      24: [finding('car', 'MO'), finding('endo', '', true)],
      26: [finding('cor')],
      36: [finding('car', 'OD')],
      38: [finding('ext')],
      46: [finding('imp'), finding('cor')],
      55: [finding('car', 'O')],
      65: [finding('res', 'O')],
      75: [finding('ne')]
    };
    Object.keys(examples).forEach((n) => {
      teeth[n].findings = examples[n];
    });
    [15, 13, 12, 17, 65].forEach((n) => {
      teeth[n].reviewed = true;
    });
    teeth[16].note = 'Nota ficticia previa: revisar contacto distal.';
  }
  return teeth;
}
export function toothName(n) {
  const q = Math.floor(n / 10),
    p = n % 10;
  const names =
    q > 4
      ? [
          'Incisivo central',
          'Incisivo lateral',
          'Canino',
          'Primer molar',
          'Segundo molar'
        ]
      : [
          'Incisivo central',
          'Incisivo lateral',
          'Canino',
          'Primer premolar',
          'Segundo premolar',
          'Primer molar',
          'Segundo molar',
          'Tercer molar'
        ];
  return names[p - 1];
}
export function position(n) {
  const q = Math.floor(n / 10);
  return (
    ([1, 2, 5, 6].includes(q) ? 'Superior' : 'Inferior') +
    ' ' +
    ([1, 4, 5, 8].includes(q) ? 'derecho' : 'izquierdo') +
    (q > 4 ? ' · temporal' : ' · permanente')
  );
}
export function surfaceLabel(s, n) {
  return s === 'O' && n % 10 <= 3
    ? 'I'
    : s === 'L' && [1, 2, 5, 6].includes(Math.floor(n / 10))
    ? 'P'
    : s;
}
export function tone(f) {
  return f.kind === 'presence'
    ? 'presence'
    : f.kind === 'condition' || f.indicated
    ? 'condition'
    : 'restoration';
}
