// Only auth state/persistence is synthetic. Browser tests import real transports.
const auth = { authenticated: true, user: { id_login: 'qa-user', id_session: 'one' },
    business: { id_business: 'qa-clinic' }, permissions: ['px.dates'], accessRevision: 1 };
export default {
    state: { CORE: { AUTH: auth } },
    getters: { 'CORE/AUTH/isAuthorized': true },
    commit() {},
    dispatch: async () => null
};
