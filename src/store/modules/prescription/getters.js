const getters = {
    prescriptionConfig: state => state.config,
    prescriptions: state => state.list,
    prescription: state => state.current,
    prescriptionDoctors: state => state.doctors,
    hasErrorInService: state => state.hasError,
};

export default getters;
