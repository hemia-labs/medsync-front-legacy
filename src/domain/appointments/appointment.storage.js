const CONFIG_KEY = 'da_appointment_config';
const APPOINTMENTS_KEY = 'da_appointments';

export const APPOINTMENT_STATUSES = {
  AVAILABLE: 'available',
  BLOCKED: 'blocked',
  OUTSIDE_WORKING_HOURS: 'outside_working_hours',
  PENDING: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show'
};

export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUSES.AVAILABLE]: 'Disponible',
  [APPOINTMENT_STATUSES.BLOCKED]: 'Bloqueado',
  [APPOINTMENT_STATUSES.OUTSIDE_WORKING_HOURS]: 'Fuera de horario',
  [APPOINTMENT_STATUSES.PENDING]: 'Pendiente de confirmar',
  [APPOINTMENT_STATUSES.CONFIRMED]: 'Confirmada',
  [APPOINTMENT_STATUSES.CANCELLED]: 'Cancelada',
  [APPOINTMENT_STATUSES.COMPLETED]: 'Completada',
  [APPOINTMENT_STATUSES.RESCHEDULED]: 'Reprogramada',
  [APPOINTMENT_STATUSES.NO_SHOW]: 'No asistio'
};

export const APPOINTMENT_STATUS_COLORS = {
  [APPOINTMENT_STATUSES.AVAILABLE]: { bg: '#DFF7E8', text: '#146C43', border: '#8AD6A6' },
  [APPOINTMENT_STATUSES.BLOCKED]: { bg: '#EEF0F2', text: '#5D6670', border: '#D5D9DE' },
  [APPOINTMENT_STATUSES.OUTSIDE_WORKING_HOURS]: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
  [APPOINTMENT_STATUSES.PENDING]: { bg: '#FFF3CD', text: '#8A5A00', border: '#FFD972' },
  [APPOINTMENT_STATUSES.CONFIRMED]: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  [APPOINTMENT_STATUSES.CANCELLED]: { bg: '#FDE2E2', text: '#B42318', border: '#F8B4B4' },
  [APPOINTMENT_STATUSES.COMPLETED]: { bg: '#CDEED6', text: '#0F5132', border: '#7CCB91' },
  [APPOINTMENT_STATUSES.RESCHEDULED]: { bg: '#EFE3FF', text: '#6D28D9', border: '#C4A5FD' },
  [APPOINTMENT_STATUSES.NO_SHOW]: { bg: '#FFE8CC', text: '#9A3412', border: '#FDBA74' }
};

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: APPOINTMENT_STATUSES.PENDING, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.PENDING] },
  { value: APPOINTMENT_STATUSES.CONFIRMED, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.CONFIRMED] },
  { value: APPOINTMENT_STATUSES.CANCELLED, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.CANCELLED] },
  { value: APPOINTMENT_STATUSES.COMPLETED, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.COMPLETED] },
  { value: APPOINTMENT_STATUSES.RESCHEDULED, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.RESCHEDULED] },
  { value: APPOINTMENT_STATUSES.NO_SHOW, text: APPOINTMENT_STATUS_LABELS[APPOINTMENT_STATUSES.NO_SHOW] }
];

export const APPOINTMENT_BLOCKING_STATUSES = [
  APPOINTMENT_STATUSES.PENDING,
  APPOINTMENT_STATUSES.CONFIRMED,
  APPOINTMENT_STATUSES.COMPLETED
];

export const WEEK_DAYS = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miercoles', short: 'Mie' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sabado', short: 'Sab' },
  { value: 0, label: 'Domingo', short: 'Dom' }
];

export function createDefaultAppointmentConfig() {
  return {
    id: 'default',
    enabled: true,
    defaultAppointmentDuration: 30,
    timezone: 'America/Mexico_City',
    workingDays: WEEK_DAYS.map((day) => ({
      id: `day-${day.value}`,
      dayOfWeek: day.value,
      enabled: day.value >= 1 && day.value <= 5,
      timeRanges: day.value >= 1 && day.value <= 5
        ? [
          { id: `range-${day.value}-1`, startTime: '08:00', endTime: '12:00' },
          { id: `range-${day.value}-2`, startTime: '14:00', endTime: '20:00' }
        ]
        : []
    })),
    blockedDates: [],
    blockedHours: [],
    updatedAt: new Date().toISOString()
  };
}

export function getAppointmentConfig() {
  const storedConfig = window.localStorage.getItem(CONFIG_KEY);
  if (!storedConfig) {
    return createDefaultAppointmentConfig();
  }

  try {
    return normalizeAppointmentConfig(Object.assign(createDefaultAppointmentConfig(), JSON.parse(storedConfig)));
  } catch (error) {
    return createDefaultAppointmentConfig();
  }
}

export function saveAppointmentConfig(config) {
  const nextConfig = Object.assign({}, normalizeAppointmentConfig(config), { updatedAt: new Date().toISOString() });
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig));
  return nextConfig;
}

export function normalizeAppointmentConfig(config) {
  const defaultConfig = createDefaultAppointmentConfig();
  const nextConfig = Object.assign({}, defaultConfig, config || {});
  nextConfig.enabled = nextConfig.enabled === true || nextConfig.enabled === 1 || nextConfig.enabled === '1';
  nextConfig.defaultAppointmentDuration = Number(nextConfig.defaultAppointmentDuration || 30);
  nextConfig.workingDays = nextConfig.workingDays && nextConfig.workingDays.length > 0
    ? nextConfig.workingDays
    : defaultConfig.workingDays;

  nextConfig.workingDays = nextConfig.workingDays.map((day) => Object.assign({}, day, {
    dayOfWeek: Number(day.dayOfWeek),
    enabled: day.enabled === true || day.enabled === 1 || day.enabled === '1',
    timeRanges: day.timeRanges || []
  }));

  nextConfig.blockedDates = (nextConfig.blockedDates || []).map((block) => Object.assign({}, block, {
    repeats: block.repeats === true || block.repeats === 1 || block.repeats === '1',
    dayOfWeek: block.dayOfWeek === null || block.dayOfWeek === undefined || block.dayOfWeek === '' ? null : Number(block.dayOfWeek)
  }));

  nextConfig.blockedHours = (nextConfig.blockedHours || []).map((block) => Object.assign({}, block, {
    repeats: block.repeats === true || block.repeats === 1 || block.repeats === '1',
    dayOfWeek: block.dayOfWeek === null || block.dayOfWeek === undefined || block.dayOfWeek === '' ? null : Number(block.dayOfWeek)
  }));

  return nextConfig;
}

export function getAppointments() {
  const storedAppointments = window.localStorage.getItem(APPOINTMENTS_KEY);
  if (!storedAppointments) {
    return [];
  }

  try {
    return JSON.parse(storedAppointments);
  } catch (error) {
    return [];
  }
}

export function saveAppointments(appointments) {
  window.localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments || []));
  return appointments || [];
}

export function upsertAppointment(appointment) {
  const appointments = getAppointments();
  const nextAppointment = Object.assign({}, appointment, {
    id: appointment.id || createId('apt'),
    blocksAvailability: appointmentBlocksAvailability(appointment.status),
    updatedAt: new Date().toISOString(),
    createdAt: appointment.createdAt || new Date().toISOString()
  });

  const index = appointments.findIndex((item) => item.id === nextAppointment.id);
  if (index >= 0) {
    appointments.splice(index, 1, nextAppointment);
  } else {
    appointments.push(nextAppointment);
  }

  saveAppointments(appointments);
  return nextAppointment;
}

export function removeAppointment(id) {
  saveAppointments(getAppointments().filter((appointment) => appointment.id !== id));
}

export function appointmentBlocksAvailability(status) {
  return APPOINTMENT_BLOCKING_STATUSES.includes(status);
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
