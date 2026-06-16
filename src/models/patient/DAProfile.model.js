export default class DAProfileModel {
    constructor(
        id_person,
        file
    ) {
        this.id_person = id_person ? id_person : '',
        this.file = file ? file : ''
    }
}