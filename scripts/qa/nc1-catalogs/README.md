# NC1 catalog capture — local UI QA

Run `node scripts/qa/nc1-catalogs/serve.cjs` (Node 22, dependencies installed). It binds only to 127.0.0.1:4387 and uses the actual Vue2 store, shell, routes and forms with a synthetic transport. No shared test session, clinical data or source entries are used.

Entry points: `/px/new`, `/px/history/qa-patient`, `/admin?section=doctor-identity`, `/admin?section=identity&role=admin`. Query `theme=night` exercises the system dark theme; `catalogState=offline` simulates a catalog outage. Every synthetic catalog is labeled `QA sintético · no oficial` and must never be imported as an official dataset.

Observed at 1280 and 390: country search/selection and version, entity -> municipality -> locality filtering, manual nationality without a source, one professional-profile save, CLUES selection/save, dark contrast, and no horizontal overflow. A 503 preserves the establishment name and permits explicitly manual/unverified capture; retry stays available. The production component discards old searches/checks after a value or authorization change.

Screenshots and detailed results are in the workspace report `docs/normative-compliance/phases/PHASE_NC1_CATALOGS_CODEX_20261117.md` and its evidence directory. This is local shell QA, not a live authenticated test or operator visual acceptance. Backend runtime and nine-source installation were independently tested in disposable MySQL8.

Targeted tests: `node scripts/qa/nc1-catalog-capture.cjs`, `nc1-identity-ui.cjs`, `nc1-ux6-new-patient-identity.cjs`, `nc1-identity-integrated-profile.cjs`, `nc1-identity-review-regression.cjs`. Run lint and production build with the usual HTTPS/D2 configuration. New UI regression is wired into frontend CI.

Deployment dependency: backend catalog endpoint first, reviewed source installation second, frontend third. Missing sources remain unverified. RENAPO nationality is still unavailable; SEPOMEX shared reuse is pending review of the downloaded file's restrictions. No schema change, automatic import, CURP certification or DGIS export.
