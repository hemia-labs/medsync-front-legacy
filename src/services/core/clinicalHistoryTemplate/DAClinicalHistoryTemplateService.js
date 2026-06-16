import {
    DAC_CLINICAL_HISTORY_TEMPLATE_CURRENT,
    DAC_CLINICAL_HISTORY_TEMPLATE_BUSINESS,
    DAC_CLINICAL_HISTORY_TEMPLATE_VERSION
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

export default {
    getCurrent() {
        return DACore.get(DAC_CLINICAL_HISTORY_TEMPLATE_CURRENT);
    },
    createBusinessTemplate(data = {}) {
        return DACore.post(DAC_CLINICAL_HISTORY_TEMPLATE_BUSINESS, data);
    },
    createVersion(templateId, data) {
        return DACore.post(`${DAC_CLINICAL_HISTORY_TEMPLATE_VERSION}${templateId}/version`, data);
    }
};
