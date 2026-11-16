// Same device-local calendar as Home's greeting and clock. Bounds are inclusive,
// recur every year, and require no stored setting or server request.
// Single-day celebrations win over the longer season they fall inside.
export function getHomeSeason(date) {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 1 && day === 14) return 'valentine';
  if (month === 8 && (day === 15 || day === 16)) return 'independence';
  if (month === 9 && day === 23) return 'doctors-day';
  if ((month === 9 && day >= 20) || (month === 10 && day <= 3)) return 'day-of-dead';
  if (month === 11 || (month === 0 && day === 1)) return 'christmas';
  return 'normal';
}
