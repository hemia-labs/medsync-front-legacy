import types from '../common/mutation-types';

const actions = {

    async ActionWrapper({dispatch}, {module, action, payload}) {
        // Execute only the user's explicit action. Do not retain a payload for
        // authentication recovery, including when this request finishes late.
        return dispatch(module + '/' + action, payload, {root: true});
    },

    async rollback({commit}) {
        // Compatibility for callers/state surviving an upgrade: discard, never replay.
        commit(types.SET_CURRENT_ACTION, null);
    }

}

export default actions;
