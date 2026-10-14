let requestEpoch = 0;

export function authorizationFingerprint(state) {
    if (!state || !state.authenticated) return '';
    const user = state.user || {};
    return JSON.stringify([user.id_login || user.id || null, user.id_session || null,
        (state.business || {}).id_business || user.id_business || null,
        state.role || user.rol || null, [...(state.permissions || [])].sort()]);
}

export function authorizationContext(store) {
    const state = store.state.CORE.AUTH;
    return { fingerprint: authorizationFingerprint(state), revision: state.accessRevision || 0, epoch: requestEpoch };
}

export function isCurrentAuthorization(context, store) {
    if (!context) return true;
    const current = authorizationContext(store);
    return context.fingerprint === current.fingerprint && context.revision === current.revision && context.epoch === current.epoch;
}

export function invalidatePendingRequests() { requestEpoch += 1; }

export function authorizationChangedError() {
    const error = new Error('Los accesos cambiaron. Vuelve a consultar la informacion.');
    error.response = { status: 409, data: { status: 409, data: { code: 'AUTH_CONTEXT_CHANGED' }, message: error.message } };
    return error;
}

export function isAuthControlRequest(url) {
    return /(?:^|\/)api\/auth\//i.test(String(url || '').split('?')[0]);
}
