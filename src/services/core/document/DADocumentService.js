import {
    DAC_DOCUMENT_TEMPLATES,
    DAC_DOCUMENT_TEMPLATE_SAVE,
    DAC_DOCUMENT_PATIENT,
    DAC_DOCUMENT_CREATE,
    DAC_DOCUMENT_SIGN,
    DAC_DOCUMENT_REFUSAL,
    DAC_DOCUMENT_CANCEL,
    DAC_DOCUMENT_AUDIT_ACTION,
    DAC_DOCUMENT_SIGNATURE_REQUEST_CREATE,
    DAC_DOCUMENT_SIGNATURE_REQUEST_EMAIL,
    DAC_DOCUMENT_SIGNATURE_REQUEST_LIST,
    DAC_DOCUMENT_SIGNATURE_REQUEST_REVOKE
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getTemplates() {
        return DACore.get(DAC_DOCUMENT_TEMPLATES);
    },
    saveTemplate(data) {
        return DACore.post(DAC_DOCUMENT_TEMPLATE_SAVE, data);
    },
    getPatientDocuments(idPerson) {
        return DACore.get(DAC_DOCUMENT_PATIENT + idPerson);
    },
    createDocument(data) {
        return DACore.post(DAC_DOCUMENT_CREATE, data);
    },
    signDocument(data) {
        return DACore.post(DAC_DOCUMENT_SIGN, data);
    },
    registerRefusal(data) {
        return DACore.post(DAC_DOCUMENT_REFUSAL, data);
    },
    cancelDocument(data) {
        return DACore.post(DAC_DOCUMENT_CANCEL, data);
    },
    auditAction(data) {
        return DACore.post(DAC_DOCUMENT_AUDIT_ACTION, data);
    },
    createSignatureRequest(data) {
        return DACore.post(DAC_DOCUMENT_SIGNATURE_REQUEST_CREATE, data);
    },
    sendSignatureRequestEmail(data) {
        return DACore.post(DAC_DOCUMENT_SIGNATURE_REQUEST_EMAIL, data);
    },
    listSignatureRequests(idPatientDocument) {
        return DACore.get(DAC_DOCUMENT_SIGNATURE_REQUEST_LIST(idPatientDocument));
    },
    revokeSignatureRequest(data) {
        return DACore.post(DAC_DOCUMENT_SIGNATURE_REQUEST_REVOKE, data);
    }
};
