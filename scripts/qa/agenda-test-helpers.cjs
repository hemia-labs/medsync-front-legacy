const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../../src/domain/appointments/agendaInteraction.js'), 'utf8');
module.exports = new Function('window', source.replace(/export function/g, 'function') + '\nreturn { newAgendaRequestId, clinicClock, appointmentPhone };')({ crypto: crypto.webcrypto });
