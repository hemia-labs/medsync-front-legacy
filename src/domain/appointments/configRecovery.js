// Compare the user's intent, never regenerated SQL range IDs or unrelated shared fields.
export function configIntent(config) {
  const range = value => ({startTime:value.startTime,endTime:value.endTime});
  const block = value => ({date:value.repeats ? '' : value.date,repeats:!!value.repeats,repeatType:value.repeats ? 'weekly' : 'none',dayOfWeek:value.repeats ? Number(value.dayOfWeek) : null,reason:value.reason || '',...(value.startTime ? range(value) : {})});
  const sorted = values => values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify({enabled:!!config.enabled,defaultAppointmentDuration:Number(config.defaultAppointmentDuration),
    workingDays:(config.workingDays || []).map(day=>({dayOfWeek:Number(day.dayOfWeek),enabled:!!day.enabled,timeRanges:sorted((day.timeRanges || []).map(range))})).sort((a,b)=>a.dayOfWeek-b.dayOfWeek),
    blockedDates:sorted((config.blockedDates || []).map(block)),blockedHours:sorted((config.blockedHours || []).map(block))});
}
export function responseFailure(response) {
  const error=new Error(response && response.message || 'No pudimos confirmar el guardado.');
  error.status=Number(response && response.status);return error;
}
