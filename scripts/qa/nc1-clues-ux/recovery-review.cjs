// Codex independent review of af17232. Synthetic local shell only; no backend, MySQL or real session.
// The first four probes replace the obsolete selectors/assertions from the 2aac06c review.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const OUT = process.env.NC1_QA_OUT || path.join(require('node:os').tmpdir(), 'medsync-nc1-clues-qa');
fs.mkdirSync(OUT, { recursive: true });
const out = OUT, report = [];
const btn = (p, name) => p.getByRole('button', { name, exact: true });
const input = p => p.locator('.health-units [data-field="displayName"] input');
const base = 'http://127.0.0.1:4388/admin?section=identity';
const draft = 'Borrador posterior que debe conservarse';
async function open(p, query, night) {
  await p.goto(base + query + (night ? '&theme=night' : ''));
  await p.locator('.health-units').waitFor();
  await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.loading);
}
async function idle(p) { await p.waitForFunction(() => !document.querySelector('.health-units').__vue__.busy); }
async function apply(p) {
  await btn(p, 'Actualizar a la versión vigente…').click();
  await p.locator('.swal2-container').waitFor();
  await btn(p, 'Actualizar referencia').click();
  await idle(p);
}
async function snapshot(p) {
  return p.evaluate(() => {
    const vm = document.querySelector('.health-units').__vue__;
    return { serverUnits: window.qaState.units, writes: window.qaLog,
      editor: vm.editing, form: vm.form, pending: vm.pending, dirty: vm.dirty, revision: vm.revision,
      confirmedDraft: vm.confirmedDraft, detailErrors: vm.detailErrors, details: vm.details, revalidation: vm.reval,
      visibleText: document.querySelector('.health-units').innerText };
  });
}
async function uncertainCreate(p, night) {
  await open(p, '&scenario=empty&fail=network-create&detailFail=u-new-1:503', night);
  await btn(p, 'Registrar la unidad del consultorio').click();
  await btn(p, 'Guardar unidad').click();
  await p.getByText('No se confirmó el registro.', { exact: false }).waitFor();
  await input(p).fill(draft);
  await btn(p, 'Comprobar y completar el registro').click();
  await btn(p, 'Reintentar lectura').waitFor();
  await idle(p);
}
const cases = {
  async r1ConfirmedCreateDetailFails(p, night) {
    await uncertainCreate(p, night);
    const failedRead = await snapshot(p);
    await btn(p, 'Reintentar lectura').click(); await idle(p);
    const recoveredRead = await snapshot(p);
    await btn(p, 'Guardar unidad').click();
    await p.getByText('Unidad guardada.', { exact: false }).waitFor();
    const saved = await snapshot(p);
    return { failedRead, recoveredRead, saved, checks: {
      retainedAfterFailure: failedRead.editor === 'u-new-1' && failedRead.form.displayName === draft && failedRead.pending.confirmedId === 'u-new-1',
      revisionFromConfirmedResponse: failedRead.revision === 1 && failedRead.dirty,
      readingPreservesDraftWithoutWriting: recoveredRead.form.displayName === draft && recoveredRead.writes.length === 2,
      originalPayloadReplayed: JSON.stringify(saved.writes[0].payload) === JSON.stringify(saved.writes[1].payload) && saved.writes[0].key === saved.writes[1].key,
      explicitPatchOnly: saved.writes.map(x => x.method).join(',') === 'post,post,patch' && saved.writes[2].payload.expectedRevision === 1,
      oneUnitAndDraftSaved: saved.serverUnits.length === 1 && saved.serverUnits[0].displayName === draft && saved.pending === null
    } };
  },
  async d5ConflictCloseRecheck(p, night) {
    await open(p, '&scenario=stale&fail=409', night);
    await btn(p, 'Comprobar con la versión vigente').click();
    await btn(p, 'Actualizar a la versión vigente…').waitFor();
    await apply(p);
    await p.waitForFunction(() => { const v = document.querySelector('.health-units').__vue__; return !v.busy && v.reval.state === 'found' && Boolean(v.reval.notice); });
    const first = await snapshot(p);
    await p.locator('.unit-reval').getByRole('button', { name: /^Cerrar/ }).click();
    await btn(p, 'Comprobar con la versión vigente').click();
    await btn(p, 'Actualizar a la versión vigente…').waitFor();
    const reopened = await snapshot(p);
    await apply(p);
    await p.waitForFunction(() => document.querySelector('.health-units').__vue__.reval === null);
    const second = await snapshot(p);
    return { first, reopened, second, checks: {
      freshRevisionAndNotice: first.details['u-centro'].revision === 4 && Boolean(first.revalidation.notice),
      noAutomaticRetry: first.writes.length === 1 && reopened.writes.length === 1,
      reopenedUsesFreshRevision: reopened.details['u-centro'].revision === 4,
      secondConfirmationUsesFreshRevision: second.writes.length === 2 && second.writes[0].payload.expectedRevision === 3 && second.writes[1].payload.expectedRevision === 4,
      onlyCluesWritten: second.writes.every(x => x.method === 'patch' && Object.keys(x.payload.identity).join() === 'cluesRef'),
      otherPersonNamePreserved: second.serverUnits[0].displayName.endsWith('(editado por otra persona)')
    } };
  },
  async d5ResponseLostAfterCommit(p, night) {
    await open(p, '&scenario=stale', night);
    // Independent fault: let the existing synthetic PATCH succeed, then lose only its response.
    await p.evaluate(() => {
      let req;
      window.webpackJsonp.push([['codex-r3-fault'], { 'codex-r3-fault': function(m, e, r) { req = r; } }, [['codex-r3-fault']]]);
      const id = Object.keys(req.c).find(k => /axios.context/.test(k));
      const core = req.c[id].exports.DACore, original = core.patch;
      let once = true;
      core.patch = async (...args) => { const result = await original(...args); if (once && result.success) { once = false; throw new Error('synthetic response lost after commit'); } return result; };
    });
    await btn(p, 'Comprobar con la versión vigente').click();
    await btn(p, 'Actualizar a la versión vigente…').waitFor();
    await apply(p);
    await btn(p, 'Comprobar lo guardado').waitFor();
    const afterLoss = await snapshot(p);
    const noApply = await btn(p, 'Actualizar a la versión vigente…').count() === 0;
    await btn(p, 'Cerrar (resultado sin confirmar)').click();
    const closed = await snapshot(p);
    await btn(p, 'Comprobar con la versión vigente').click();
    await p.waitForFunction(() => document.querySelector('.health-units').__vue__.reval.state === 'same');
    const reopened = await snapshot(p);
    return { afterLoss, closed, reopened, checks: {
      committedButUncertain: afterLoss.serverUnits[0].revision === 4 && afterLoss.revalidation.uncertain,
      noApplyWhileUncertain: noApply,
      uncertaintySurvivesClose: closed.visibleText.includes('actualización de la referencia CLUES sin confirmar'),
      readsActualCommittedReference: reopened.revalidation.state === 'same' && reopened.details['u-centro'].revision === 4,
      noSecondWrite: reopened.writes.length === 1
    } };
  },
  async r1ForbiddenRetryMessage(p, night) {
    await open(p, '&scenario=empty&fail=network-create,403', night);
    await btn(p, 'Registrar la unidad del consultorio').click();
    await btn(p, 'Guardar unidad').click();
    await p.getByText('No se confirmó el registro.', { exact: false }).waitFor();
    await btn(p, 'Comprobar y completar el registro').click();
    await p.getByText('El reintento fue rechazado:', { exact: false }).waitFor();
    const rejected = await snapshot(p);
    await input(p).fill(draft);
    const edited = await snapshot(p);
    return { rejected, edited, checks: {
      originalMayHaveCommitted: rejected.serverUnits.length === 1 && rejected.visibleText.includes('sigue sin confirmar') && !rejected.visibleText.includes('No se guardó'),
      bannerPersistsWhileTyping: edited.visibleText.includes('Registro sin confirmar:') && Boolean(edited.pending) && edited.form.displayName === draft,
      noAutomaticReplay: edited.writes.length === 2
    } };
  },
  async r1ConfirmedDraftComponentRemount(p, night) {
    await uncertainCreate(p, night);
    await input(p).fill(draft + ' más reciente');
    const before = await snapshot(p);
    // Controlled lifecycle test, NOT normal navigation: the normal navigation guard requires explicit discard.
    // Toggle the existing parent condition to destroy/mount the actual component, without calling discard.
    await p.evaluate(async () => {
      let parent = document.querySelector('.health-units').__vue__.$parent;
      while (parent && !Object.prototype.hasOwnProperty.call(parent.$data, 'businessInfoLoading')) parent = parent.$parent;
      if (!parent) throw new Error('configuration parent missing');
      parent.businessInfoLoading = true; await parent.$nextTick();
      parent.businessInfoLoading = false; await parent.$nextTick();
    });
    await p.waitForFunction(() => { const e = document.querySelector('.health-units'); return e && e.__vue__.confirmedDraft && !e.__vue__.loading; });
    const remounted = await snapshot(p);
    const parentGuard = await p.evaluate(() => { let v = document.querySelector('.health-units').__vue__.$parent; while (v && !v.healthUnitsState) v = v.$parent; return v && v.healthUnitsState; });
    await btn(p, 'Guardar unidad').click();
    await p.getByText('Unidad guardada.', { exact: false }).waitFor();
    const saved = await snapshot(p);
    return { before, remounted, parentGuard, saved, checks: {
      latestDraftRestored: remounted.form.displayName === draft + ' más reciente',
      sameConfirmedUnitAndRevision: remounted.editor === 'u-new-1' && remounted.revision === 1 && remounted.pending.confirmedId === 'u-new-1',
      guardRestored: Boolean(parentGuard.dirty && parentGuard.editing),
      remountDoesNotWrite: remounted.writes.length === 2,
      explicitPatchNoCreate: saved.writes.map(x => x.method).join(',') === 'post,post,patch' && saved.serverUnits.length === 1 && saved.serverUnits[0].displayName === draft + ' más reciente'
    } };
  },
  async d5ReadsChangedCluesBeforeComparison(p, night) {
    await open(p, '&scenario=stale', night);
    // Another writer changes the CLUES after the summary was loaded, before checking it.
    await p.evaluate(() => { window.qaState.units[0].cluesRef.code = 'QASSA000303'; window.qaState.units[0].revision = 8; });
    await btn(p, 'Comprobar con la versión vigente').click();
    await btn(p, 'Actualizar a la versión vigente…').waitFor();
    const compared = await snapshot(p);
    await apply(p);
    await p.waitForFunction(() => document.querySelector('.health-units').__vue__.reval === null);
    const saved = await snapshot(p);
    return { compared, saved, checks: {
      comparesFreshClues: compared.details['u-centro'].cluesRef.code === 'QASSA000303' && compared.revalidation.current.ref.code === 'QASSA000303',
      freshRevision: compared.details['u-centro'].revision === 8,
      checkDoesNotWrite: compared.writes.length === 0,
      confirmationTargetsFreshReference: saved.writes.length === 1 && saved.writes[0].payload.expectedRevision === 8 && saved.writes[0].payload.identity.cluesRef.code === 'QASSA000303'
    } };
  }
};
(async () => {
  await require('./ready.cjs')();
  const browser = await chromium.launch({ headless: true });
  for (const [width, night] of [[1280, false], [390, true]]) for (const [name, fn] of Object.entries(cases)) {
    const p = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    p.setDefaultTimeout(10000);
    const errors = []; p.on('pageerror', e => errors.push(String(e)));
    const item = { name, width, theme: night ? 'night' : 'light' };
    try { item.observation = await fn(p, night); }
    catch (e) { item.harnessError = String(e); }
    item.errors = errors;
    item.overflowPx = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    item.screenshot = name + '-' + width + '.png'; await p.screenshot({ path: out + '/' + item.screenshot, fullPage: true });
    item.pass = !item.harnessError && !errors.length && item.overflowPx <= 0 && Object.values(item.observation.checks).every(Boolean);
    report.push(item); console.log(name, width, item.pass ? 'PASS' : JSON.stringify({ error: item.harnessError, checks: item.observation && item.observation.checks, errors }));
    await p.close();
  }
  await browser.close();
  fs.writeFileSync(out + '/cross-failure-report-r3.json', JSON.stringify(report, null, 2));
  if (report.some(r => !r.pass)) process.exitCode = 1;
})();
