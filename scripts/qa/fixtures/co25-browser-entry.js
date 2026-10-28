import core from '../../../src/services/config/core.instance';
import csrf from '../../../src/services/core/auth/DACsrfService';
import auth from '../../../src/services/core/auth/DAAuthService';
import registration from '../../../src/services/core/auth/DARegistrationService';
import store from './co25-store';
window.co25 = { core, csrf, auth, registration, store };
document.getElementById('save').onclick = async () => {
    const result = await core.post('api/appointment/save', {
        request_id: 'ui-stable-intent', revision: 7, description: document.getElementById('draft').value
    });
    document.getElementById('result').textContent = result.success ? 'Guardado' : result.message;
};
