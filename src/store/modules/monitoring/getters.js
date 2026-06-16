const getters = {
    saveTracing:        state => state.saveMonitorings,
    updTracing:         state => state.updMonitorings,
    getTracing:         state => state.getMonitorings,
    deleteTracing:      state => state.deleteMonitorings,
    getAllTracing:      state => state.allMonitorings,
    hasErrorMonitoring: state => state.hasErrorMonitoring,
    getAllPxTreatment:  state => state.getAllTreatments.map((t) => {return {id: t.id_treatment, name: t.description}}),
}

export default getters