export default class DAFamilyGrandparentsModel {
    constructor(
        id_family_path,
		diseases
    ) {
        this.id_family_path = id_family_path ? id_family_path : '',
		this.diseases = diseases ? diseases :''
    }
}