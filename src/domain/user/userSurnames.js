// NC1 identidad simple — users and registration: Nombre(s), Primer apellido, Segundo apellido.
// `last_name` is the joined surnames and travels too, so a server without the change keeps working
// (the new server checks it matches). Existing accounts whose surnames were never separated keep their
// stored `last_name` untouched until someone types a surname: nothing is split by spaces.

const clean = value => (typeof value === 'string' ? value.trim() : '');
export const joinSurnames = (first, second) => [clean(first), clean(second)].filter(Boolean).join(' ');

// Separate surnames are in use when they were stored before or the user typed one now.
export const capturesSurnames = (user, storedStructured = false) => storedStructured || Boolean(clean(user.first_surname) || clean(user.second_surname));

export function surnameErrors(user, { storedStructured = false, requireFirst = false } = {}) {
  const errors = {};
  if (!capturesSurnames(user, storedStructured)) return errors;
  if (requireFirst && !clean(user.first_surname)) errors.first_surname = 'Escribe el primer apellido.';
  else if (!clean(user.first_surname) && !clean(user.second_surname)) errors.first_surname = 'Registra al menos un apellido.';
  if ([clean(user.first_surname), clean(user.second_surname)].some(value => [...value].length > 200)) errors.first_surname = 'Cada apellido admite hasta 200 caracteres.';
  if ([...clean(user.first_name), ' ', ...joinSurnames(user.first_surname, user.second_surname)].length > 200) errors.first_surname = 'El nombre y los apellidos deben sumar hasta 200 caracteres.';
  return errors;
}

// Builds the names of a user payload. Untouched historical surnames are left exactly as stored.
export function userNamesPayload(user, { storedStructured = false } = {}) {
  const payload = { ...user, first_name: clean(user.first_name) };
  if (!capturesSurnames(user, storedStructured)) {
    delete payload.first_surname; delete payload.second_surname;
    return payload;
  }
  payload.first_surname = clean(user.first_surname) || null;
  payload.second_surname = clean(user.second_surname) || null;
  payload.last_name = joinSurnames(user.first_surname, user.second_surname);
  return payload;
}
