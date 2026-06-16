/**
 * Modelo para persistir la ultima accion en el VUEX
 */
export default class DACurrentActionModel {
    constructor(
        module,
        action,
        payload
    ) {
        this.module = module ? module : '',
        this.action = action ? action : '',
        this.payload = payload ? payload : ''
    }
}