'use strict';
// Complement to the SQL/browser suite: long legal text, hostile formatting,
// reduced viewport and reflow on the full app. API responses are explicit doubles.
const {chromium,expect}=require('playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const evidence=path.resolve(__dirname,'../../../docs/saas-platform/phases/evidence/S24_R3');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
  try {
    for(const width of [1440,390,320]) {
      const context=await browser.newContext({viewport:{width,height:width===1440?900:844}}),page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://127.0.0.1:4337/**',route=>route.fulfill({json:route.request().url().endsWith('/registration/context')
        ?{enabled:true,legalDocuments:['terms_conditions','privacy_notice'].map(documentKey=>({documentKey,versionId:'qa-visual-v1',contentHash:'qa',title:documentKey==='privacy_notice'?'Aviso de privacidad · Prueba':'Términos · Prueba',
          contentHtml:'<script>window.legalUnsafe=true</script><img src=x onerror="window.legalUnsafe=true"><a href="javascript:alert(1)">Enlace de prueba</a>'+'<p>Texto sintético para comprobar la lectura y el desplazamiento. No es un documento contractual.</p>'.repeat(35)}))}
        :{success:true,data:{authenticated:false}}}));
      await page.goto('http://127.0.0.1:4338/auth/registro');
      await page.locator('#register-name').fill('Nombre conservado');
      await page.getByRole('button',{name:'Leer aviso de privacidad',exact:true}).click();
      await expect(page.locator('.v-dialog--active')).toHaveCSS('transform','none');
      const body=page.locator('.flow-legal__body');
      assert.equal(await body.locator('script,img,[onerror],a[href^="javascript:"]').count(),0);
      assert.equal(await page.evaluate(()=>Boolean(window.legalUnsafe)),false);
      const close=page.getByRole('button',{name:'Volver al registro',exact:true});
      const rect=await close.boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=page.viewportSize().height);
      await body.focus();await page.keyboard.press('End');
      await page.screenshot({path:path.join(evidence,'legal-'+width+'.png'),animations:'disabled'});
      await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Leer aviso de privacidad',exact:true})).toBeFocused();
      await expect(page.locator('#register-name')).toHaveValue('Nombre conservado');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      if(width===390){
        await page.setViewportSize({width,height:420});await page.locator('#register-email').focus();await page.locator('#register-email').scrollIntoViewIfNeeded();
        await expect(page.locator('#register-email')).toBeFocused();await page.getByRole('button',{name:'Crear cuenta',exact:true}).scrollIntoViewIfNeeded();
        const button=await page.getByRole('button',{name:'Crear cuenta',exact:true}).boundingBox();assert.ok(button.y>=0&&button.y+button.height<=420);
      }
      if(width===1440){
        await page.setViewportSize({width:720,height:450});await page.locator('#privacy_notice').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(evidence,'registro-720-reflow.png'),fullPage:true,animations:'disabled'});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);
    const result={result:'PASS',scope:'Full app, API doubles for synthetic long/hostile legal document; browser 1440/390/320; 390x420 reduced viewport and 720x450 reflow, not a physical keyboard or native browser zoom',checks:['sanitized legal','long document scroll with visible close control','Escape and return focus','form retained','no horizontal overflow','reduced viewport can reach email and submit','no runtime exceptions']};
    await fs.writeFile(path.join(evidence,'visual.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
