import DACurrentActionModel from '../../../models/actions/DACurrentActionModel';
import types from '../common/mutation-types';

const actions = {

    async ActionWrapper({commit, dispatch}, {module, action, payload}) {
        const response = await dispatch(module + '/' + action, payload, {root: true} )
        commit(types.SET_CURRENT_ACTION, new DACurrentActionModel(module, action, payload));
        return response;
    },

    async rollback({state, commit, dispatch}) {

        if(state.currentAction && (state.currentAction.module && state.currentAction.action)) {
            dispatch('ActionWrapper', {module: state.currentAction.module, action: state.currentAction.action, payload: state.currentAction.payload})
            commit(types.SET_CURRENT_ACTION, new DACurrentActionModel())
        }
       
    }

}

export default actions;
