import DAToothConditionModel from "./DAToothCondition.model";

export default class DAToothConfigModel {
    constructor(
        general,
        sections,
        parts
    ) {
        this.general = general ? general : new DAToothConditionModel(),
        this.sections = sections ? sections :  [],
        this.parts = parts ? parts : [1,2,3,4, 5]
    }
}