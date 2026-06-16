export default class DAAddressModel {
    constructor(
        place_birth,
		residence,
		direction,
		cp
    ) {
        this.place_birth = place_birth ? place_birth : '',
		this.residence = residence ? residence : '',
		this.direction = direction ? direction : '',
		this.cp = cp ? cp : ''
    }
}