import DAOdontogramDetailModel from "../../../models/odontogram/DAOdontogramDetail.model"
import DAToothModel from "../../../models/odontogram/DATooth.model"

const state = () => ({
    odontogram: [],
    odontogramDetail: new DAOdontogramDetailModel(),
    tooth: new DAToothModel(),
    hasError: false,
    typeTooth: [],
    codetypetooth: '',
    id_odontogram:  "",
    history: [],
    odontogramEdit: new DAOdontogramDetailModel(),
    odontogramPreview: new DAOdontogramDetailModel(),
})

export default state