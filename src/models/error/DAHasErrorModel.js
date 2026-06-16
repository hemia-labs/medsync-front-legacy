export default class DAHasErrorModel {
    constructor(
        error,
        message
    ) {
        this.error = error ? error : false,
        this.message = message ? message : ''
    }
}