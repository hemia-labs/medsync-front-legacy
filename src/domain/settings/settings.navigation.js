const pendingConfirmations = new WeakMap();

// Opening/closing contextual help keeps the same editor and its unsaved draft.
export function isGuideOnlyNavigation(to, from) {
    if(!to || !from || to.path !== '/admin' || from.path !== to.path || to.hash !== from.hash) return false;
    const editorQuery = route => Object.keys(route.query || {}).filter(key => !['guide','resume','goal'].includes(key)).sort().map(key => [key,route.query[key]]);
    return JSON.stringify(editorQuery(to)) === JSON.stringify(editorQuery(from));
}

export async function confirmSettingsDiscard(view, { title = 'Tienes cambios sin guardar', text = 'Puedes seguir editando o descartar los cambios antes de salir.' } = {}) {
    if(pendingConfirmations.has(view)) return pendingConfirmations.get(view);
    const swal = view && view.$swal;
    if(!swal) return false;
    const prompt = (async () => {
        try {
            const options = {
                title, text, icon: 'warning', showCancelButton: true,
                confirmButtonText: 'Descartar cambios', cancelButtonText: 'Seguir editando',
                customClass: { confirmButton: 'medsync-alert-danger' },
                focusCancel: true, reverseButtons: true
            };
            const result = typeof swal.fire === 'function' ? await swal.fire(options) : await swal(options);
            return Boolean(result && result.isConfirmed);
        } catch(_) { return false; }
    })();
    pendingConfirmations.set(view, prompt);
    try { return await prompt; }
    finally { if(pendingConfirmations.get(view) === prompt) pendingConfirmations.delete(view); }
}

const cleanSessionLogin = (view, to) => {
    const auth = view && view.$store && view.$store.state && view.$store.state.CORE && view.$store.state.CORE.AUTH;
    return to && String(to.path || '').replace(/\/+$/, '') === '/auth/login'
        && auth && !auth.authenticated && !auth.user;
};

export function registerSettingsNavigationGuard(view, { hasChanges = () => false, isSaving = () => false, onDiscard } = {}) {
    let disposed = false;
    const beforeUnload = event => {
        if(!disposed && (isSaving() || hasChanges())) {
            event.preventDefault();
            event.returnValue = '';
        }
    };
    const removeRouteGuard = view.$router.beforeEach(async (to, from, next) => {
        if(disposed || cleanSessionLogin(view, to) || isGuideOnlyNavigation(to, from)) return next();
        if(isSaving()) return next(false);
        if(!hasChanges()) return next();
        const discard = await confirmSettingsDiscard(view);
        if(disposed || !discard || isSaving()) return next(false);
        try {
            if(onDiscard) await onDiscard();
            if(disposed || isSaving()) return next(false);
            next();
        } catch(_) { next(false); }
    });
    if(typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload);
    return () => {
        if(disposed) return;
        disposed = true;
        if(typeof removeRouteGuard === 'function') removeRouteGuard();
        if(typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
        if(pendingConfirmations.has(view) && view.$swal && typeof view.$swal.close === 'function') view.$swal.close();
    };
}
