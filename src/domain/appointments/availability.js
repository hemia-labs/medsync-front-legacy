import {
  APPOINTMENT_STATUSES,
  appointmentBlocksAvailability
} from './appointment.storage';

const APPOINTMENT_NON_BLOCKING_STATUSES = [
  APPOINTMENT_STATUSES.CANCELLED,
  APPOINTMENT_STATUSES.RESCHEDULED,
  APPOINTMENT_STATUSES.NO_SHOW
];

export function toIsoDate(date) {
  if (!date) {
    return '';
  }

  if (typeof date === 'string') {
    if (date.includes('-') && date.length >= 10) {
      const parts = date.slice(0, 10).split('-');
      if (parts[0].length === 4) {
        return date.slice(0, 10);
      }
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date) {
  const isoDate = toIsoDate(date);
  if (!isoDate) {
    return '';
  }

  const parts = isoDate.split('-');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function getDayOfWeek(date) {
  const isoDate = toIsoDate(date);
  const safeDate = new Date(`${isoDate}T00:00:00`);
  return safeDate.getDay();
}

export function addDays(date, days) {
  const isoDate = toIsoDate(date);
  const safeDate = new Date(`${isoDate}T00:00:00`);
  safeDate.setDate(safeDate.getDate() + days);
  return toIsoDate(safeDate);
}

export function getWeekDates(date) {
  const isoDate = toIsoDate(date);
  const safeDate = new Date(`${isoDate}T00:00:00`);
  const day = safeDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(isoDate, mondayOffset);
  return Array.from({ length: 7 }).map((_, index) => addDays(monday, index));
}

export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeToMinutes(time) {
  const parts = String(time || '00:00').split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

export function addMinutesToTime(time, minutes) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function rangesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function getDayWorkingConfig(config, date) {
  const dayOfWeek = getDayOfWeek(date);
  return (config.workingDays || []).find((day) => Number(day.dayOfWeek) === Number(dayOfWeek));
}

export function isDateBlocked(config, date) {
  const isoDate = toIsoDate(date);
  const dayOfWeek = getDayOfWeek(date);

  return [...(config.blockedDates || []), ...(config.businessBlockedDates || [])].some((block) => {
    if (block.repeats && block.repeatType === 'weekly') {
      return Number(block.dayOfWeek) === Number(dayOfWeek);
    }

    return toIsoDate(block.date) === isoDate;
  });
}

export function getHourBlocksForDate(config, date) {
  const isoDate = toIsoDate(date);
  const dayOfWeek = getDayOfWeek(date);

  return [...(config.blockedHours || []), ...(config.businessBlockedHours || [])].filter((block) => {
    if (block.repeats && block.repeatType === 'weekly') {
      return Number(block.dayOfWeek) === Number(dayOfWeek);
    }

    return toIsoDate(block.date) === isoDate;
  });
}

export function generateDaySlots(date, config, appointments) {
  const isoDate = toIsoDate(date);
  const duration = Number(config.defaultAppointmentDuration || 30);
  const dayConfig = getDayWorkingConfig(config, isoDate);

  if (!config.enabled || config.businessEnabled === false || !dayConfig || !dayConfig.enabled || isDateBlocked(config, isoDate)) {
    return [];
  }

  const dayAppointments = (appointments || []).filter((appointment) => toIsoDate(appointment.date) === isoDate);
  const hourBlocks = getHourBlocksForDate(config, isoDate);
  const slots = [];

  (dayConfig.timeRanges || []).forEach((range) => {
    let cursor = timeToMinutes(range.startTime);
    const rangeEnd = timeToMinutes(range.endTime);

    while (cursor + duration <= rangeEnd) {
      const startTime = minutesToTime(cursor);
      const endTime = minutesToTime(cursor + duration);
      const blockingAppointment = dayAppointments.find((appointment) => {
        return appointmentBlocksSlot(appointment) && rangesOverlap(startTime, endTime, appointment.startTime, appointment.endTime);
      });
      const historicalAppointment = dayAppointments.find((appointment) => {
        return !appointmentBlocksSlot(appointment) && appointment.startTime === startTime;
      });
      const blockedHour = hourBlocks.find((block) => rangesOverlap(startTime, endTime, block.startTime, block.endTime));

      if (blockingAppointment) {
        slots.push(createSlot(isoDate, startTime, endTime, blockingAppointment.status, false, blockingAppointment));
      } else if (blockedHour) {
        slots.push(Object.assign(createSlot(isoDate, startTime, endTime, APPOINTMENT_STATUSES.BLOCKED, false), {
          reason: blockedHour.reason || 'Horario bloqueado'
        }));
      } else {
        slots.push(Object.assign(createSlot(isoDate, startTime, endTime, APPOINTMENT_STATUSES.AVAILABLE, true), {
          historicalAppointment: historicalAppointment || null
        }));
      }

      cursor += duration;
    }
  });

  return slots;
}

export function appointmentBlocksSlot(appointment) {
  if (!appointment) {
    return false;
  }

  if (APPOINTMENT_NON_BLOCKING_STATUSES.includes(appointment.status)) {
    return false;
  }

  if (appointmentBlocksAvailability(appointment.status)) {
    return true;
  }

  return appointment.blocksAvailability === true || appointment.blocksAvailability === 1 || appointment.blocksAvailability === '1';
}

export function getAvailableSlots(date, config, appointments) {
  return generateDaySlots(date, config, appointments).filter((slot) => slot.selectable);
}

export function validateAppointmentSlot(appointment, config, appointments) {
  const date = toIsoDate(appointment.date);
  const slots = generateDaySlots(date, config, appointments || []);
  const slot = slots.find((item) => item.startTime === appointment.startTime);

  if (!slot) {
    return { valid: false, message: 'El horario seleccionado esta fuera de la agenda.' };
  }

  if (!slot.selectable && slot.appointmentId !== appointment.id) {
    return { valid: false, message: 'Este horario ya esta ocupado o bloqueado.' };
  }

  return { valid: true, message: '' };
}

function createSlot(date, startTime, endTime, status, selectable, appointment) {
  return {
    date,
    time: startTime,
    startTime,
    endTime,
    status,
    selectable,
    appointmentId: appointment ? appointment.id : null,
    appointment: appointment || null
  };
}
