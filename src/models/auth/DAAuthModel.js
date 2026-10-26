export default class DAAuthModel {
    constructor(
        param,
        pwd,
        refresh
    ) {
        this.param = param ? param : '',
        this.pwd = pwd ? pwd : '',
        this.refresh = refresh ? refresh : false
    }
}
