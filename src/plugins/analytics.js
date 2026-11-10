import { analyticsConfig } from '@/config/analytics.config';

/**
 * Analitica de uso (Umami) sin datos clinicos ni personales.
 *
 * - Las paginas se registran con el PATRON de la ruta (/px/history/:id), nunca con la URL real,
 *   el query string ni document.title, para no enviar IDs, tokens o nombres de pacientes.
 * - Las acciones se registran desde las escrituras exitosas a la API (POST/PUT/PATCH/DELETE)
 *   con el endpoint normalizado (px/update/:id). Nunca se envia el body ni la respuesta.
 * - El super admin no se mide (ni sus rutas ni su rol).
 * - Si analytics esta desactivado, todo es no-op y el script ni siquiera se descarga.
 */

const EXCLUDED_ROUTE_PREFIXES = ['/super-admin'];
const EXCLUDED_ROLES = ['super_admin'];
const SKIPPED_ACTIONS = /^(?:auth\/(?!login$)|.*csrf)/;
const WRITE_METHODS = ['post', 'put', 'patch', 'delete'];
const ID_SEGMENT = /^(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{16,}|[a-z0-9_-]{32,}|.*[@=].*)$/i;
const MAX_EVENT_NAME = 50;
const MAX_QUEUE = 50;

let store = null;
let scriptRequested = false;
let currentPath = null;
let currentExcluded = false;
let firstView = true;
let identifiedRole = null;
const queue = [];

const isEnabled = () => Boolean(analyticsConfig.enabled && analyticsConfig.websiteId && typeof window !== 'undefined');

const getUmami = () => (window.umami && typeof window.umami.track === 'function' ? window.umami : null);

const currentRole = () => {
    try {
        return (store && store.getters && store.getters['CORE/AUTH/getRole']) || null;
    } catch (error) {
        return null;
    }
};

const run = (fn, umami) => {
    try {
        fn(umami);
    } catch (error) {
        // La analitica nunca debe romper la aplicacion.
    }
};

const flush = () => {
    const umami = getUmami();
    if(!umami) return;
    while(queue.length) run(queue.shift(), umami);
};

const loadScript = () => {
    if(scriptRequested) return;
    scriptRequested = true;
    const script = document.createElement('script');
    script.defer = true;
    script.src = analyticsConfig.scriptUrl;
    script.setAttribute('data-website-id', analyticsConfig.websiteId);
    script.setAttribute('data-auto-track', 'false');
    script.setAttribute('data-do-not-track', 'true');
    if(analyticsConfig.domains) script.setAttribute('data-domains', analyticsConfig.domains);
    script.onload = flush;
    document.head.appendChild(script);
};

const enqueue = (fn) => {
    const umami = getUmami();
    if(umami) {
        run(fn, umami);
        return;
    }
    if(queue.length < MAX_QUEUE) queue.push(fn);
    loadScript();
};

const routePattern = (to) => {
    const record = to && to.matched && to.matched.length ? to.matched[to.matched.length - 1] : null;
    if(!record || !record.path || record.path === '*') return '/404';
    return record.path;
};

const externalReferrer = () => {
    try {
        if(!document.referrer) return '';
        const ref = new URL(document.referrer);
        return ref.host === window.location.host ? '' : ref.origin;
    } catch (error) {
        return '';
    }
};

const sanitizeData = (data) => {
    if(!data || typeof data !== 'object') return undefined;
    const safe = {};
    Object.keys(data).slice(0, 10).forEach((key) => {
        const value = data[key];
        if(typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
            safe[key] = value;
        } else if(typeof value === 'string' && value.length <= 40 && !/[@\d]{6,}|@/.test(value)) {
            safe[key] = value;
        }
    });
    return Object.keys(safe).length ? safe : undefined;
};

const syncRole = () => {
    const role = currentRole();
    if(!role || role === identifiedRole) return;
    identifiedRole = role;
    enqueue(umami => {
        if(typeof umami.identify === 'function') umami.identify({ rol: String(role) });
    });
};

const isExcludedRole = () => EXCLUDED_ROLES.includes(currentRole());

export const normalizeEndpoint = (endpoint) => String(endpoint || '')
    .split('?')[0]
    .replace(/^\/+|\/+$/g, '')
    .replace(/^api\//i, '')
    .toLowerCase()
    .split('/')
    .filter(Boolean)
    .map(segment => (ID_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');

export function trackPageView(to) {
    if(!isEnabled()) return;
    const path = routePattern(to);
    currentExcluded = EXCLUDED_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix)) || isExcludedRole();
    if(currentExcluded || path === currentPath) return;
    currentPath = path;
    const referrer = firstView ? externalReferrer() : '';
    firstView = false;
    const title = to && to.name ? String(to.name) : path;
    syncRole();
    enqueue(umami => umami.track(props => ({ ...props, url: path, title, referrer })));
}

export function trackEvent(name, data) {
    if(!isEnabled() || !name || currentExcluded || isExcludedRole()) return;
    const url = currentPath || '/';
    const eventName = String(name).slice(0, MAX_EVENT_NAME);
    const eventData = sanitizeData(data);
    enqueue(umami => umami.track(props => ({ ...props, url, title: url, referrer: '', name: eventName, data: eventData })));
}

export function trackApiWrite(method, endpoint, response) {
    if(!isEnabled()) return;
    const verb = String(method || '').toLowerCase();
    if(!WRITE_METHODS.includes(verb) || !response || response.status < 200 || response.status >= 300) return;
    const appStatus = response.data && response.data.status;
    if(typeof appStatus === 'number' && (appStatus < 200 || appStatus >= 300)) return;
    const action = normalizeEndpoint(endpoint);
    if(!action || SKIPPED_ACTIONS.test(action)) return;
    trackEvent(action === 'auth/login' ? 'login' : action, { metodo: verb });
}

export default {
    install(Vue, options = {}) {
        store = options.store || null;
        Vue.prototype.$analytics = Object.freeze({ track: trackEvent });
    }
};
