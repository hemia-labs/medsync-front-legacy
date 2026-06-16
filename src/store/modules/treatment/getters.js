const getters = {
    saveOTreatment:        state => state.saveOTreatments,
    editOTreatment:        state => state.editOTreatments,
    getOTreatment:         state => state.getOTreatments,
    deleteOTreatment:      state => state.deleteOTreatments,
    hasErrorOTreatment: state => state.hasErrorOTreatments,
    getTratament: state => state.tratament,
    getTratamentEdit: state => state.tratamentEdit,
    getTratamentDetail: state => state.tratamentDetail,
    hasErrorTreatment: state => state.hasErrorTreatment,
    treatmentPlan: state => state.treatmentPlan,
}

export default getters
