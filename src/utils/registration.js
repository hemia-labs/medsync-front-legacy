export const LEGAL_KEYS = ['terms_conditions', 'privacy_notice'];
export function usableRegistrationContext(context) {
  return Boolean(context && context.enabled && Array.isArray(context.legalDocuments)
    && LEGAL_KEYS.every(key => context.legalDocuments.filter(doc => doc.documentKey === key
      && doc.versionId && doc.contentHash && doc.title && doc.contentHtml).length === 1));
}
export function registrationAttemptId() {
  // No Math.random fallback: this ID stays only in component memory.
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function validRegistrationEmail(value) {
  return value.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value);
}
export function registrationErrors(form) {
  const errors = {};
  for (const field of ['name', 'businessName']) {
    if (!form[field].trim() || [...form[field].trim()].length > 200) errors[field] = 'Escribe un nombre de hasta 200 caracteres.';
  }
  if (!/^[0-9]{10}$/.test(form.telephone.trim())) errors.telephone = 'Escribe los 10 dígitos de tu teléfono, sin +52.';
  if (!validRegistrationEmail(form.email.trim())) errors.email = 'Escribe un correo válido de hasta 254 caracteres.';
  const password = form.password.normalize('NFC');
  if ([...password].length < 15 || [...password].length > 128 || new TextEncoder().encode(password).length > 512) {
    errors.password = 'Usa entre 15 y 128 caracteres. Puedes incluir espacios.';
  }
  return errors;
}
export function isPendingActivation(tenant, business) {
  return Boolean((tenant && (tenant.reasonCode === 'ACCOUNT_PENDING_ACTIVATION' || tenant.tenantStatus === 'pending_activation'))
    || (business && business.subscriptionStatus === 'pending_activation'));
}
export function registrationErrorMessage(error) {
  const messages = {
    INVALID_REGISTRATION: 'Revisa los datos y vuelve a intentarlo.',
    REGISTRATION_NOT_COMPLETED: 'No pudimos completar el registro. Si ya tienes una cuenta, inicia sesión o recupera tu acceso desde el login.',
    PASSWORD_COMPROMISED: 'Esta contraseña aparece en listas de contraseñas conocidas. Elige otra frase o contraseña.',
    LEGAL_VERSION_CHANGED: 'Los documentos cambiaron. Revisa y acepta las versiones actualizadas para continuar.',
    IDEMPOTENCY_CONFLICT: 'Este intento ya se procesó con otros datos. Inicia sesión con los datos que enviaste originalmente.',
    IDEMPOTENCY_EXPIRED: 'El intento venció. Intenta iniciar sesión antes de comenzar otro registro.',
    REGISTRATION_ATTEMPT_INVALID: 'El intento de registro venció. Recarga la página; si ya enviaste tus datos, intenta iniciar sesión primero.',
    ACCOUNT_ALREADY_AUTHENTICATED: 'Ya hay una sesión abierta. Continúa con esa cuenta o cierra la sesión para crear otra.',
    REGISTRATION_RATE_LIMITED: 'Has realizado varios intentos. Espera el tiempo indicado antes de volver a intentar.',
    CONTACT_CODE_INVALID: 'El código no es válido o ya venció. Revísalo o solicita uno nuevo.',
    CONTACT_PROVIDER_UNAVAILABLE: 'No pudimos enviar el correo. Intenta enviarlo nuevamente en unos momentos.',
    CONTACT_REAUTHENTICATION_REQUIRED: 'Este correo ya está verificado. Actualiza el estado de tu cuenta.',
    CONTACT_ALREADY_VERIFIED: 'Tu correo ya está verificado. Actualiza el estado para continuar.',
    CONTACT_CHANGED: 'El correo cambió. Actualiza el estado y solicita un código nuevo.',
    CONTACT_RESERVATION_LOST: 'No pudimos guardar ese contacto. Revisa el correo e intenta nuevamente.',
    CSRF_FORBIDDEN: 'No se pudo validar la solicitud segura. Vuelve a intentarlo.',
    AUTH_CONTEXT_CHANGED: 'La sesión cambió. Inicia sesión de nuevo para continuar con tu cuenta.',
    AUTH_REQUIRED: 'Tu sesión terminó. Inicia sesión para continuar.',
    REGISTRATION_UNAVAILABLE: 'El servicio no está disponible por el momento. Conservamos los datos en esta pantalla para que puedas reintentar.',
    LEGAL_UNAVAILABLE: 'Los documentos legales no están disponibles. Intenta nuevamente en unos momentos.'
  };
  return messages[error.code] || 'No pudimos confirmar el resultado. Puedes reintentar; si ya creaste tu cuenta, inicia sesión con tu teléfono y contraseña.';
}
