const getters = {
    saveTracing:        state => state.saveMonitorings,
    updTracing:         state => state.updMonitorings,
    getTracing:         state => state.getMonitorings,
    deleteTracing:      state => state.deleteMonitorings,
    getAllTracing:      state => state.allMonitorings,
    hasErrorMonitoring: state => state.hasErrorMonitoring,
    getAllPxTreatment:  state => state.getAllTreatments.map(t => ({ id: t.id ?? t.id_treatment, name: t.name ?? t.description })),
}

export default getters