import ROLE from "./role/index"
import FAMILYPATH from "./familypath/index"
import DISEASE from "./diseases/index"
import PATOLOGIC from "./patologic/index"
import CONDITION from "./condition/index"

export default {
  namespaced: true,
  modules: {
    ROLE,
    FAMILYPATH,
    DISEASE,
    PATOLOGIC,
    CONDITION
  }
}
