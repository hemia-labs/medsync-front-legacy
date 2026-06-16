import { DAC_AUTH_LOGIN, DAC_AUTH_CLOSE, DAC_AUTH_SENDOTP, DAC_AUTH_VALIDATEOTP, DAC_AUTH_UPDATEPWD, DAC_AUTH_REFRESH_TOKEN } from '../../common/apiurl';
import { DACore } from '../../config/axios.context'
import { isD2AuthMode } from '../../config/authTransport.config';
import DACsrfService from './DACsrfService';
import DASessionService from './DASessionService';

export default {

    /**
     * Función que permite realizar el login del usuario
     * @param {*} data Modelo de datos
     * @returns 
     */
    async login(data) {
        if(!isD2AuthMode()) {
            return DACore.post(DAC_AUTH_LOGIN, data);
        }

        try {
            await DACsrfService.ensureCsrfToken();
        } catch {
            return {
                success: false,
                message: 'No fue posible preparar la solicitud segura.'
            };
        }

        const loginResponse = await DACore.post(DAC_AUTH_LOGIN, data);

        if(!loginResponse || !loginResponse.success) {
            return loginResponse;
        }

        const sessionResponse = await DASessionService.bootstrapSession();

        return {
            ...loginResponse,
            d2Session: sessionResponse,
            data: {
                ...(loginResponse.data || {}),
                session: sessionResponse && sessionResponse.data ? sessionResponse.data : null
            }
        };
    },

    /**
     * Función que permite cerrar la sesión activa en backend
     * @returns
     */
    async close() {
        const closeResponse = await DACore.put(DAC_AUTH_CLOSE);

        if(isD2AuthMode()) {
            DACsrfService.clearCsrfToken();
        }

        return closeResponse;
    },

    /**
     * Función que permite mandar un código OTP para modificar contraseña
     * @param {*} data Modelo de datos
     * @returns 
     */
    async sendOtp(data) {
        return DACore.post(DAC_AUTH_SENDOTP, data);
    },

    /**
     * Función que permite validar el código OTP
     * @param {*} data Modelo de datos
     * @returns 
     */
    async validateOtp(data) {
        return DACore.post(DAC_AUTH_VALIDATEOTP, data);
    },

    /**
     * Función que permite validar el código OTP
     * @param {*} data Modelo de datos
     * @returns 
     */
    async updatePwd(data) {
        return DACore.put(DAC_AUTH_UPDATEPWD, data);
    },
    /**
     * Función que permite realizar el refrescado del token de sesión
     * @param {*} data Modelo de datos del refresh token
     * @returns 
     */
    async refreshToken(data) {
        if(isD2AuthMode()) {
            const refreshResponse = await DACore.post(DAC_AUTH_REFRESH_TOKEN, {});

            if(!refreshResponse || !refreshResponse.success) {
                return refreshResponse;
            }

            const sessionResponse = await DASessionService.bootstrapSession();

            return {
                ...refreshResponse,
                d2Session: sessionResponse,
                data: {
                    ...(refreshResponse.data || {}),
                    session: sessionResponse && sessionResponse.data ? sessionResponse.data : null
                }
            };
        }

        return DACore.post(DAC_AUTH_REFRESH_TOKEN, data);
    },

    async csrf() {
        return DACsrfService.ensureCsrfToken({ force: true });
    },

    async session() {
        return DASessionService.bootstrapSession();
    },

    clearCsrfToken() {
        DACsrfService.clearCsrfToken();
    }
}
