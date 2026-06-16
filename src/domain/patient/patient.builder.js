export const CLINICAL_QUERY_DEFAULTS = {};

export const applyClinicalQueryDefaults = (patient, px) => {
    return patient || px;
};

export const buildSocialMediaPayload = (selectedOptions, isWriting, otherText) => ({
    inputSelected: selectedOptions,
    isCheck: isWriting,
    text: selectedOptions.includes('Otro') ? otherText : null
});

export const buildPatientPayload = (patient, patologic, socialMedia, formatDate) => {
    const idSignature = patient.person.id_signature && patient.files.file
        ? null
        : patient.person.id_signature;

    return {
        ...patient,
        person: {
            ...patient.person,
            id_signature: idSignature,
            birthday: formatDate(patient.person.birthday)
        },
        query: {
            ...patient.query,
            pulse: patient.query && patient.query.pulse ? patient.query.pulse : null,
            blood_pressure: patient.query && patient.query.blood_pressure ? patient.query.blood_pressure : null,
            oxygenation: patient.query && patient.query.oxygenation ? patient.query.oxygenation : null,
            dia: patient.query && patient.query.dia ? patient.query.dia : null
        },
        pathological_data: patologic,
        social_media: socialMedia
    };
};

export const mapPatientResponseToForm = (px, revertDate) => {
    const socialMedia = px.social_media || {};

    return {
        person: {
            ...px.person,
            birthday: revertDate(px.person.birthday)
        },
        address: px.address,
        query: px.query,
        allergy: px.allergy,
        patologic: px.pathological_data,
        selectedOptions: socialMedia.inputSelected || [],
        isWriting: socialMedia.isCheck || false,
        addSocialMediaOther: socialMedia.text || ''
    };
};
