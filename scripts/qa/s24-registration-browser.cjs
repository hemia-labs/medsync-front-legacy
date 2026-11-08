'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium,expect}=require('playwright/test');
const root=path.resolve(__dirname,'../../..'),origin='http://127.0.0.1:4338';
async function run(fixture) {
  const evidence=path.join(root,'docs/saas-platform/phases/evidence/S24_R3');await fs.mkdir(evidence,{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const checks=[],runtimeErrors=[],contexts=[];let seq=1;
  const fresh=async(viewport={width:1440,height:900})=>{
    const context=await browser.newContext({viewport});contexts.push(context);const page=await context.newPage();
    page.on('pageerror',error=>runtimeErrors.push(error.message));
    page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().startsWith('Failed to load resource:')&&!msg.text().includes('net::ERR_FAILED'))runtimeErrors.push(msg.text());});
    return page;
  };
  const fill=async(page)=>{
    const number=seq++,data={name:'Administradora',lastName:'de prueba',businessName:'Consultorio de prueba',email:`r3-${number}@example.test`,password:' Una frase extensa para QA '+number+' '};
    data.confirmPassword=data.password;
    for(const [key,value] of Object.entries(data))await page.locator('#register-'+key).fill(value);
    return data;
  };
  const accept=async page=>{
    for(const checkbox of await page.locator('.registration-legal-choice input[type=checkbox]').all()) {
      await checkbox.check();
      await expect(checkbox).toHaveAttribute('aria-checked','true');
    }
  };
  const submit=page=>page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  const assertNoOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No horizontal overflow');
  const screenshot=async(page,name)=>{
    if(name.startsWith('legal-'))await expect(page.locator('.v-dialog--active')).toHaveCSS('transform','none');
    return page.screenshot({path:path.join(evidence,name+'.png'),fullPage:!name.startsWith('legal-'),animations:'disabled'});
  };
  try {
    const page=await fresh();
    await page.clock.install();
    await page.goto(origin+'/login');
    await expect(page.getByRole('link',{name:'Probar gratis 15 días',exact:true})).toBeVisible();await screenshot(page,'login-desktop');
    await page.getByRole('link',{name:'Probar gratis 15 días',exact:true}).click();
    await expect(page.locator('#register-name')).toBeVisible();
    assert.equal(await page.locator('form input:not([type=checkbox])').count(),6);
    assert.equal(await page.locator('input[type=checkbox]:checked').count(),0);
    await screenshot(page,'registro-desktop');
    await submit(page);await expect(page.locator('#register-email')).toBeFocused();
    const data=await fill(page);await submit(page);await expect(page.locator('.registration-legal-choice input[type=checkbox]').first()).toBeFocused();
    await page.locator('.registration-legal-link').first().click();
    await expect(page.locator('#registration-legal-title')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.registration-legal-link').first()).toBeFocused();
    await expect(page.locator('#register-name')).toHaveValue(data.name);
    checks.push('Real app login CTA, own route, six fields, unchecked legal, first-error focus, dialog Escape/focus and preserved form');
    const requests=[];page.on('request',request=>{if(request.url().includes(':4337/'))requests.push(new URL(request.url()).pathname);});
    await accept(page);await submit(page);
    await page.waitForURL('**/activar-cuenta');await expect(page.locator('#email-code')).toBeVisible();
    assert.equal(fixture.deliveries.length,1,'The first code is sent before opening verification');
    assert.ok((await page.context().cookies()).filter(cookie=>['s24_qa_at','s24_qa_rt'].includes(cookie.name)).every(cookie=>cookie.httpOnly));
    await screenshot(page,'verificacion-desktop');
    const wrong='111111';
    const first=fixture.deliveries.at(-1);
    await page.reload();await expect(page.locator('#email-code')).toBeVisible();
    assert.equal(fixture.deliveries.length,1,'Reload restores the pending challenge without resending');
    await page.locator('#email-code').fill(first.code===wrong?'222222':wrong);
    await page.getByRole('button',{name:'Verificar correo',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('no es válido');
    await expect(page.getByRole('button',{name:'Corregir mi correo',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Usar otra cuenta',exact:true})).toBeVisible();
    await expect(page.locator('main')).toContainText(data.email);
    // Age only the synthetic challenge and advance the browser cooldown.
    await fixture.db.query('UPDATE registration_contact_challenge SET created_at=DATE_SUB(NOW(3),INTERVAL 61 SECOND) WHERE challenge_id=:id',{replacements:{id:first.challengeId}});
    await page.clock.fastForward(61000);
    await page.getByRole('button',{name:'Reenviar código',exact:true}).click();
    await expect.poll(()=>fixture.deliveries.length).toBe(2);
    await page.locator('#email-code').fill(fixture.deliveries.at(-1).code);
    await page.getByRole('button',{name:'Verificar correo',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Tu correo está verificado',exact:true})).toBeVisible();
    await screenshot(page,'correo-verificado');
    for(const route of ['/inicio','/admin?section=summary','/register','/login']) {
      await page.goto(origin+route);await page.waitForURL('**/activar-cuenta');await expect(page.getByRole('heading',{name:'Tu correo está verificado',exact:true})).toBeVisible();
    }
    assert.ok(requests.every(url=>url.startsWith('/api/account/')||url.startsWith('/api/auth/')||url==='/api/registration/context'),'Pending account never requests clinical or theme APIs');
    const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
    assert.ok(!storage.includes(data.password)&&!storage.includes(first.code));
    checks.push('Real MySQL registration/autosession HttpOnly D2, email only, incorrect OTP, switch-account option, resend, reload, restricted route reentry, no clinical/onboarding calls');
    await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.waitForURL('**/login');
    await page.getByLabel('Correo electrónico',{exact:true}).fill(data.email);await page.getByLabel('Contraseña',{exact:true}).fill(data.password);
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/activar-cuenta');
    await expect(page.getByRole('heading',{name:'Tu correo está verificado',exact:true})).toBeVisible();
    checks.push('Normal email login after logout resumes verified pending account');

    for(const width of [390,320]) {
      const mobile=await fresh({width,height:844});await mobile.goto(origin+'/login');
      await expect(mobile.getByRole('link',{name:'Probar gratis 15 días',exact:true})).toBeVisible();await assertNoOverflow(mobile);await screenshot(mobile,'login-'+width);
      await mobile.getByRole('link',{name:'Probar gratis 15 días',exact:true}).click();await expect(mobile.locator('#register-name')).toBeVisible();await assertNoOverflow(mobile);
      await screenshot(mobile,'registro-'+width);
      await mobile.locator('.registration-legal-link').nth(1).click();await expect(mobile.locator('#registration-legal-title')).toBeVisible();await assertNoOverflow(mobile);await screenshot(mobile,'legal-'+width);
      await mobile.getByRole('button',{name:'Cerrar documento',exact:true}).click();
      await fill(mobile);await accept(mobile);await submit(mobile);await mobile.waitForURL('**/activar-cuenta');await assertNoOverflow(mobile);await screenshot(mobile,'verificacion-'+width);
      await expect(mobile.locator('#email-code')).toBeVisible();await assertNoOverflow(mobile);
      await mobile.locator('#email-code').fill(fixture.deliveries.at(-1).code);await mobile.getByRole('button',{name:'Verificar correo',exact:true}).click();
      await expect(mobile.getByRole('heading',{name:'Tu correo está verificado',exact:true})).toBeVisible();await assertNoOverflow(mobile);await screenshot(mobile,'verificado-'+width);
    }
    checks.push('Real browser desktop 1440x900 and mobile 390/320px: login, form, legal dialog, verification and verified screen without horizontal overflow');

    const partial=await fresh();fixture.controls.sessionFails=true;
    await partial.goto(origin+'/register');await expect(partial.locator('#register-name')).toBeVisible();const partialData=await fill(partial);await accept(partial);await submit(partial);
    await expect(partial.getByText('Tu cuenta está creada.',{exact:false})).toBeVisible();fixture.controls.sessionFails=false;
    assert.equal(await partial.locator('#register-password').count(),0);
    await partial.getByRole('link',{name:'Iniciar sesión',exact:true}).first().click();
    await partial.getByLabel('Correo electrónico',{exact:true}).fill(partialData.email);await partial.getByLabel('Contraseña',{exact:true}).fill(partialData.password);
    await partial.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await partial.waitForURL('**/activar-cuenta');
    checks.push('Real post-commit session failure keeps account and recovers through email login without re-registration');

    const errors=await fresh();await errors.goto(origin+'/register');await expect(errors.locator('#register-name')).toBeVisible();const errorData=await fill(errors);await accept(errors);
    let firstContext=true;
    await errors.route('**/api/registration/context',async route=>{
      const response=await route.fetch(),body=await response.json();if(firstContext){body.legalDocuments[0].versionId='outdated';firstContext=false;}
      await route.fulfill({response,json:body});
    });
    await errors.reload();await expect(errors.locator('#register-name')).toBeVisible();for(const [key,value]of Object.entries(errorData))await errors.locator('#register-'+key).fill(value);await accept(errors);await submit(errors);
    await expect(errors.getByRole('alert')).toContainText('documentos cambiaron');
    await expect(errors.locator('#register-password')).toHaveValue(errorData.password);assert.equal(await errors.locator('input[type=checkbox]:checked').count(),1);
    await errors.unroute('**/api/registration/context');await accept(errors);
    const keys=[];let failOnce=true;
    await errors.route('**/api/auth/register',async route=>{
      keys.push(route.request().headers()['idempotency-key']);
      if(failOnce){
        failOnce=false;const before=await errors.context().cookies();const committed=await route.fetch();assert.equal(committed.status(),201);
        // Lose the response and its new session cookies, retaining the signed attempt.
        await errors.context().clearCookies();await errors.context().addCookies(before);await route.abort();
      }else await route.continue();
    });
    await submit(errors);await expect(errors.getByRole('alert')).toContainText('confirmar el resultado');await expect(errors.locator('#register-password')).toHaveValue(errorData.password);
    await submit(errors);await errors.waitForURL('**/activar-cuenta');assert.equal(keys[0],keys[1]);
    const [createdRows]=await fixture.db.query('SELECT COUNT(*) n FROM login WHERE telephone=:phone',{replacements:{phone:errorData.telephone}});assert.equal(createdRows[0].n,1);
    checks.push('Real stale legal rejection refreshes published version and unchecks only changed document; lost post-commit response/cookies preserves fields/idempotency key and replay creates no duplicate');

    const unavailable=await fresh();process.env.REGISTRATION_ENABLED='false';
    const flagResponse=unavailable.waitForResponse(response=>response.url().endsWith('/api/registration/context'));
    await unavailable.goto(origin+'/login');await flagResponse;
    assert.equal(await unavailable.getByRole('link',{name:'Probar gratis 15 días',exact:true}).count(),0);
    await unavailable.goto(origin+'/register');await expect(unavailable.getByRole('status')).toContainText('no está disponible');
    process.env.REGISTRATION_ENABLED='true';await unavailable.getByRole('button',{name:'Volver a consultar',exact:true}).click();await expect(unavailable.locator('#register-name')).toBeVisible();
    checks.push('Real server flag hides login CTA and direct registration provides unavailable/retry instead of broken form');
    assert.deepEqual(runtimeErrors,[]);
    const result={result:'PASS',database:fixture.database,scope:'Full Vue app + real HTTP/SQL/cookies; synthetic mail and public branding; explicit network/context fault injection',checks,runtimeErrors:0,externalEmails:0,productionWrites:0};
    await fs.writeFile(path.join(evidence,'browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } catch(error) {
    const last=contexts.at(-1);if(last&&last.pages()[0])await last.pages()[0].screenshot({path:path.join(root,'_qa/s24-r3/failure.png'),fullPage:true});
    console.error('Completed groups:',checks.length,'Runtime errors:',JSON.stringify(runtimeErrors));throw error;
  } finally {await browser.close();}
}
module.exports={run};
