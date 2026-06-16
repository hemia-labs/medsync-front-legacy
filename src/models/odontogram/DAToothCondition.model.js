export default class DAToothConditionModel {
    constructor(
        part,
        conditions,
        color
    ) {
        this.part = part ? part : '',
        this.conditions = conditions ? conditions : [],
        this.color = color ? color :  '#ebebeb'
    }
}