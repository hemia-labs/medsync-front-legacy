const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../../src/domain/appointments/agendaInteraction.js'), 'utf8');
module.exports = new Function('window', source.replace(/export function/g, 'function') + '\nreturn { newAgendaRequestId, clinicClock, appointmentPhone, isPastAppointment, pastCreationKey, patientSearchQueries };')({ crypto: crypto.webcrypto });
for (const [file,names] of [
  ['onboarding/context.js','guideContext, ONBOARDING'],
  ['appointments/writePolicy.js','CANCELLATION_REASONS, appointmentTemporalError, cancellationImpactMessage'],
  ['appointments/configRecovery.js','configIntent, responseFailure']
]) {
  const code=fs.readFileSync(path.join(__dirname,'../../src/domain',file),'utf8').replace(/export (function|const)/g,'$1');
  Object.assign(module.exports,new Function(code+`\nreturn {${names}};`)());
}
module.exports.OnboardingGuide={};

module.exports.PreparationGuide={};
module.exports.authorizationContext=()=>({});
module.exports.isCurrentAuthorization=()=>true;
const authorizationSource=fs.readFileSync(path.join(__dirname,'../../src/security/authorizationContext.js'),'utf8').replace(/export function/g,'function');
const authorization=new Function(authorizationSource+'\nreturn { authorizationContext, isCurrentAuthorization, invalidatePendingRequests };')();
const navigationSource=fs.readFileSync(path.join(__dirname,'../../src/domain/appointments/agendaNavigation.js'),'utf8').replace(/^import.*\r?\n/,'').replace(/export function/g,'function');
Object.assign(module.exports,new Function('authorizationContext','isCurrentAuthorization',navigationSource+'\nreturn { keepAgendaReturn, peekAgendaReturn, takeAgendaReturn, clearAgendaReturn, setAgendaCreatedPatient };')(authorization.authorizationContext,authorization.isCurrentAuthorization));

module.exports.AgendaLinkPatient = {};
