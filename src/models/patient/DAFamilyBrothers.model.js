export default class DAFamilyBrothers {
    constructor(
        total,
		live,
		dead,
		name_age,
		causes_death,
		diseases

    ) {
        this.total = total ? total : '',
		this.live = live? live : '',
		this.dead = dead ? dead : '',
		this.name_age = name_age ? name_age : '',
		this.causes_death = causes_death ? causes_death : '',
		this.diseases = diseases ? diseases : ''
    }
}