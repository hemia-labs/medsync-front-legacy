import Vue from 'vue';
// Vuetify updates its messages in a watcher; associate them after that update.
const describeField = (element, binding) => {
    const input = element.querySelector('input, textarea, select');
    const messages = element.querySelector('.v-messages');
    if (!input) return;
    input.setAttribute('aria-required', String(binding.value.required !== false));
    input.setAttribute('aria-invalid', String(Boolean(binding.value.invalid)));
    if (messages && messages.textContent.trim()) {
        messages.id = `${binding.value.id}-errors`;
        const descriptions = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        input.setAttribute('aria-describedby', [...new Set([...descriptions, messages.id])].join(' '));
    } else {
        const descriptions = (input.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== `${binding.value.id}-errors`);
        if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' '));
        else input.removeAttribute('aria-describedby');
    }
};
const afterRender = (element, binding) => Vue.nextTick(() => describeField(element, binding));
export default { inserted: afterRender, componentUpdated: afterRender };
