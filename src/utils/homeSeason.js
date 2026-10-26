// Same device-local calendar as Home's greeting and clock. Bounds are inclusive,
// recur every year, and require no stored setting or server request.
export function getHomeSeason(date) {
  const month = date.getMonth();
  const day = date.getDate();
  if ((month === 9 && day >= 20) || (month === 10 && day <= 3)) return 'day-of-dead';
  if (month === 11 || (month === 0 && day === 1)) return 'christmas';
  return 'normal';
}
