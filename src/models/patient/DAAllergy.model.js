export default class DAAlergyModel{
    constructor(
        has_allergy,
        description
    ) {
        this.has_allergy = has_allergy ? has_allergy : false
        this.description = description ? description : ''
    }
}