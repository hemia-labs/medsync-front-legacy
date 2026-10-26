import legalRoutes from '../router/routes/legal';
import signatureRoutes from '../router/routes/public-signature';

// Use the route declarations without importing the router/store (circular deps).
export function isPublicAuthPath(pathname, base = process.env.BASE_URL || '/') {
    let path = String(pathname || '').replace(/\/$/, '') || '/';
    const prefix = String(base).replace(/\/$/, '');
    if(prefix && path.startsWith(prefix + '/')) path = path.slice(prefix.length);
    if(path === '/auth' || path.startsWith('/auth/')) return true;
    return [...legalRoutes, ...signatureRoutes].some(route => {
        if(route.meta && route.meta.requireAuth !== false) return false;
        const pattern = route.path.split('/').map(part => part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
        return new RegExp('^' + pattern + '$').test(path);
    });
}
