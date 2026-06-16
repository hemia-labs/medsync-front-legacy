import {
    DAC_SUPER_ADMIN_AUDIT,
    DAC_SUPER_ADMIN_BUSINESSES,
    DAC_SUPER_ADMIN_BUSINESS_PLAN,
    DAC_SUPER_ADMIN_BUSINESS_LICENSE_OVERRIDES,
    DAC_SUPER_ADMIN_BUSINESS_SUBSCRIPTION_STATUS,
    DAC_SUPER_ADMIN_BUSINESS_TRIAL,
    DAC_SUPER_ADMIN_DASHBOARD_SUMMARY,
    DAC_SUPER_ADMIN_PLANS,
    DAC_SUPER_ADMIN_SAAS_JOBS_STATUS,
    DAC_SUPER_ADMIN_SAAS_TRIAL_LIFECYCLE_RUN,
    DAC_SUPER_ADMIN_SESSIONS,
    DAC_SUPER_ADMIN_USERS,
    DAC_SUPER_ADMIN_USER_SESSIONS
} from '../../common/apiurl';
import { DACore } from '../../config/axios.context';

const cleanParams = (params = {}) => Object.keys(params).reduce((result, key) => {
    const value = params[key];

    if(value !== undefined && value !== null && value !== '') {
        result[key] = value;
    }

    return result;
}, {});

export default {
    getAuditLogs(params = {}) {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return DACore.get(query ? `${DAC_SUPER_ADMIN_AUDIT}?${query}` : DAC_SUPER_ADMIN_AUDIT);
    },
    getDashboardSummary(params = {}) {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return DACore.get(query ? `${DAC_SUPER_ADMIN_DASHBOARD_SUMMARY}?${query}` : DAC_SUPER_ADMIN_DASHBOARD_SUMMARY);
    },
    getSaasJobsStatus() {
        return DACore.get(DAC_SUPER_ADMIN_SAAS_JOBS_STATUS);
    },
    getPlans() {
        return DACore.get(DAC_SUPER_ADMIN_PLANS);
    },
    runSaasTrialLifecycleDryRun() {
        return DACore.post(DAC_SUPER_ADMIN_SAAS_TRIAL_LIFECYCLE_RUN, { dryRun: true });
    },
    getBusinesses(params = {}) {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return DACore.get(query ? `${DAC_SUPER_ADMIN_BUSINESSES}?${query}` : DAC_SUPER_ADMIN_BUSINESSES);
    },
    createBusiness(payload = {}) {
        return DACore.post(DAC_SUPER_ADMIN_BUSINESSES, payload);
    },
    updateBusiness(idBusiness, payload = {}) {
        return DACore.patch(`${DAC_SUPER_ADMIN_BUSINESSES}/${idBusiness}`, payload);
    },
    getBusinessLicenseSummary(idBusiness) {
        return DACore.get(`${DAC_SUPER_ADMIN_BUSINESSES}/${idBusiness}/license-summary`);
    },
    getBusinessLicenseOverrides(idBusiness) {
        return DACore.get(`${DAC_SUPER_ADMIN_BUSINESS_LICENSE_OVERRIDES}/${idBusiness}/license-overrides`);
    },
    updateBusinessLicenseOverrides(idBusiness, payload = {}) {
        return DACore.patch(`${DAC_SUPER_ADMIN_BUSINESS_LICENSE_OVERRIDES}/${idBusiness}/license-overrides`, payload);
    },
    updateBusinessSubscriptionStatus(idBusiness, payload = {}) {
        return DACore.patch(`${DAC_SUPER_ADMIN_BUSINESS_SUBSCRIPTION_STATUS}/${idBusiness}/subscription-status`, payload);
    },
    extendBusinessTrial(idBusiness, payload = {}) {
        return DACore.patch(`${DAC_SUPER_ADMIN_BUSINESS_TRIAL}/${idBusiness}/trial/extend`, payload);
    },
    updateBusinessPlan(idBusiness, payload = {}) {
        return DACore.patch(`${DAC_SUPER_ADMIN_BUSINESS_PLAN}/${idBusiness}/plan`, payload);
    },
    getUsers(params = {}) {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return DACore.get(query ? `${DAC_SUPER_ADMIN_USERS}?${query}` : DAC_SUPER_ADMIN_USERS);
    },
    getSessions(params = {}) {
        const query = new URLSearchParams(cleanParams(params)).toString();
        return DACore.get(query ? `${DAC_SUPER_ADMIN_SESSIONS}?${query}` : DAC_SUPER_ADMIN_SESSIONS);
    },
    closeSession(idSession) {
        return DACore.patch(`${DAC_SUPER_ADMIN_SESSIONS}/${idSession}/close`);
    },
    closeUserSessions(idLogin) {
        return DACore.patch(`${DAC_SUPER_ADMIN_USER_SESSIONS}/${idLogin}/close-sessions`);
    }
}
