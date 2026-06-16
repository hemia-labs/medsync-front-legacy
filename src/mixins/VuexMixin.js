import { mapActions} from 'vuex';
import moduleTypes from '../store/modules/common/module-types';
import fnTypes from '../store/modules/common/fn-types';

export default {
    data: function() {
        return {

        }
    },

    methods: {

        ...mapActions(moduleTypes.CORE, [
            fnTypes.ActionWrapper
        ]),

        ActionWrapp: async function( module = null, action = null, payload = null) {
            return await this.ActionWrapper({module: module, action: action, payload: payload})
        }

        
    }
}
