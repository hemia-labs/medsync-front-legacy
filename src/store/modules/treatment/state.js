import DAHasErrorModel from '../../../models/error/DAHasErrorModel';

const state = () => ({
    saveOTreatments:    [],
    editOTreatments:    [],
    getOTreatments:     [],
    deleteOTreatments:  [],
    hasErrorOTreatments: new DAHasErrorModel(),
    hasErrorTreatment: new DAHasErrorModel(),
    tratament: [],
    tratamentEdit: null,
    tratamentDetail: null,
    treatmentPlan: null,
})

export default state
