import DAHasErrorModel from '../../../models/error/DAHasErrorModel';

const state = () => ({
    saveMonitorings:    [],
    updMonitorings:    [],
    getMonitorings:     [],
    getAllTreatments:   [],
    deleteMonitorings:  [],
    allMonitorings:     [],
    hasErrorMonitoring: new DAHasErrorModel(),
})

export default state