import Vue from 'vue';
import Vuex from 'vuex';
import CORE from './modules/core/index';

Vue.use(Vuex)

function cloneState(value, seen = new WeakMap()) {
    if(value === null || typeof value !== 'object') return value;
    if(value instanceof Date) return new Date(value.getTime());
    if(seen.has(value)) return seen.get(value);
    const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, copy);
    Object.keys(value).forEach(key => { copy[key] = cloneState(value[key], seen); });
    return copy;
}

function initialModuleState(definition) {
    const state = cloneState(typeof definition.state === 'function' ? definition.state() : (definition.state || {}));
    Object.entries(definition.modules || {}).forEach(([key, child]) => { state[key] = initialModuleState(child); });
    return state;
}

// Snapshot before Vuex can mutate imported object states. Each reset gets an
// independent deep copy, including nested arrays and model instances.
const protectedInitialState = Object.fromEntries(Object.entries(CORE.modules)
    .filter(([key]) => key !== 'AUTH')
    .map(([key, definition]) => [key, initialModuleState(definition)]));

const store = new Vuex.Store({
    state: {
      
    },
    mutations: {
      RESET_PROTECTED_STATE(state) {
        Object.entries(protectedInitialState).forEach(([key, initialState]) => {
          Vue.set(state.CORE, key, cloneState(initialState));
        });
        state.CORE.currentAction = null;
      }
    },
    actions: {
    },
    modules: {
      CORE
    }
  })

let accessRevision = store.state.CORE.AUTH.accessRevision || 0;
store.subscribe(() => {
  const current = store.state.CORE.AUTH.accessRevision || 0;
  if(current !== accessRevision) {
    accessRevision = current;
    store.commit('RESET_PROTECTED_STATE');
  }
});

export default store;
