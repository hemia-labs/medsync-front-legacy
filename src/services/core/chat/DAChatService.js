// NC5 · Chat interno. El servidor toma remitente y negocio de la sesión; nunca se envían aquí.
import { DACore } from '../../config/axios.context';

const enc = encodeURIComponent;

export default {
    directory() { return DACore.get('api/chat/directory'); },
    summary() { return DACore.get('api/chat/summary'); },
    conversations() { return DACore.get('api/chat/conversations'); },
    messages(peerId, { after, before } = {}) {
        const query = after !== undefined ? `?after=${enc(after)}` : before !== undefined ? `?before=${enc(before)}` : '';
        return DACore.get(`api/chat/conversations/${enc(peerId)}/messages${query}`);
    },
    markRead(peerId, upToId) { return DACore.post(`api/chat/conversations/${enc(peerId)}/read`, { upToId }); },
    sendText(recipientId, clientRequestId, body) { return DACore.post('api/chat/messages', { recipientId, clientRequestId, body }); },
    previewNotice(recipientId, context, reason) { return DACore.post('api/chat/notices/preview', { recipientId, context, reason }); },
    sendNotice(payload) { return DACore.post('api/chat/notices', payload); },
    request(clientRequestId) { return DACore.get(`api/chat/requests/${enc(clientRequestId)}`); },
    noticesForContext(kind, reference) { return DACore.get(`api/chat/notices/context/${enc(kind)}/${enc(reference)}`); }
};
