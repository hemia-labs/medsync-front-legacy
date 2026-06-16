export default class DAOdontogramParentModel {
    constructor(
        id_odontogramv1,
        id_person,
        type,
        expand
    ) {
        this.id_odontogramv1 = id_odontogramv1 ? id_odontogramv1 : "",
        this.id_person = id_person ? id_person : "",
        this.type = type ? type : "",
        this.expand = expand ? expand : "INDICARTOR_DISABLED"
    }
}