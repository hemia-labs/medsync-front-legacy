export function normalizePhoneForWhatsApp(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function buildWhatsAppSignatureMessage({ patientName, clinicName, expiresAt, publicUrl }) {
  const patient = patientName || 'paciente';
  const clinic = clinicName || 'El consultorio';
  const expiration = expiresAt || 'la fecha indicada';
  return `Hola ${patient}, ${clinic} te comparte un documento para revision y firma. El enlace vence el ${expiration}: ${publicUrl}`;
}

export function buildAppointmentWhatsAppMessage({ patientName, clinicName, date, time }) {
  const patient = patientName || 'paciente';
  const clinic = clinicName ? ` de ${clinicName}` : '';
  const appointmentDate = date ? ` del ${date}` : '';
  const appointmentTime = time ? ` a las ${time}` : '';
  return `Hola ${patient}, te contactamos${clinic} para confirmar tu cita${appointmentDate}${appointmentTime}. Nos confirmas tu asistencia?`;
}

export function buildWhatsAppUrl({ phone, text }) {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  if (!cleanPhone) {
    return '';
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text || '')}`;
}

export function openWhatsAppUrl(url) {
  if (!url) {
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
