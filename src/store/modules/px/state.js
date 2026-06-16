import DAPX from '../../../models/patient/DAPatient.model'

const state = () => ({
    hasErrorInService: false,
    px: new DAPX(),
    id_person: '',
})

export default state