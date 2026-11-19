const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/views/Patient/Sections/components/ConsentSubstitutionPanel.vue', 'utf8');
const script = source.split('<script>')[1].split('</script>')[0].replace(/^import .*;\r?\n/gm, '').replace('export default', 'component =');
const service = {}, context = { DADocumentService: service, ConsentSubstitutionDialog: {}, window: { crypto: { randomUUID: () => 'request-' + (++sequence) } } };
let sequence = 0;
vm.runInNewContext(script, context);
const options = context.component;
const clone = value => JSON.parse(JSON.stringify(value));
const review = token => ({ substitution_token: token, documents: [], diagnostics: [], pairs: [], candidates: [{ refusal_id: 'refusal', signed_id: 'signed', can_authorize: true, predicted_status: 'FIRMADO' }] });
function fresh() {
    const state = { ...options.data(), patientId: 'patient', scope: 'doctor-business-revision1', $emit: () => {} };
    for (const [key, method] of Object.entries(options.methods)) state[key] = method.bind(state);
    state.review = review('a'); state.open = true; state.reason = 'Consentimiento revisado.'; state.refusalId = 'refusal'; state.signedId = 'signed'; state.requestId = 'request-qa';
    return state;
}
let posts;
const setup = () => { posts = []; service.getConsentReview = async () => ({ success: true, data: review('a') });
    service.substituteRefusal = async payload => { posts.push(clone(payload)); return { success: true, data: { ...review('b'), candidates: [] } }; }; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
(async () => {
    setup(); let state = fresh(); await state.authorize(); assert.equal(posts.length, 1); assert.equal(posts[0].expected_consent_token, 'a'); assert.equal(state.open, false);
    console.log('PASS one explicit authorization with reviewed token');
    for (const invalidate of [s => s.setOpen(false), s => { s.scope = 'another-account'; s.reset(); }, s => { s.attempt++; }]) {
        setup(); state = fresh(); const pending = deferred(); service.getConsentReview = () => pending.promise;
        const run = state.authorize(); invalidate(state); pending.resolve({ success: true, data: review('a') }); await run; assert.equal(posts.length, 0);
    }
    console.log('PASS cancel, another account and superseded attempts never send');
    setup(); state = fresh(); service.getConsentReview = async () => ({ success: true, data: review('b') }); await state.authorize();
    assert.equal(posts.length, 0); assert.equal(state.needsReview, true); assert.equal(state.reason, 'Consentimiento revisado.');
    await state.reviewAgain(); assert.equal(posts.length, 0); await state.authorize(); assert.equal(posts.length, 1);
    console.log('PASS concurrent change preserves reason and requires separate review and authorize');
    for (const status of [409, 0, 503, 403]) {
        setup(); state = fresh(); service.substituteRefusal = async body => { posts.push(body); return { success: false, status, message: 'Revisar estado' }; };
        await state.authorize(); assert.equal(posts.length, 1); assert.equal(state.open, true); assert.equal(state.reason, 'Consentimiento revisado.'); assert.equal(state.needsReview, true);
    }
    console.log('PASS conflicts, network and permissions preserve capture without retry');
    setup(); state = fresh(); state.review.candidates[0].can_authorize = false; await state.authorize(); assert.equal(posts.length, 0);
    setup(); state = fresh(); const pending = deferred(); service.getConsentReview = () => pending.promise;
    const first = state.authorize(); const second = state.authorize(); pending.resolve({ success: true, data: review('a') }); await Promise.all([first, second]); assert.equal(posts.length, 1);
    console.log('PASS unauthorized actor and double click');
    setup(); state = fresh(); let calls = 0; const old = deferred(); service.getConsentReview = async () => ++calls === 1 ? old.promise : { success: true, data: review('new') };
    const oldRead = state.refresh(); await state.refresh(); old.resolve({ success: true, data: review('old') }); await oldRead;
    assert.equal(state.review.substitution_token, 'new');
    console.log('PASS late reads cannot overwrite current consent');
    setup(); state = fresh(); const requestId = state.requestId;
    service.getConsentReview = async () => ({ success: true, data: { ...review('b'), pairs: [{ q: requestId, n: state.reason }] } });
    await state.reviewAgain(); assert.equal(posts.length, 0); assert.equal(state.open, false); assert.match(state.message, /ya está registrada/);
    console.log('PASS lost response recovered by explicit read without resubmitting');
})().catch(error => { console.error(error); process.exitCode = 1; });
