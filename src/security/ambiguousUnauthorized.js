// NC1-AUTH-401-AMB (contract §7.3 of PHASE_NC1_401_HANDLER_CONTRACT_ANALYSIS_CLAUDE_20261116).
// A 401 on a business route that does not say why (no code, or a code outside the inventory) is not
// proof that the session ended. It starts at most one shared revalidation with auth/session per
// authorization context, through the existing CORE/AUTH/refreshAccess action and its mutations.
// The original request always stays rejected: nothing is replayed, read or write.
import { isCurrentAuthorization, authorizationChangedError, isAuthControlRequest } from './authorizationContext';

// Codes the client acts on directly. They always take precedence over deduplication and the window.
export const TERMINAL_AUTH_CODES = Object.freeze(['AUTH_SESSION_INVALID', 'AUTH_ACCESS_INVALID']);
export const RECOVERABLE_AUTH_CODES = Object.freeze(['AUTH_ACCESS_EXPIRED']);

// Inventory of the other 401 codes the backend can emit (NC1-AUTH-S1-S3 inventory, 2026-11-17).
// None of them reaches this handler on a business route today; each entry states why and how it is treated.
// Any code not listed here or above is handled as ambiguous: the session endpoint decides. A code is never
// treated as terminal because of its prefix (an unknown AUTH_* is still ambiguous).
export const INVENTORIED_401_CODES = Object.freeze({
    AUTH_REQUIRED: 'registration/activation serializer; served through DARegistrationService, which has its own client and never reaches this handler'
});

// After auth/session confirms the same context, codeless 401s in that context do not start another
// revalidation for a short time. Ten seconds covers the requests a screen fires together and their
// stragglers, which arrive within a few seconds, while a later user action re-checks the session.
// The window never hides a terminal or recoverable code, never authorizes anything locally (the server
// still authorizes every request) and ends with any change of user, session, business, role,
// permissions or revision (logout and login included).
export const CONFIRMED_SESSION_WINDOW_MS = 10000;

export const UNCERTAIN_SESSION_MESSAGE = 'No pudimos confirmar tu sesión. Conservamos tu captura; revisa tu conexión e inténtalo de nuevo.';

let inFlight = null;
let confirmed = null;

const contextKey = context => [context.revision, context.epoch, context.fingerprint].join('|');

export function unauthorizedCode(error) {
    const payload = error && error.response && error.response.data;
    return (payload && (payload.code || (payload.data && payload.data.code))) || null;
}

// True when the defense applies: a business request sent under an authorization context, by an
// authenticated client, answered 401 without a terminal/recoverable code. Auth controls (session, login,
// refresh, logout, csrf, password...) keep their own contract and are never revalidated (no recursion).
export function isAmbiguousUnauthorized(error, store) {
    const code = unauthorizedCode(error);
    if (TERMINAL_AUTH_CODES.includes(code) || RECOVERABLE_AUTH_CODES.includes(code)) return false;
    const config = error && error.config;
    if (!config || !config.authorizationContext || isAuthControlRequest(config.url)) return false;
    return Boolean(store.state.CORE.AUTH.authenticated);
}

const outcome = (error, result, message) => {
    const response = error.response || {};
    const data = response.data && typeof response.data === 'object' ? response.data : {};
    error.response = { ...response, data: { ...data, authRevalidation: result, ...(message ? { message } : {}) } };
    error.authRevalidation = result;
    return Promise.reject(error);
};

export async function revalidateAmbiguousUnauthorized(error, store, now = Date.now) {
    const context = error.config.authorizationContext;
    const key = contextKey(context);
    if (confirmed && (confirmed.key !== key || now() >= confirmed.until)) confirmed = null;
    if (confirmed && isCurrentAuthorization(context, store)) return outcome(error, 'valid');

    if (!inFlight || inFlight.key !== key) {
        const entry = { key, promise: null };
        entry.promise = Promise.resolve()
            .then(() => store.dispatch('CORE/AUTH/refreshAccess'))
            .catch(() => null)
            .finally(() => { if (inFlight === entry) inFlight = null; });
        inFlight = entry;
    }
    const response = await inFlight.promise;

    if (!isCurrentAuthorization(context, store)) {
        // The revalidation (or a concurrent login/logout/business change) ended or changed the authorization.
        // Ended: refreshAccess already applied the existing cleanup/redirect. Changed: existing invalidation,
        // without keeping data from the previous authorization.
        if (!store.state.CORE.AUTH.authenticated) return outcome(error, 'invalid');
        throw authorizationChangedError();
    }
    if (response && response.success && response.data && response.data.authenticated) {
        confirmed = { key, until: now() + CONFIRMED_SESSION_WINDOW_MS };
        return outcome(error, 'valid');
    }
    // Network error or 5xx: neither a revocation nor a validated session.
    return outcome(error, 'uncertain', UNCERTAIN_SESSION_MESSAGE);
}

export function resetAmbiguousUnauthorized() {
    inFlight = null;
    confirmed = null;
}

