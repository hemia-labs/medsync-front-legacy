// NC5 · Interfaz del chat para Notas (Seguimiento). Contrato: docs/normative-compliance/contracts/NC5_CHAT_INTERNO_V1.md §3.
// Notas es dueño del botón «Avisar al equipo» y de la referencia; el chat elige destinatario, muestra la vista previa y envía.
import DAChatService from '../../services/core/chat/DAChatService';
import { chatState, newRequestId } from './chatState';

/**
 * Abre el compositor «Avisar al equipo». Siempre se resuelve, nunca se rechaza.
 * context.kind 'evolution_note' (nota formal firmada: patientId + noteId) o 'tracing' (seguimiento existente: patientId + tracingId).
 * @param {{context:{kind:'evolution_note'|'tracing',patientId:string,noteId?:string,tracingId?:string,professionalId?:string,reason?:string}, clientRequestId?:string, returnFocus?:HTMLElement}} options
 * @returns {Promise<{status:'sent'|'cancelled'|'failed', clientRequestId:string, messageId?:string, recipient?:{id:string,name:string}, sentAt?:string, replayed?:boolean, retryable?:boolean, code?:string, message?:string}>}
 */
export function openTeamNotice(options = {}) {
    const clientRequestId = options.clientRequestId || newRequestId();
    const context = options.context || {};
    const reference = context.kind === 'evolution_note' ? context.noteId : context.kind === 'tracing' ? context.tracingId : null;
    if (!reference || !context.patientId) {
        return Promise.resolve({ status: 'failed', retryable: false, code: 'CHAT_CONTEXT_INVALID', message: 'Falta la referencia de la nota.', clientRequestId });
    }
    if (chatState.composer) {
        return Promise.resolve({ status: 'failed', retryable: true, code: 'CHAT_COMPOSER_BUSY', message: 'Ya hay un aviso abierto.', clientRequestId });
    }
    if (!chatState.scope) {
        return Promise.resolve({ status: 'failed', retryable: false, code: 'CHAT_UNAVAILABLE', message: 'El chat no está disponible en esta sesión.', clientRequestId });
    }
    return new Promise(resolve => {
        let settled = false;
        chatState.composer = {
            context: { ...context },
            clientRequestId,
            returnFocus: options.returnFocus || (typeof document !== 'undefined' ? document.activeElement : null),
            resolve(result) {
                if (settled) return;
                settled = true;
                resolve({ clientRequestId, ...result });
            }
        };
    });
}

/** Recupera el resultado de un envío propio por su identificador. */
export async function teamNoticeStatus(clientRequestId) {
    const response = await DAChatService.request(clientRequestId);
    if (!response.success) return { found: false, error: true };
    const data = response.data || {};
    if (!data.found) return { found: false };
    const m = data.message;
    return { found: true, message: { id: m.messageId, recipient: m.recipient, sentAt: m.sentAt, readAt: m.readAt } };
}

/** Avisos enviados desde una nota, con enviado y leído. Requiere acceso a Seguimiento. kind: 'evolution_note' | 'tracing'. */
export async function teamNoticesForContext(kind, reference) {
    const response = await DAChatService.noticesForContext(kind, reference);
    return response.success ? ((response.data || {}).items || []) : [];
}

export function teamNoticesForTracing(tracingId) { return teamNoticesForContext('tracing', tracingId); }

// QA local de NC5: permite simular la nota de Seguimiento desde la consola. Webpack elimina este bloque en producción.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    window.__nc5Chat = { openTeamNotice, teamNoticeStatus, teamNoticesForContext, teamNoticesForTracing };
}
