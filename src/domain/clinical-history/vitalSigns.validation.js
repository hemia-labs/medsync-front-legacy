export const vitalSignMetadata = {
  blood_pressure: { label: 'Presión arterial', unit: 'mmHg', hint: 'Milímetros de mercurio. Ejemplo: 120/80.' },
  heart_rate: { label: 'Frecuencia cardiaca', unit: 'latidos/min', hint: 'Latidos por minuto. Ejemplo: 72.' },
  respiratory_rate: { label: 'Frecuencia respiratoria', unit: 'respiraciones/min', hint: 'Respiraciones por minuto. Ejemplo: 16.' },
  temperature: { label: 'Temperatura', unit: '°C', hint: 'Grados Celsius. Ejemplo: 36.5.' },
  oxygen_saturation: { label: 'Saturación de oxígeno', unit: '%', hint: 'Porcentaje de 0 a 100. Ejemplo: 98.' },
  weight: { label: 'Peso', unit: 'kg', hint: 'Kilogramos. Ejemplo: 70.5.' },
  height: { label: 'Talla', unit: 'cm', hint: 'Centímetros. Ejemplo: 170.' },
  bmi: { label: 'IMC', unit: 'kg/m²', hint: 'Kilogramos por metro cuadrado; calculado con peso en kg y talla en cm.' }
};

// Older captures accepted metres or centimetres without a unit marker. Keep the
// same interpretation for those records; new edits explicitly store centimetres.
export const heightInCm = (value, unit) => {
  if(value === '' || value === null || value === undefined) return value;
  const number = Number(String(value).replace(',', '.'));
  if(!Number.isFinite(number)) return value;
  return unit === 'm' || (!unit && number > 0 && number <= 3) ? Number((number * 100).toFixed(6)) : value;
};

export const vitalSignError = (key, value) => {
  if(value === '' || value === undefined || value === null || !vitalSignMetadata[key]) return '';
  if(typeof value !== 'string' && typeof value !== 'number') return 'Ingresa un número igual o mayor que cero, sin letras.';
  const text = String(value).trim();
  if(key === 'blood_pressure') return /^\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?$/.test(text) ? '' : 'Usa sistólica/diastólica en mmHg, por ejemplo 120/80.';
  if(!/^\d+(?:[.,]\d+)?$/.test(text) || !Number.isFinite(Number(text.replace(',', '.')))) return 'Ingresa un número igual o mayor que cero, sin letras.';
  if(key === 'oxygen_saturation' && Number(text.replace(',', '.')) > 100) return 'La saturación debe estar entre 0 y 100 %.';
  return '';
};

export const vitalSignErrors = snapshot => Object.entries((snapshot || {}).vital_signs || {}).reduce((errors, [fieldKey, value]) => {
  const message = vitalSignError(fieldKey, value);
  if(message) errors.push({ key: `vital_signs-${fieldKey}`, sectionKey: 'vital_signs', fieldKey, sectionLabel: 'Signos vitales', fieldLabel: vitalSignMetadata[fieldKey].label, message });
  return errors;
}, []);
