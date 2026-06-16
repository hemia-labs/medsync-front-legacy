import {
    DAC_BUSINESS_DASHBOARD_OPERATIONAL_SUMMARY,
    DAC_BUSINESS_DASHBOARD_PROFESSIONAL_BREAKDOWN,
    DAC_BUSINESS_DASHBOARD_SUMMARY,
    DAC_BUSINESS_DASHBOARD_TEAM_BREAKDOWN,
    DAC_BUSINESS_DASHBOARD_TRENDS
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

function buildQuery(endpoint, params = {}, allowedParams = []) {
    const query = new URLSearchParams();

    allowedParams.forEach((key) => {
        if(params[key]) {
            query.append(key, params[key]);
        }
    });

    const serialized = query.toString();
    return serialized ? `${endpoint}?${serialized}` : endpoint;
}

export default {
    getSummary(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_SUMMARY, params, ['from', 'to']));
    },

    getTrends(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_TRENDS, params, ['from', 'to', 'granularity']));
    },

    getOperationalSummary(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_OPERATIONAL_SUMMARY, params, ['from', 'to']));
    },

    getProfessionalBreakdown(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_PROFESSIONAL_BREAKDOWN, params, ['from', 'to']));
    },

    getTeamBreakdown(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_TEAM_BREAKDOWN, params, ['from', 'to']));
    }
}
