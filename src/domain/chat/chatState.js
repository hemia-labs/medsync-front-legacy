// NC5 · Estado del chat interno, aislado por negocio y usuario de la sesión.
// Si cambia la sesión o el negocio, todo se reinicia: nada de una cuenta se muestra en la otra.
import Vue from 'vue';

export const REASONS = Object.freeze([
    { code: 'control', label: 'Control' },
    { code: 'tratamiento', label: 'Tratamiento' },
    { code: 'revision', label: 'Revisión' },
    { code: 'otro', label: 'Otro' }
]);

const blank = () => ({
    scope: null,
    unread: 0,
    lastId: 0,
    panelOpen: false,
    panelView: 'inbox',
    peer: null,
    composer: null,
    changes: 0
});

export const chatState = Vue.observable(blank());

export function resetChat(scope = null) {
    const composer = chatState.composer;
    Object.assign(chatState, blank(), { scope });
    // Un aviso abierto de la sesión anterior se cierra sin enviar.
    if (composer && composer.resolve) composer.resolve({ status: 'cancelled', clientRequestId: composer.clientRequestId });
}

export function newRequestId() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

export function failure(response) {
    const status = Number(response && response.status) || 0;
    const code = (response && response.data && response.data.code) || (status ? 'HTTP_' + status : 'NETWORK');
    const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
    const messages = {
        CHAT_RECIPIENT_INVALID: 'Esa persona ya no está activa en este consultorio. Elige a otro colega.',
        CHAT_CONTEXT_INVALID: 'La nota ya no está disponible para avisar.',
        CHAT_CONTEXT_UNAVAILABLE: 'Las notas firmadas aún no están disponibles en este entorno.',
        CHAT_CONTEXT_FORBIDDEN: 'No tienes acceso a los seguimientos de este paciente.',
        CHAT_REQUEST_CONFLICT: 'Este aviso ya se envió con otros datos. Cierra y vuelve a abrirlo.',
        AUTH_CONTEXT_CHANGED: 'Tu sesión cambió. Vuelve a abrir el chat.'
    };
    return {
        code, retryable,
        message: messages[code] || (retryable ? 'No se pudo confirmar el envío. Revisa tu conexión y reintenta.' : (response && response.message) || 'No fue posible completar la solicitud.')
    };
}

export function openPanel(peer = null) {
    chatState.peer = peer;
    chatState.panelView = peer ? 'thread' : 'inbox';
    chatState.panelOpen = true;
}

export function closePanel() { chatState.panelOpen = false; }

export function markChanged() { chatState.changes += 1; }
