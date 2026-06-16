export default class DAPersonModel {
    constructor(
        name, 
        surname,
        birthday,
        age,
		ocupation,
		rfc,
		local_telephone,
		telephone,
        name_signature
    ) {
        this.name = name ? name : '', 
        this.surname = surname ? surname : '',
        this.birthday = birthday ? birthday : '',
        this.age = age ? age : 0,
		this.ocupation = ocupation ? ocupation: '',
		this.rfc = rfc ? rfc : '',
		this.local_telephone = local_telephone ? local_telephone : '',
		this.telephone = telephone ? telephone : '',
        this.name_signature = name_signature ? name_signature : ''
    }
}