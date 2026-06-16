export class ResultData {
    constructor(
        success,
        data
    ) {
        this.success = success ? success : false,
        this.data = data ? data : null
    }
}