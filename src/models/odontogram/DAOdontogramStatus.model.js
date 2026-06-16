export default class DAOdontogramStatusModel {
    constructor(
        id_odontogramv1,
        active
    ) {
        this.id_odontogramv1 = id_odontogramv1 ? id_odontogramv1 : "",
        this.active = active ? active : false
    }
}