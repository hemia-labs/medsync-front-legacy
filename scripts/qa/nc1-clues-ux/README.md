# Clinic information / CLUES QA

The approved screen uses the normal Vue 2 admin shell and `/admin?section=identity` route. `main.js` replaces transport only in this QA entrypoint; the production entrypoint does not import it.

Requires the backend CLUES-F1/CAT-O1 contract before integration: keyed creation, read-only `catalogAttributes`, and exact current lookup with `?exactCode=...`. Deploying/integrating is not part of this change's acceptance.

Start the synthetic preview:

```sh
node scripts/qa/nc1-clues-ux/serve.cjs
```

Open `http://127.0.0.1:4388/admin?section=identity&scenario=verified`. Scenarios also include `empty`, `manual`, `multi`, `inactive`, `load-error`, `stale`, `stale-missing`. Add `theme=night` for Clinical Night. No MySQL tunnel is needed.

Install Chromium for the repository's Playwright version, then run:

```sh
npx playwright install chromium
node scripts/qa/nc1-clues-ux/visual-review.cjs
node scripts/qa/nc1-clues-ux/recovery-review.cjs
node scripts/qa/nc1-clues-ux/implementation-review.cjs
```

The suites wait for HTTP readiness, preserve the approved visual/recovery assertions (32/12), and add 24 cases for T1 and the exact D-5 contract. T1 covers unchanged catalog reference, typing/restoring the same code, and selecting a catalog reference again in both widths/themes. D-5 covers read-only lookup, explicit minimal PATCH, catalog-release conflict with fresh confirmation, and nonoperating entries. Evidence goes to `NC1_QA_OUT`, or the system temp directory's `medsync-nc1-clues-qa` folder.

Implementation QA also covers I1 in 12 cases (36 total): repeated catalog changes reuse the operation key with a corrected capture, Cancel/Resume preserves it, a subsequent lost response freezes the corrected payload for replay, and other 409/403 responses never authorize replacing the original payload. `advanceCatalog=1` advances the synthetic release on each `catalog-409`; replay of an existing operation still precedes catalog validation.

I2 adds four cases (40 total), selecting the **first** matching menu entry after a release change. Guided search offers a single current result for the saved code; searching alone preserves the captured reference and performs no write. I1 also selects the first match and checks for duplicates. `nc1-catalog-capture.cjs` verifies unchanged non-guided behavior and preservation when results are absent or contain other codes.

Navigation and screenshots allow up to 60 seconds for the shared template's external Google Fonts stylesheet/font loading. UI action/assertion budgets remain 10/12 seconds. No external resource is blocked or replaced, and visual/recovery assertions are unchanged.

All data and failures are synthetic. These tests do not establish authenticated permissions, private-logo server upload, physical-device/accessibility-technology acceptance, or reload/other-tab draft recovery. Existing operator visual approval is preserved.
