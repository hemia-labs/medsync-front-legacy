// Analitica de uso con Umami self-hosted (https://analytics.hemia.cloud).
// El website ID no es un secreto: queda visible en el HTML de cualquier sitio que usa Umami.
// Por defecto solo se activa en builds de produccion y solo cuenta visitas de app.medsync.mx.
// Variables opcionales (.env.local / secrets de CI):
//   VUE_APP_ANALYTICS_ENABLED=true|false   fuerza activar/desactivar
//   VUE_APP_UMAMI_SCRIPT_URL, VUE_APP_UMAMI_WEBSITE_ID, VUE_APP_UMAMI_DOMAINS
const DEFAULTS = Object.freeze({
    scriptUrl: 'https://analytics.hemia.cloud/stats.js',
    websiteId: 'f31fac4b-3403-46f5-8901-fe224350ac00',
    domains: 'app.medsync.mx'
});

const enabledFlag = String(process.env.VUE_APP_ANALYTICS_ENABLED || '').trim().toLowerCase();

export const analyticsConfig = Object.freeze({
    enabled: enabledFlag ? enabledFlag === 'true' : process.env.NODE_ENV === 'production',
    scriptUrl: process.env.VUE_APP_UMAMI_SCRIPT_URL || DEFAULTS.scriptUrl,
    websiteId: process.env.VUE_APP_UMAMI_WEBSITE_ID || DEFAULTS.websiteId,
    domains: process.env.VUE_APP_UMAMI_DOMAINS || DEFAULTS.domains
});
