export default class DATreatmentModel {
    constructor(
        id_diagnosis,
        id_odontogram, 
        id_person,
        treatment, 
        amount
    ) {
        this.id_diagnosis = id_diagnosis ? id_diagnosis : '',
        this.id_odontogram = id_odontogram ? id_odontogram : '', 
        this.id_person = id_person ? id_person : '',
        this.treatment = treatment ? treatment : '', 
        this.amount = amount? amount : ''
    }
}