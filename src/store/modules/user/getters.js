const getters = {
    getUsers: state => state.users,
    isSave: state => state.successfullysave,
    hasErrorInService: state => state.hasErrorInService,
    lastErrorInService: state => state.lastErrorInService,
    lastErrorInServiceDetails: state => state.lastErrorInServiceDetails,
    getUser: state => state.user
}

export default getters
