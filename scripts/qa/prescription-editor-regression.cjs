const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/domain/prescriptions/prescription.editor.js'), 'utf8');
    const editor = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const previousTZ = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
    assert.equal(editor.localDate(new Date('2026-10-13T01:00:00Z')), '2026-10-12');
    process.env.TZ = 'UTC';
    assert.equal(editor.localDate(new Date('2026-10-13T01:00:00Z')), '2026-10-13');
    if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;

    const form = editor.emptyForm('qa-patient');
    form.issuer_doctor_id = 'qa-doctor';
    assert.equal(editor.validate(form, false).length, 0, 'Incomplete drafts remain allowed');
    assert.equal(editor.validate(form, true).length, 5, 'All missing issue fields are reported together');
    form.items[0].generic_name = '   ';
    assert.equal(editor.validate(form, true).length, 5, 'Whitespace cannot satisfy a required field');
    const item = editor.emptyItem({ concentration: 'QA', indications: 'Line 1\nLine 2', dose: 'FICTITIOUS' });
    assert.equal(item.detailsOpen, true, 'Existing optional details stay visible when editing');
    form.items = [item];
    assert.equal(editor.payload(form).items[0].indications, 'Line 1\nLine 2');
    assert.equal('local_id' in editor.payload(form).items[0], false);

    let status = 'draft', saveCalls = 0, issueCalls = 0, creates = 0;
    const service = {
        async save(data) { saveCalls++; if (!data.id_prescription) creates++; return { success: true, data: { id_prescription: 'qa-rx', folio: 'QA-001', status: 'draft' } }; },
        async getById(id) { assert.equal(id, 'qa-rx'); return { success: true, data: { id_prescription: id, status } }; },
        async issue(id) { issueCalls++; assert.equal(id, 'qa-rx'); return { success: false, message: 'Temporary failure' }; }
    };
    let draftSeen = false;
    const failed = await editor.saveAndIssue(service, form, () => { draftSeen = true; assert.equal(form.id_prescription, 'qa-rx'); });
    assert.equal(failed.success, false);
    assert.match(failed.message, /Borrador QA-001 guardado/);
    assert.equal(draftSeen, true);
    await editor.saveAndIssue(service, form, () => {});
    assert.equal(creates, 1, 'Retry must reuse the saved draft');
    assert.equal(saveCalls, 2);
    assert.equal(issueCalls, 2);

    service.issue = async () => { status = 'issued'; throw new Error('Response lost after commit'); };
    const reconciled = await editor.saveAndIssue(service, form, () => {});
    assert.equal(reconciled.success, true);
    assert.equal(reconciled.data.status, 'issued');
    const savedBeforeRetry = saveCalls;
    await editor.saveAndIssue(service, form, () => {});
    assert.equal(saveCalls, savedBeforeRetry, 'Already issued documents must never be saved again');
    status = 'cancelled';
    assert.equal((await editor.saveAndIssue(service, form, () => {})).success, false);
    assert.equal(saveCalls, savedBeforeRetry);

    const fresh = editor.emptyForm('qa-patient');
    const saveFailure = await editor.saveAndIssue({ save: async () => ({ success: false, message: 'Save failed' }), issue: async () => assert.fail('Must not issue after save failure') }, fresh, () => assert.fail('Must not mark an unsuccessful save'));
    assert.equal(saveFailure.success, false);
    assert.equal(fresh.id_prescription, '');
    const recovered = editor.emptyForm('qa-patient', '99999999-1919-4191-8191-999999999999');
    const alreadyIssued = await editor.saveAndIssue({
        save: async data => { assert.equal(data.create_request_id, recovered.create_request_id); return { success: true, data: { id_prescription: recovered.create_request_id, status: 'issued' } }; },
        issue: async () => assert.fail('Recovered issued creation cannot issue twice')
    }, recovered, () => assert.fail('An issued recovery is not announced as a new draft'));
    assert.equal(alreadyIssued.data.status, 'issued');
    assert.equal(recovered.id_prescription, recovered.create_request_id);
    console.log('PASS prescription editor: local date, validation, optional data, multiline directions, failed emission retry, lost response reconciliation, terminal statuses and save failure.');
})().catch(error => { console.error(error); process.exitCode = 1; });
