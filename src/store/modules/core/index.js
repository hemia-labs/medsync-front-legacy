import PULSE from '../pulse';
import ONBOARDING from '../onboarding';
import AUTH         from "../auth/index"
import USER         from "../user/index"
import CATALOGS     from "../catalogs/index"
import HOME         from "../home/index"
import DASHBOARD    from "../dashboard/index"
import PX           from "../px/index"
import PHOTO        from "../photo/index"
import MONITORING   from "../monitoring/index"
import ODONTOGRAM   from "../odontogram/index"
import TREATMENT    from "../treatment/index"
import CONFIGURATION       from "../configuration/index"
import PRESCRIPTION       from "../prescription/index"
import state        from "./state"
import actions      from "./actions"
import getters      from "./getters"
import mutations    from "./mutations"


export default {
    namespaced: true,
    state:      state,
    mutations:  mutations,
    actions:    actions,
    getters:    getters,
    modules: {
        AUTH,
        PULSE,
        ONBOARDING,
        USER,
        CATALOGS,
        HOME,
        DASHBOARD,
        PX,
        PHOTO,
        MONITORING,
        ODONTOGRAM,
        TREATMENT,
        CONFIGURATION,
        PRESCRIPTION
    }
}
