import DAHasErrorModel from '../../../models/error/DAHasErrorModel';

const state = () => ({
    saveConfigurations: [],
    getConfigurations:  [],
    editConfigurations: [],
    saveLoginImage:     [],
    getLoginImage:      [],
    themeList:          [],
    theme:              [],
    saveTheme:          [],
    clinicalModules:    null,
    saveClinicalModules:[],
    hasErrorConfiguration: new DAHasErrorModel(),
})

export default state
