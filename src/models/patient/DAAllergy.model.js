export default class DAAlergyModel{
    constructor(
        has_allergy,
        description
    ) {
        this.has_allergy = has_allergy === true || has_allergy === false ? has_allergy : null
        this.review_status = has_allergy === true ? 'HAS_ALLERGIES' : has_allergy === false ? 'NONE_KNOWN' : 'UNREVIEWED'
        this.description = description ? description : ''
    }
}
