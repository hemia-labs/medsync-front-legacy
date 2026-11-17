'use strict';
const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const output=process.env.NC1_QA_OUTPUT||path.join(__dirname,'../../../nc1-auth-evidence');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:33401');
  assert.equal((await context.request.get('http://127.0.0.1:33401/api/identity/patients/patient')).status(),401);
  await page.locator('input[type=password]').fill('NC1-Synthetic-Only-2026!');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:'Guardar ficha',exact:true}).waitFor();
  assert.ok((await context.cookies()).some(c=>c.name==='nc1_at'&&c.httpOnly));
  assert.equal((await context.request.patch('http://127.0.0.1:33401/api/identity/patients/patient',{data:{identity:{},expectedRevision:0}})).status(),403);
  assert.equal((await context.request.get('http://127.0.0.1:33401/api/identity/patients/foreign-patient')).status(),404);
  const writes=[];page.on('request',request=>{if(request.method()==='PUT' && new URL(request.url()).pathname==='/api/px/administrative')writes.push(request.postDataJSON());});
  await page.getByLabel('Nombres *',{exact:true}).fill('Ana'+width);
  await page.getByLabel('Celular *',{exact:true}).fill('5598765432');
  await page.getByLabel('Calle, número y colonia',{exact:true}).fill('Calle sintetica '+width);
  for(const label of ['Primer apellido','Segundo apellido']){
   await page.getByLabel(label,{exact:true}).fill(label==='Primer apellido'?'De la Prueba':'Ensayo');
  }
  await page.getByLabel('Fecha de nacimiento *',{exact:true}).fill('2000-01-31');
  await page.screenshot({path:path.join(output,'admin-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Guardar ficha',exact:true}).click();
  await page.getByText('Datos administrativos guardados',{exact:true}).waitFor();
  assert.equal(writes.length,1);assert.equal(writes[0].person.surname,'De la Prueba Ensayo');
  const fields=page.locator('.nc1-fields');
  const saved=await page.evaluate(()=>window.qaApi('qa/patient'));assert.equal(saved.data.address.direction,'Calle sintetica '+width);assert.equal(saved.data.person.telephone,'5598765432');
  await page.getByRole('button',{name:'Profesional',exact:true}).click();
  await page.getByRole('button',{name:'Guardar identidad',exact:true}).waitFor();
  await page.getByLabel('Nombre profesional',{exact:true}).fill('Profesional pendiente');
  await page.getByLabel('Universidad',{exact:true}).fill('Universidad sintetica '+width);
  await fields.getByLabel('Nombre(s)',{exact:true}).fill('Profesional'+width);
  await fields.locator('label').filter({hasText:'Primer apellido: situación'}).locator('select').selectOption('present');await fields.getByLabel('Primer apellido',{exact:true}).fill('De la Prueba');
  await fields.locator('label').filter({hasText:'Segundo apellido: situación'}).locator('select').selectOption('present');await fields.getByLabel('Segundo apellido',{exact:true}).fill('Ensayo');
  await page.getByRole('button',{name:'Guardar identidad',exact:true}).click();
  await page.getByRole('button',{name:'Usar identidad guardada',exact:true}).waitFor();
  await expect(page.getByLabel('Nombre profesional',{exact:true})).toHaveValue('Profesional pendiente');
  await page.screenshot({path:path.join(output,'professional-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Usar identidad guardada',exact:true}).click();
  await page.getByRole('button',{name:/Guardar perfil/}).click();
  await expect.poll(()=>page.evaluate(()=>window.qa.$refs.profile.hasUnsavedChanges)).toBe(false);
  const identity=await page.evaluate(()=>window.qaApi('api/identity/professionals/actor'));assert.equal(identity.data.givenNames,'Profesional'+width);assert.equal(identity.data.firstSurname,'De la Prueba');assert.equal(identity.data.secondSurname,'Ensayo');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await context.request.post('http://127.0.0.1:33401/qa/revoke');assert.equal((await context.request.get('http://127.0.0.1:33401/api/identity/patients/patient')).status(),401);
  assert.deepEqual(errors,[]);console.log('PASS authenticated NC1, R15, tenant, CSRF, revoked session, '+width+'px');await context.close();
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
