export const DEFAULT_LOGIN_LOGO_KEY = 'hemia_login_logo';

export const getStoredLoginLogo = () => {
    try {
        return window.localStorage.getItem(DEFAULT_LOGIN_LOGO_KEY);
    } catch (error) {
        return null;
    }
};

export const setStoredLoginLogo = (logo) => {
    try {
        if (logo) {
            window.localStorage.setItem(DEFAULT_LOGIN_LOGO_KEY, logo);
        } else {
            window.localStorage.removeItem(DEFAULT_LOGIN_LOGO_KEY);
        }
    } catch (error) {
        // Storage can be unavailable in private contexts.
    }
};

export const getLoginImageData = (response) => {
    if (!response || !response.success || !response.data) {
        return null;
    }

    const row = Array.isArray(response.data) ? response.data[0] : response.data;
    return row && row.image_data ? row.image_data : null;
};
