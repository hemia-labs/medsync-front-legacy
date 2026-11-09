import Vue from 'vue';

const DEFAULT_THEME = {
  code: 'medical-blue',
  primary_100: '#E6F0F8',
  primary_200: '#A7E0D1',
  primary_300: '#A7E0D1',
  primary_500: '#1C7FA7',
  primary_700: '#1C7FA7',
  primary_900: '#12294A',
  primary_1000: '#12294A',
  secondary_500: '#D64545',
  secondary_700: '#D64545',
  terciary_500: '#6E7C92',
  forty_500: '#DCE3EC',
  grey: '#4E5B70',
  gray98: '#F3F6F9',
  red: '#D64545',
  surface: '#FAFBFC',
  success: '#2FA36B',
  info: '#3B82C4',
  muted: '#8A94A6'
};

const cssVariableMap = {
  primary_100: '--color-primary-100',
  primary_200: '--color-primary-200',
  primary_300: '--color-primary-300',
  primary_500: '--color-primary-500',
  primary_700: '--color-primary-700',
  primary_900: '--color-primary-900',
  primary_1000: '--color-primary-1000',
  secondary_500: '--color-secondary-500',
  secondary_700: '--color-secondary-700',
  terciary_500: '--color-terciary-500',
  forty_500: '--color-forty-500',
  grey: '--color-grey',
  gray98: '--color-gray98',
  red: '--color-red',
  surface: '--color-surface',
  success: '--color-success',
  info: '--color-info',
  muted: '--color-muted'
};

const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  const parsed = parseInt(value.length === 3 ? value.split('').map((x) => x + x).join('') : value, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
};

const toShadow = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const themeState = Vue.observable({
  context: null,
  currentTheme: { ...DEFAULT_THEME },
  loaded: false,
  loading: false,
  hasPreview: false,
  loadError: false
});
let themeVersion = 0;
let pendingLoad = null;

const getThemeContext = auth => {
  if(!auth || !auth.authenticated) return 'public';
  return `tenant:${(auth.business || {}).id_business || (auth.user || {}).id_business || 'global'}`;
};

const validTheme = theme => Boolean(theme && typeof theme.code === 'string'
  && typeof theme.primary_700 === 'string' && /^#[0-9a-f]{6}$/i.test(theme.primary_700));

const renderTheme = theme => {
  // The built-in palette is owned here; the API may still return its older colors.
  const resolvedTheme = theme && theme.code === DEFAULT_THEME.code
    ? { ...DEFAULT_THEME }
    : { ...DEFAULT_THEME, ...theme };
  themeState.currentTheme = resolvedTheme;
  if(typeof document === 'undefined') return;
  const root = document.documentElement;

  Object.keys(cssVariableMap).forEach((key) => {
    root.style.setProperty(cssVariableMap[key], resolvedTheme[key]);
    const { r, g, b } = hexToRgb(resolvedTheme[key]);
    root.style.setProperty(`${cssVariableMap[key]}-rgb`, `${r}, ${g}, ${b}`);
  });

  root.style.setProperty('--bg-box-shadow-primary', toShadow(resolvedTheme.primary_500, 0.25));
  root.style.setProperty('--bg-box-shadow-secondary', toShadow(resolvedTheme.secondary_500, 0.25));
  root.setAttribute('data-theme', resolvedTheme.code || DEFAULT_THEME.code);
};

const syncThemeContext = context => {
  if(themeState.context === context) return;
  themeVersion += 1;
  pendingLoad = null;
  themeState.context = context;
  themeState.loaded = false;
  themeState.loading = false;
  themeState.hasPreview = false;
  themeState.loadError = false;
  renderTheme(DEFAULT_THEME);
};

// User selection takes precedence over all reads already in flight and over
// background refreshes until it is saved or the tenant/session context changes.
const applyTheme = theme => {
  if(!validTheme(theme)) return false;
  themeVersion += 1;
  themeState.hasPreview = true;
  themeState.loading = false;
  renderTheme(theme);
  return true;
};

const themeFromResponse = response => response && response.success && Array.isArray(response.data) ? response.data[0] : null;
const restoreThemePreview = theme => {
  if(!validTheme(theme)) return false;
  themeVersion += 1;
  themeState.hasPreview = false;
  themeState.loading = false;
  renderTheme(theme);
  return true;
};
const currentRequest = (context, version, isCurrent) => themeState.context === context && themeVersion === version && isCurrent();

const loadTheme = (context, read, isCurrent, { force = false } = {}) => {
  syncThemeContext(context);
  if(themeState.hasPreview || (themeState.loaded && !force)) {
    return Promise.resolve({ success: true, data: [themeState.currentTheme], themeAccepted: true });
  }
  if(pendingLoad && pendingLoad.context === context && pendingLoad.version === themeVersion) return pendingLoad.promise;
  const request = { context, version: themeVersion, promise: null };
  themeState.loading = true;
  request.promise = (async () => {
    try {
      let response = await read();
      // Auth may renew access or discard a read from an earlier permission
      // revision. Retry once only while this tenant/selection remains current.
      if(response && response.data && ['AUTH_ACCESS_EXPIRED', 'AUTH_CONTEXT_CHANGED'].includes(response.data.code)
        && currentRequest(context, request.version, isCurrent)) response = await read();
      if(!currentRequest(context, request.version, isCurrent)) return { ...response, themeAccepted: false };
      const theme = themeFromResponse(response);
      if(validTheme(theme)) {
        renderTheme(theme);
        themeState.loaded = true;
        themeState.loadError = false;
        return { ...response, themeAccepted: true };
      }
      themeState.loadError = true;
      return { ...response, themeAccepted: false };
    } catch(error) {
      if(currentRequest(context, request.version, isCurrent)) themeState.loadError = true;
      return { success: false, themeAccepted: false, message: 'No fue posible cargar el tema.' };
    } finally {
      if(currentRequest(context, request.version, isCurrent)) themeState.loading = false;
      if(pendingLoad === request) pendingLoad = null;
    }
  })();
  pendingLoad = request;
  return request.promise;
};
const saveTheme = async (context, write, isCurrent) => {
  syncThemeContext(context);
  const version = ++themeVersion;
  themeState.hasPreview = true;
  themeState.loading = false;
  const response = await write();
  const theme = themeFromResponse(response);
  const accepted = currentRequest(context, version, isCurrent) && validTheme(theme);
  if(accepted) {
    renderTheme(theme);
    themeState.loaded = true;
    themeState.hasPreview = false;
    themeState.loadError = false;
  }
  return { ...response, themeAccepted: accepted };
};

export {
  DEFAULT_THEME,
  applyTheme,
  restoreThemePreview,
  themeState,
  getThemeContext,
  syncThemeContext,
  loadTheme,
  saveTheme
};
