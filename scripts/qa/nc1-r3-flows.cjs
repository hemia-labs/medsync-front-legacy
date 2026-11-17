'use strict';
// NC1 R3/R15, updated for NC1 identidad integrada (operator decision): the separate identity editor and the
// «Nombre profesional» reconciliation no longer exist in the professional profile. Both flows are covered by
// their real-component suites: the administrative patient form (nc1-ux1/check) and the integrated
// professional profile with one atomic save (nc1-identity-integrated-profile).
const path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
for(const suite of ['scripts/qa/nc1-ux1/check.cjs','scripts/qa/nc1-identity-integrated-profile.cjs'])execFileSync(process.execPath,[path.join(root,suite)],{stdio:'inherit'});
console.log('PASS R3/R15 (identidad integrada): administrative patient form and integrated professional profile; synthetic services.');
