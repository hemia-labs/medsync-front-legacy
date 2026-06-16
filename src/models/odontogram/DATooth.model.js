import DAToothConfigModel from "./DAToothConfig.model";

export default class DAToothModel {
    constructor(
        id_tooth,
        id_odontogram,
        id_person,
        observation,
        symbol,
        config
    ) {
        this.id_tooth = id_tooth ? id_tooth : '',
        this.id_odontogram = id_odontogram ? id_odontogram : '',
        this.id_person = id_person ? id_person : '',
        this.observation = observation ? observation : '',
        this.symbol = symbol ? symbol : 0,
        this.config = config ? config : [ new DAToothConfigModel() ]
    }
}