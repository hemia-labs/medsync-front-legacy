export default class DAUserModel {
    constructor(
        email,
        phone,
        id_rol,
        name,
        password
    ) {
        this.email = email ? email : '',
        this.phone = phone ? phone : '',
        this.id_rol = id_rol ? id_rol : '',
        this.name = name ? name : '',
        this.password = password ? password : ''
    }
}