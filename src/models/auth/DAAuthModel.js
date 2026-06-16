export default class DAAuthModel {
    constructor(
        param,
        pwd,
        secretkey,
        timestamp,
        signature,
        refresh
    ) {
        this.param = param ? param : '',
        this.pwd = pwd ? pwd : '',
        this.secretkey = secretkey? secretkey : '',
        this.timestamp = timestamp ? timestamp: '',
        this.signature = signature ? signature : ''
        this.refresh = refresh ? refresh : false
    }
}