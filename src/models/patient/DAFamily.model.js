export default class DAFamilyModel {
    constructor(
        id_family_path,
        live,
        dead,
        current_illness,
        death_cause
    ) {
        this.id_family_path = id_family_path ? id_family_path : '',
        this.live = live ? live : false,
        this.dead = dead? dead : false,
        this.current_illness = current_illness ? current_illness : '',
        this.death_cause = death_cause ? death_cause : ''
    }
}