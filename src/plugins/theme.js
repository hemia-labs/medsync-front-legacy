const DEFAULT_THEME = {
  code: 'medical-blue',
  primary_100: '#E6F7FB',
  primary_200: '#CDEEF7',
  primary_300: '#A6E1F0',
  primary_500: '#55C3DD',
  primary_700: '#1497BD',
  primary_900: '#086783',
  primary_1000: '#064E63',
  secondary_500: '#F05252',
  secondary_700: '#C81E1E',
  terciary_500: '#64748B',
  forty_500: '#CBD5E1',
  grey: '#64748B',
  gray98: '#F8FAFC',
  red: '#DC2626'
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
  red: '--color-red'
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

const applyTheme = (theme = DEFAULT_THEME) => {
  const resolvedTheme = { ...DEFAULT_THEME, ...theme };
  const root = document.documentElement;

  Object.keys(cssVariableMap).forEach((key) => {
    root.style.setProperty(cssVariableMap[key], resolvedTheme[key]);
  });

  root.style.setProperty('--bg-box-shadow-primary', toShadow(resolvedTheme.primary_500, 0.25));
  root.style.setProperty('--bg-box-shadow-secondary', toShadow(resolvedTheme.secondary_500, 0.25));
  root.setAttribute('data-theme', resolvedTheme.code || DEFAULT_THEME.code);
};

export {
  DEFAULT_THEME,
  applyTheme
};
