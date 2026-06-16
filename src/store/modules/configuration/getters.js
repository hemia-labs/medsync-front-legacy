const getters = {
    saveConfiguration:      state => state.saveConfigurations,
    getConfiguration:       state => state.getConfigurations.length > 0 ? state.getConfigurations[0] : [],
    editConfiguration:      state => state.editConfigurations,
    saveLoginImage:         state => state.saveLoginImage,
    getLoginImage:          state => state.getLoginImage.length > 0 ? state.getLoginImage[0] : [],
    getThemeList:           state => state.themeList,
    getTheme:               state => state.theme.length > 0 ? state.theme[0] : [],
    saveTheme:              state => state.saveTheme,
    clinicalModules:        state => state.clinicalModules || { odontogramEnabled: false },
    saveClinicalModules:    state => state.saveClinicalModules,
    hasErrorConfiguration:  state => state.hasErrorConfiguration,
    hasErrorInService:      state => state.hasErrorConfiguration,
}

export default getters
