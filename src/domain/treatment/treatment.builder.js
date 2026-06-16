export const buildOtherTreatmentPayload = (idPerson, description, amount) => ({
    treatment: [
        {
            description,
            amount
        }
    ],
    id_person: idPerson
});

export const buildOtherTreatmentUpdatePayload = (idPerson, idTreatment, description, amount) => ({
    treatment: [
        {
            id_treatment: idTreatment,
            description,
            amount
        }
    ],
    id_person: idPerson
});

export const buildOtherTreatmentDeletePayload = (idPerson, idTreatment) => ({
    id_treatment: idTreatment,
    id_person: idPerson
});

export const mapDiagnosisToTreatmentForm = (diagnosis = {}) => ({
    amount: diagnosis.amount,
    id_diagnosis: diagnosis.id_diagnosis,
    id_odontogram: diagnosis.id_odontogram,
    id_person: diagnosis.id_person,
    treatment: diagnosis.treatment
});
