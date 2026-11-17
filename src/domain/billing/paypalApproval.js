const sources = { sandbox: 'https://www.sandbox.paypal.com/web-sdk/v6/core', live: 'https://www.paypal.com/web-sdk/v6/core' };
let sdkPromise, sdkEnvironment;

export function paypalApproval(value) {
  if (!value || value.kind !== 'subscription' || typeof value.subscriptionId !== 'string' || !/^I-[A-Z0-9]{1,178}$/.test(value.subscriptionId)
    || typeof value.clientId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value.clientId)
    || typeof value.environment !== 'string' || !Object.prototype.hasOwnProperty.call(sources, value.environment)) return null;
  return { kind: 'subscription', subscriptionId: value.subscriptionId, clientId: value.clientId, environment: value.environment };
}

function loadSdk(environment) {
  // A page cannot mix sandbox and live SDK globals. The original approval link remains usable.
  if (sdkEnvironment && sdkEnvironment !== environment) return Promise.reject(new Error('PAYPAL_ENVIRONMENT_CHANGED'));
  if (sdkPromise) return sdkPromise;
  sdkEnvironment = environment;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = error => {
      if (finished) return; finished = true; clearTimeout(timeout); script.onload = script.onerror = null;
      if (error) { script.remove(); sdkPromise = null; reject(error); }
      else resolve(window.paypal);
    };
    const timeout = setTimeout(() => finish(new Error('PAYPAL_SDK_UNAVAILABLE')), 12000);
    script.src = sources[environment]; script.async = true;
    script.onload = () => finish(window.paypal && typeof window.paypal.createInstance === 'function' ? null : new Error('PAYPAL_SDK_UNAVAILABLE'));
    script.onerror = () => finish(new Error('PAYPAL_SDK_UNAVAILABLE'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export async function preparePayPalApproval(approval, currencyCode, callbacks) {
  const config = paypalApproval(approval);
  if (!config || !/^[A-Z]{3}$/.test(currencyCode)) throw new Error('PAYPAL_APPROVAL_UNAVAILABLE');
  const sdk = await loadSdk(config.environment);
  const instance = await sdk.createInstance({ clientId: config.clientId, components: ['paypal-subscriptions'], pageType: 'checkout' });
  const methods = await instance.findEligibleMethods({ paymentFlow: 'RECURRING_PAYMENT', currencyCode });
  if (!methods.isEligible('paypal')) throw new Error('PAYPAL_APPROVAL_UNAVAILABLE');
  return instance.createPayPalSubscriptionPaymentSession(callbacks);
}
