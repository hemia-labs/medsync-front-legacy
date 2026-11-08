const initial = () => ({ context: '', applied: null, candidate: null, history: null, returnTarget: null, savedAt: null, pendingAppointment: null, appointmentOutcome: null, session: null, clock: null, errors: { snapshot: '', history: '', list: '' }, denied: false });
export default {
  namespaced: true, state: initial,
  mutations: {
    reset(state, context = '') { Object.assign(state, initial(), { context }); },
    applied(state, value) { state.applied = value; state.candidate = null; state.denied = false; state.errors.snapshot = ''; if(state.savedAt && !value.snapshot.refreshPending && Date.parse(value.snapshot.calculatedAt) >= state.savedAt) state.savedAt = null; },
    candidate(state, value) { state.candidate = value; },
    history(state, value) { state.history = value; state.errors.history = ''; },
    clock(state, value) { state.clock = value; },
    error(state, { block, message }) { state.errors[block] = message; },
    denied(state) { Object.assign(state, initial(), { context: state.context, denied: true }); },
    returnTarget(state, value) { state.returnTarget = value; state.savedAt = null; state.pendingAppointment = null; state.appointmentOutcome = null; },
    saved(state, time) { state.savedAt = time; state.candidate = null; state.pendingAppointment = null; state.appointmentOutcome = null; },
    appointmentSaved(state, value) { state.pendingAppointment = value; },
    session(state, value) { state.session = value; },
    appointmentOutcome(state, value) { state.appointmentOutcome = value; if (value && value.kind === 'verified') state.pendingAppointment = null; }
  }
};
