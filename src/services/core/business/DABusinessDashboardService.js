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
    getOverview(params = {}) {
        return DACore.get(buildQuery('api/business/dashboard/overview', params, ['from', 'to', 'granularity', 'scope']));
    },

    getSummary(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_SUMMARY, params, ['from', 'to', 'scope']));
    },

    getTrends(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_TRENDS, params, ['from', 'to', 'granularity', 'scope']));
    },

    getOperationalSummary(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_OPERATIONAL_SUMMARY, params, ['from', 'to', 'scope']));
    },

    getProfessionalBreakdown(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_PROFESSIONAL_BREAKDOWN, params, ['from', 'to', 'scope']));
    },

    getTeamBreakdown(params = {}) {
        return DACore.get(buildQuery(DAC_BUSINESS_DASHBOARD_TEAM_BREAKDOWN, params, ['from', 'to', 'scope']));
    }
}
