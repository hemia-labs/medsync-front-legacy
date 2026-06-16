export default {

    //ROOT
    currentAction:      'currentAction',
    ActionWrapper:      'ActionWrapper',

   // AUTH
    login:              'login',
    logout:             'logout',
    getToken:           'getToken',
    isAuthorized:       'isAuthorized',
    unauthorized:       'unauthorized',
    sendOtp:            'sendOtp',
    validateOtp:        'validateOtp',
    updatePwd:          'updatePwd',
    hasErrorOTP:        'hasErrorOTP',
    hasErrorVOTP:       'hasErrorVOTP',
    hasErrorPWD:        'hasErrorPWD',
    getPermissions:     'getPermissions',
    getBusiness:        'getBusiness',
    getTenantOperational: 'getTenantOperational',
    isSuperAdmin:       'isSuperAdmin',
    hasPermission:      'hasPermission',
    refreshtoken:       'refreshtoken',
    getRefreshtoken:    'getRefreshtoken',
    isRefresingToken:   'isRefresingToken',

    //USER
    getUser:            'getUser',
    getUsers:           'getUsers',
    save:               'save',
    isSave:             'isSave',
    update:             'update',

    //---- CATALOGS ----//
    //-ROLES
    getRoles:           'getRoles',
    getRolePermissions: 'getRolePermissions',
    saveRolePermissions:'saveRolePermissions',
    //-FAMILY-PATH
    getFamilyPath:      'getFamilyPath',
    //-DISEASES
    getDiseases:        'getDiseases',
    //-PATOLOGIC
    getSections:        'getSections',
    getPatological:     'getPatological',
    getPatologicInfo:   'getPatologicInfo',

    //DASHBOARD
    getBirthdays:       'getBirthdays',
    getPatients:        'getPatients',

    // PX
    getById:            'getById',
    createMinimal:      'createMinimal',
    getPx:              'getPx',
    id_person:          'id_person',
    remove:             'remove',
    uploadProfile:      'uploadProfile',
    
    // GLOBAL
    hasError:           'hasError',
    hasErrorInService:  'hasErrorInService',
    lastErrorInService: 'lastErrorInService',
    lastErrorInServiceDetails: 'lastErrorInServiceDetails',

    hasErrorPhoto:      'hasErrorPhoto',
    getTypeFiles:       'getTypeFiles',
    savePhoto:          'savePhoto',
    getPhotos:          'getPhotos',
    deletePhoto:        'deletePhoto',
    initPhotos:        'initPhotos',
    
    //Tracing Monitoring
    saveTracing:        'saveTracing',
    updTracing:        'updTracing',
    getTracing:         'getTracing',
    deleteTracing:      'deleteTracing',
    getAllTracing:      'getAllTracing',
    getAllPxTreatment:  'getAllPxTreatment',

    //ODONTOGRAMA
    getOdontogram:      'getOdontogram',
    odontogram:         'odontogram',
    getTooth:           'getTooth',
    onSaveTooth:        'onSaveTooth',
    getTypeTooth:       'getTypeTooth',
    codetypetooth:      'codetypetooth',
    initOdontogram:      'initOdontogram',
    validateOdontogram:  'validateOdontogram',
    id_odontogram:       'id_odontogram',
    odontogramDetail:    'odontogramDetail',
    saveOdontograDetail: 'saveOdontograDetail',
    setOdontogramDetail: 'setOdontogramDetail',
    history:             'history',
    getOdontogramHistory:             'getOdontogramHistory',
    status:               'status',
    odontogramEdit:             'odontogramEdit',
    delete:             'delete',

    //CONDITIONS
    getConditions:      'getConditions',
    conditions:         'conditions',

    //Other Treatment
    saveOTreatment:     'saveOTreatment',
    editOTreatment:     'editOTreatment',
    getOTreatment:      'getOTreatment',
    deleteOTreatment:   'deleteOTreatment',

    //TRATAMENT
    getTratament:       'getTratament',
    getTratamentEdit: 'getTratamentEdit',
    getTratamentDetail: 'getTratamentDetail',
    saveTratament: 'saveTratament',
    hasErrorTreatment: 'hasErrorTreatment',
    treatmentPlan: 'treatmentPlan',
    getTreatmentPlan: 'getTreatmentPlan',
    createTreatmentPlan: 'createTreatmentPlan',
    closeTreatmentPlan: 'closeTreatmentPlan',
    savePlanTreatment: 'savePlanTreatment',
    changePlanTreatmentStatus: 'changePlanTreatmentStatus',
    deletePlanTreatment: 'deletePlanTreatment',
    saveTreatmentPlanConsent: 'saveTreatmentPlanConsent',

    //Configurations
    saveConfiguration:  'saveConfiguration',
    editConfiguration:  'editConfiguration',
    getConfiguration:   'getConfiguration',
    saveLoginImage:     'saveLoginImage',
    getLoginImage:      'getLoginImage',
    getThemeList:       'getThemeList',
    getTheme:           'getTheme',
    saveTheme:          'saveTheme',
    getClinicalModules: 'getClinicalModules',
    saveClinicalModules:'saveClinicalModules',
    clinicalModules:    'clinicalModules',

    //PRESCRIPTIONS
    getPrescriptionConfig:  'getPrescriptionConfig',
    savePrescriptionConfig: 'savePrescriptionConfig',
    getPrescriptions:      'getPrescriptions',
    getPatientPrescriptions:'getPatientPrescriptions',
    getPrescription:       'getPrescription',
    savePrescription:      'savePrescription',
    issuePrescription:     'issuePrescription',
    cancelPrescription:    'cancelPrescription',
    deleteDraftPrescription:'deleteDraftPrescription',
    getPrescriptionDoctors:'getPrescriptionDoctors',
    prescriptions:         'prescriptions',
    prescription:          'prescription',
    prescriptionConfig:    'prescriptionConfig',
    prescriptionDoctors:   'prescriptionDoctors',
}
