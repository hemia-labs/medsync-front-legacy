import DAHasErrorModel from '../../../models/error/DAHasErrorModel';

const state = () => ({
    config: null,
    list: [],
    current: null,
    doctors: [],
    hasError: new DAHasErrorModel()
});

export default state;
