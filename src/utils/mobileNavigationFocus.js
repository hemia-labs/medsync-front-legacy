export function containNavigationFocus(drawer, close) {
    const doc = drawer.ownerDocument;
    const focusable = () => [...drawer.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
        .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    const focusFirst = () => (focusable()[0] || drawer).focus();
    const keydown = event => {
        if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
        if(event.key !== 'Tab') return;
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if(!items.length) { event.preventDefault(); drawer.focus(); }
        else if(event.shiftKey && (doc.activeElement === first || !items.includes(doc.activeElement))) { event.preventDefault(); last.focus(); }
        else if(!event.shiftKey && (doc.activeElement === last || !items.includes(doc.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const focusin = event => { if(!drawer.contains(event.target)) focusFirst(); };
    doc.addEventListener('keydown', keydown, true);
    doc.addEventListener('focusin', focusin, true);
    // Vuetify opens the temporary drawer in its own update cycle.
    // Wait until that render is visible before moving focus into it.
    const ensureInitialFocus = () => { if(!drawer.contains(doc.activeElement)) focusFirst(); };
    const opened = event => { if(event.target === drawer) ensureInitialFocus(); };
    drawer.addEventListener('transitionend', opened);
    const initialFocus = doc.defaultView.requestAnimationFrame(ensureInitialFocus);
    return () => {
        doc.defaultView.cancelAnimationFrame(initialFocus);
        drawer.removeEventListener('transitionend', opened);
        doc.removeEventListener('keydown', keydown, true);
        doc.removeEventListener('focusin', focusin, true);
    };
}
