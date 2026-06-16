export const buildOdontogramParentPayload = (idPerson, type, expand = 'INDICARTOR_DISABLED') => ({
    id_odontogramv1: '',
    id_person: idPerson,
    type,
    expand
});

export const buildOdontogramDetailPayload = (detail, idPerson) => ({
    ...detail,
    id_person: idPerson
});

export const buildOdontogramStatusPayload = (idOdontogram, active) => ({
    id_odontogramv1: idOdontogram,
    active
});

export const buildOdontogramDeletePayload = (idOdontogram) => ({
    id_odontogramv1: idOdontogram
});
