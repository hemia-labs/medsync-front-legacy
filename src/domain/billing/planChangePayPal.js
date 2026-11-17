import { planChangePaymentUrl } from './planChange';
import { checkoutAttemptId } from './checkout';

const messageType = 'medsync.plan-change.paypal-return';

export function returnFromPlanChangePayPal(id, result) {
  if (!window.opener || window.opener === window || !checkoutAttemptId(id) || !['approved', 'cancelled'].includes(result)) return false;
  try {
    window.opener.postMessage({ type: messageType, attemptId: id, result }, window.location.origin);
    return true;
  } catch (_) { return false; }
}

export function openPlanChangePayPal({ onReturn, onClose }) {
  const popup = window.open('about:blank', '_blank', 'popup=yes,width=520,height=720,resizable=yes,scrollbars=yes');
  if (!popup) throw new Error('PAYPAL_POPUP_BLOCKED');
  let attemptId = '', settled = false, returning = false;
  const cleanup = () => { settled = true; clearInterval(timer); window.removeEventListener('message', receive); };
  const close = () => { cleanup(); if (!popup.closed) popup.close(); };
  const receive = event => {
    const data = event.data;
    if (settled || returning || event.source !== popup || event.origin !== window.location.origin || !attemptId || !data
      || data.type !== messageType || data.attemptId !== attemptId || !['approved', 'cancelled'].includes(data.result)) return;
    returning = true;
    Promise.resolve().then(() => onReturn({ attemptId, result: data.result })).then(keepOpen => {
      returning = false;
      if (!settled && keepOpen !== true) close();
    }, close);
  };
  const timer = setInterval(() => { if (!settled && popup.closed) { cleanup(); onClose(); } }, 500);
  window.addEventListener('message', receive);
  try { popup.document.title = 'PayPal · MedSync'; popup.document.body.textContent = 'Preparando la ventana segura de PayPal…'; } catch (_) { /* The provider may already own the window. */ }
  return {
    close,
    navigate(url, id) {
      if (settled || popup.closed || !planChangePaymentUrl(url) || !checkoutAttemptId(id)) throw new Error('PAYPAL_POPUP_UNAVAILABLE');
      attemptId = id; popup.location.replace(url); popup.focus();
    }
  };
}
