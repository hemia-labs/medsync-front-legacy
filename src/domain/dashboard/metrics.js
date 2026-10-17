// An unavailable metric is different from a measured zero.
export function metricNumber(value) {
  if(value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatMetric(value, options = {}) {
  const number = metricNumber(value);
  return number === null ? 'No disponible' : number.toLocaleString('es-MX', options);
}

export function sumMetric(items, key) {
  if(!items.length || items.some(item => metricNumber(item[key]) === null)) return null;
  return items.reduce((total, item) => total + metricNumber(item[key]), 0);
}

export function hasMetric(source, key) {
  return Boolean(source && Object.prototype.hasOwnProperty.call(source, key));
}
