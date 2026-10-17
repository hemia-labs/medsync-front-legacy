export const normalizePatientPhone = value => String(value || '').replace(/[()\s-]/g, '');
export const localDateString = (today = new Date()) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
export const patientAge = (value, today = new Date()) => {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
  const birth = new Date(`${value}T00:00:00`);
  if(!Number.isFinite(birth.getTime()) || localDateString(birth) !== value || value > localDateString(today)) return '';
  let age = today.getFullYear() - birth.getFullYear();
  if(today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age <= 150 ? age : '';
};

export const patientAdministrativeErrors = (form, today = new Date()) => {
  const errors = {};
  if(!String(form.name || '').trim()) errors.name = 'El nombre del paciente es obligatorio.';
  if(!String(form.firstSurname || '').trim()) errors.firstSurname = 'El apellido paterno es obligatorio.';
  if(!form.birthDate) errors.birthDate = 'La fecha de nacimiento es obligatoria.';
  else if(patientAge(form.birthDate, today) === '') errors.birthDate = 'Ingresa una fecha real, anterior o igual a hoy, con una edad de hasta 150 años.';
  if(!/^\d{10}$/.test(normalizePatientPhone(form.mobilePhone))) errors.mobilePhone = 'Ingresa un teléfono de contacto de 10 dígitos.';
  if(form.localPhone && !/^\d{10}$/.test(normalizePatientPhone(form.localPhone))) errors.localPhone = 'El teléfono local debe tener 10 dígitos.';
  if(form.postalCode && !/^\d{5}$/.test(String(form.postalCode))) errors.postalCode = 'El código postal debe tener 5 dígitos.';
  return errors;
};
