// Vuetify 2 does not forward aria-label/labelledby to its detached dialog wrapper.
const nameDialog = (element, binding) => {
    const dialog = element.closest('[role="dialog"]');
    if (!dialog) return;
    if (binding.value && binding.value.id) {
        dialog.setAttribute('aria-labelledby', binding.value.id);
        dialog.removeAttribute('aria-label');
    } else {
        dialog.setAttribute('aria-label', String(binding.value || ''));
    }
};
export default { inserted: nameDialog, componentUpdated: nameDialog };
