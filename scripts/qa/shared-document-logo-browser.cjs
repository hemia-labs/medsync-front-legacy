'use strict';
// Real application shell and services; isolated synthetic HTTP/storage only.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium,expect}=require('@playwright/test');
const {createFixture}=require('./clinical-sections-fixture.cjs');
const front='http://127.0.0.1:4397',api='http://127.0.0.1:4398';
const output=path.resolve(process.argv[2] || 'shared-logo-evidence');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
// Valid tiny PNG, never a real clinic logo.
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
const data='data:image/png;base64,'+image.toString('base64');
const doctors=['one','two'].map((id,index)=>({id_doctor_professional_profile:id,id_login:index?'second':'qa-clinical-admin',professional_profile_active:1,professional_name:'Profesional de prueba '+(index+1),professional_license:'123456',signature_image:data}));
const format=id=>({id_prescription_config:'config-'+id,doctor_profile_id:id,doctor_profile:doctors.find(d=>d.id_doctor_professional_profile===id),clinic_name:'Consultorio de prueba',clinic_address:'Domicilio sintético 123',clinic_phone:'5512345678',header_image:'LEGACY-HEADER',template_mode:'background',background_image:data,background_opacity:.1});
async function fixtureContext(browser,origin,{width,night,role='admin',logo=data,failRead=false}={}){
 const state={logo,failRead,failSave:'',writes:[],reads:0,formats:Object.fromEntries(doctors.map(d=>[d.id_doctor_professional_profile,format(d.id_doctor_professional_profile)]))};
 await fetch(origin+'/qa/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({theme:night?'clinical-night':'medical-blue'})});
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===front)return route.continue();
  if(url.origin!==api)return route.abort();
  const headers={'access-control-allow-origin':front,'access-control-allow-credentials':'true','access-control-allow-headers':'Content-Type, X-CSRF-Token, Authorization','access-control-allow-methods':'GET, POST, PUT, DELETE, OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const send=(value,status=200)=>route.fulfill({status,headers,json:{status,success:status===200,data:value,message:status===403?'Permiso denegado':'Consulta sintética'}});
  if(url.pathname==='/api/auth/session'){
   const raw=await (await fetch(origin+url.pathname)).json(),session=raw.data;
   return send({...session,role:role==='admin'?'admin':'doctor',user:{...session.user,rol:role==='admin'?'admin':'doctor'},permissions:['prescriptions.config','px.view',...(role!=='doctor'?['admin.config','admin.users']:[])]});
  }
  if(url.pathname==='/api/business/current'){
   state.reads++;if(state.failRead)return send(null,503);
   return send({id_business:'qa-clinic',name:'Consultorio de prueba',phone:'5512345678',address:'Domicilio sintético',logoUrl:state.logo,canManageLogo:role==='admin'});
  }
  if(url.pathname==='/api/business/current/logo'){
   state.writes.push({url:url.pathname,body:req.postDataJSON()});
   if(state.failSave==='403')return send(null,403);
   state.logo=req.postDataJSON().image;
   if(state.failSave==='lost')return send(null,503);
   return send({id_business:'qa-clinic',logoUrl:state.logo});
  }
  if(url.pathname==='/api/prescription/doctors')return send(doctors);
  if(url.pathname==='/api/prescription/config')return send(state.formats[url.searchParams.get('doctor_profile_id') || 'one']);
  if(url.pathname==='/api/prescription/config/save'){
   const body=req.postDataJSON();state.writes.push({url:url.pathname,body});
   assert.ok(!Object.hasOwn(body,'header_image'),'Recipe save must not write the old header');
   state.formats[body.doctor_profile_id]={...state.formats[body.doctor_profile_id],...body};return send(state.formats[body.doctor_profile_id]);
  }
  if(req.method()!=='GET'){state.writes.push({unexpected:url.pathname});return send(null,400);}
  return route.fulfill({response:await route.fetch({url:origin+url.pathname+url.search})});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(front+'/admin?section=prescriptions');
 const panel=page.locator('.document-logo-panel');await expect(panel).toBeVisible();
 await expect(page.getByRole('button',{name:'Guardar recetas',exact:true})).toBeEnabled();
 return {context,page,panel,state,errors};
}
async function main(){
 await fs.mkdir(output,{recursive:true});const fixture=createFixture(front);await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+fixture.address().port,browser=await chromium.launch({headless:true,channel:'chromium'}),results=[];
 try{
  for(const width of [1280,390])for(const night of [false,true])for(const role of ['admin','doctor','config-only']){
   const {context,page,panel,state,errors}=await fixtureContext(browser,origin,{width,night,role});
   try{
    await expect(panel.getByRole('img')).toBeVisible();
    assert.equal(await panel.locator('input[type=file]').count(),0);
    assert.equal(await panel.getByRole('link',{name:'Cambiar logo en Apariencia'}).count(),role==='admin'?1:0);
    const frame=page.frameLocator('iframe[title*="formato de receta"]');
    await expect(frame.locator('img.document-logo')).toHaveAttribute('src',data);
    await expect(frame.locator('img.document-logo')).toBeVisible();
    if(role==='admin'){
     await page.locator('iframe[title*="formato de receta"]').scrollIntoViewIfNeeded();
     await page.locator('iframe[title*="formato de receta"]').screenshot({path:path.join(output,`${width}-${night?'night':'light'}-prescription.png`)});
    }
    assert.deepEqual(state.writes,[]);assert.deepEqual(errors,[]);
    const size=await page.locator('html').evaluate(el=>({scroll:el.scrollWidth,width:innerWidth}));assert.ok(size.scroll<=size.width+1,JSON.stringify(size));
    await panel.screenshot({path:path.join(output,`${width}-${night?'night':'light'}-${role}.png`)});
    if(role==='admin')await page.screenshot({path:path.join(output,`${width}-${night?'night':'light'}-shell.png`),fullPage:true});
    state.logo='';await page.reload();await expect(panel.getByRole('heading',{name:'Logo para documentos'})).toBeVisible();
    if(role==='admin')await expect(panel.getByRole('button',{name:'Elegir imagen'})).toBeVisible();
    else{await expect(panel.getByText('Aún no hay logo para documentos.',{exact:false})).toBeVisible();assert.equal(await panel.locator('input[type=file]').count(),0);}
    results.push({width,night,role,result:'PASS'});
   }finally{await context.close();}
  }
  for(const width of [1280,390]){
   const {context,page,panel,state,errors}=await fixtureContext(browser,origin,{width,night:width===390,logo:'',failRead:true});
   try{
    await expect(panel.getByRole('button',{name:'Reintentar',exact:true})).toBeVisible();assert.equal(await panel.locator('input[type=file]').count(),0);
    state.failRead=false;await panel.getByRole('button',{name:'Reintentar',exact:true}).click();
    const file=panel.locator('input[type=file]');await file.setInputFiles({name:'invalid.gif',mimeType:'image/gif',buffer:bytes});await expect(panel.getByRole('alert')).toContainText('hasta 5 MB');
    await file.setInputFiles({name:'too-big.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});await expect(panel.getByRole('alert')).toContainText('hasta 5 MB');
    await file.setInputFiles({name:'logo.png',mimeType:'image/png',buffer:image});
    await expect(panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true})).toBeEnabled();
    await page.getByLabel('Configuración de recetas del doctor').click();await page.getByRole('option',{name:'Profesional de prueba 2'}).click();
    await expect(panel.getByText('Imagen lista para guardar')).toBeVisible();
    if(width===390)await page.getByRole('button',{name:'Apartados de configuración',exact:true}).click();
    await page.getByRole('button',{name:'Apariencia',exact:true}).click();await page.getByRole('button',{name:'Seguir editando',exact:true}).click();await expect(panel.getByText('Imagen lista para guardar')).toBeVisible();
    await panel.getByRole('button',{name:'Cancelar selección'}).click();assert.deepEqual(state.writes,[]);
    await file.setInputFiles({name:'logo.png',mimeType:'image/png',buffer:image});state.failSave='403';
    await panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('No tienes permiso');
    state.failSave='lost';await panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Actualizar imagen');
    await expect(panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true})).toBeDisabled();assert.equal(state.writes.length,2);
    await panel.getByRole('button',{name:'Actualizar imagen',exact:true}).click();await expect(panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true})).toBeEnabled();assert.equal(state.writes.length,2);
    await panel.getByRole('button',{name:'Cancelar selección'}).click();await expect(panel.getByRole('link',{name:'Cambiar logo en Apariencia'})).toBeVisible();
    // A new explicit save succeeds once, independently of the doctor's format.
    state.logo='';state.failSave='';await page.reload();await panel.locator('input[type=file]').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:image});
    await panel.getByRole('button',{name:'Guardar logo del consultorio',exact:true}).click();await expect(panel.getByRole('link',{name:'Cambiar logo en Apariencia'})).toBeVisible();assert.equal(state.writes.length,3);
    await page.getByLabel('Consultorio o clínica (opcional)').fill('Nombre para esta receta');await page.getByRole('button',{name:'Guardar recetas',exact:true}).click();
    await expect.poll(()=>state.writes.length).toBe(4);assert.ok(!Object.hasOwn(state.writes[3].body,'header_image'));
    await panel.getByRole('link',{name:'Cambiar logo en Apariencia'}).click();await expect(page.getByRole('heading',{name:'Logo para documentos',exact:true})).toBeVisible();
    await expect(page.locator('.private-logo__preview img')).toHaveAttribute('src',data);
    assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,`${width}-appearance-after-save.png`),fullPage:true});results.push({width,flow:'upload, permissions, uncertain recovery, navigation, doctor switch, separate saves, appearance',result:'PASS'});
   }finally{await context.close();}
  }
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({result:'PASS',results,limits:'Synthetic HTTP and storage in real shell. No real S3, account or authenticated QA.'},null,2));console.log('PASS shared document logo browser: '+results.length+' shell scenarios; '+output);
 }finally{await browser.close();await new Promise(r=>fixture.close(r));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
