
export default class DAOdontogramDetailModel {
    constructor(
        id_odontogram_detailv1,
        id_tooth,
        treatment,
        id_person

    ) {
        this.id_odontogram_detailv1 = id_odontogram_detailv1 ? id_odontogram_detailv1 : "",
        this.id_tooth = id_tooth ? id_tooth : "",
        this.treatment = treatment ? treatment : "",
        this.id_person = id_person ? id_person : ""
    }
}