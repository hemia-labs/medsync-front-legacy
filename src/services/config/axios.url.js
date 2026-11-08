const configuredUrl = process.env.VUE_APP_CORE_URL_API;
const loopbackApi = /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?=[:/]|$)/i;

function resolveCoreUrl() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Use the same hostname as the frontend so session cookies stay same-site.
      return configuredUrl && configuredUrl.replace(loopbackApi, `$1${hostname}`);
    }
  }
  return configuredUrl;
}

export default {
  APP_CORE_URL: resolveCoreUrl()
};
