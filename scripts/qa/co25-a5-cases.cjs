'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{randomUUID}=require('node:crypto');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const code=r=>r.body?.data?.code||r.body?.code;
async function api(page,endpoint,method='GET',body,secure=true){
  return page.evaluate(async({endpoint,method,body,secure})=>{
    const headers={'Content-Type':'application/json'};
    if(method!=='GET'&&secure){const r=await fetch('/api/auth/csrf',{credentials:'include'});const csrf=await r.json();headers[csrf.data.headerName]=csrf.data.csrfToken;}
    const r=await fetch('/api/'+endpoint,{method,credentials:'include',headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:r.status,body:await r.json()};
  },{endpoint,method,body,secure});
}
async function run({f,browser,out,pass,errors,failures,attempt=1}){
  // Diagnostic reruns share one private server; start a new rate-limit window, as a fresh run would.
  // The real middleware and its normal limits remain active for all requests in the attempt.
  if(attempt>1){assert.equal(process.env.NODE_ENV,'test');require('../../../hemia-assistance-back-legacy/src/middleware/authRateLimit.middleware')._private.buckets.clear();}
  const contexts=[],pages={};let active;
  const day=n=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date(Date.now()+(n+attempt*14)*86400000));
  const label='A5 '+Date.now();
  const clinicalDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date(Date.now()+2*86400000));
  async function login(role,mobile=false){
    const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});contexts.push(context);
    await context.route('**/*',route=>route.request().url().startsWith(f.origin)?route.continue():route.abort());
    const page=await context.newPage();active=page;pages[role]=page;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error'&&/TypeError|ReferenceError|Error in .*hook|Error in v-on/.test(message.text()))errors.push(message.text().slice(0,500));});
    page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failures.push({role,path:new URL(r.url()).pathname,status:r.status()});});
    await page.goto(f.origin+'/auth/login');await page.locator('input[autocomplete=username]').fill(f.actors[role].phone);await page.locator('input[autocomplete=current-password]').fill(f.actors[role].password);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));await page.locator('form button[type=submit]').click();assert.equal((await response).status(),200,'Real password login: '+role);
    await page.waitForURL(url=>!url.pathname.includes('login'),{timeout:25000});
    assert.equal((await api(page,'auth/session')).status,200);
    const cookies=await context.cookies();for(const suffix of ['_at','_rt']){const c=cookies.find(c=>c.name.endsWith(suffix));assert.ok(c&&c.httpOnly&&c.secure&&c.sameSite==='Lax','Protected cookie '+suffix);}
    assert.equal(await page.evaluate(()=>/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\./.test(JSON.stringify({...localStorage,...sessionStorage}))),false,'No JWT in browser storage');
    return page;
  }
  async function agenda(page,date){active=page;await page.goto(f.origin+'/px/dates');await page.getByRole('heading',{name:'Gestion de citas',exact:true}).waitFor();await page.waitForLoadState('networkidle');if(date){await page.getByLabel('Fecha',{exact:true}).fill(date);await page.getByLabel('Fecha',{exact:true}).press('Tab');await page.waitForLoadState('networkidle');}await page.getByRole('button',{name:'Lista',exact:true}).click();await page.waitForLoadState('networkidle');}
  async function open(page,name){await page.getByText(name,{exact:true}).first().click();await page.getByRole('button',{name:'Guardar',exact:true}).waitFor();}
  const appointment=(extra={})=>({doctorProfileId:f.doctor,patientName:label,contactPhone:'+525555550012',date:day(1),startTime:'09:00',endTime:'09:30',status:'confirmed',...extra});
  const save=(page,a,extra={})=>api(page,'appointment/save','POST',{appointment:a,request_id:randomUUID(),...extra});
  try{
    const reception=await login('reception');
    const seeded=await save(reception,appointment());assert.equal(seeded.status,200,seeded.body.message);const manual=seeded.body.data[0];
    await agenda(reception,manual.date);await open(reception,label);
    assert.equal(await reception.getByRole('button',{name:'Seguimientos',exact:true}).count(),0);
    await reception.getByLabel('Descripción',{exact:true}).fill('Captura privada '+label);
    await reception.getByRole('button',{name:'Registrar paciente',exact:true}).click();await reception.getByRole('button',{name:'Continuar al registro',exact:true}).click();
    await reception.getByRole('heading',{name:'Nuevo paciente',exact:true}).waitFor();
    await reception.getByLabel('Nombre *',{exact:true}).fill(label);await reception.getByLabel('Apellido paterno *',{exact:true}).fill('Sintetico');await reception.getByLabel('Fecha de nacimiento *',{exact:true}).fill('2000-01-01');await reception.getByLabel('Teléfono / celular *',{exact:true}).fill('5555550012');
    const creationState=await reception.evaluate(()=>{const find=v=>v&&typeof v.createPatient==='function'?v:(v?.$children||[]).map(find).find(Boolean);const vm=find(document.querySelector('#app')?.__vue__?.$root);return vm?{current:vm.creationCurrent(),alive:vm.alive,allowed:vm.hasPermission('px.new'),accessChanged:vm.accessChanged,errors:vm.formErrors,contextRevision:vm.creationContext?.revision,revision:vm.$store.state.CORE.AUTH.accessRevision}:null;});assert.ok(creationState&&creationState.current,JSON.stringify(creationState));
    let createCount=0;await reception.route('**/api/px/create-minimal',async route=>{createCount++;await route.fetch();await route.abort('failed');});
    await reception.getByRole('button',{name:'Crear paciente',exact:true}).click();await reception.getByRole('button',{name:'Consultar resultado del alta',exact:true}).click();
    await reception.getByRole('heading',{name:'Vincular paciente a la cita',exact:true}).waitFor();assert.equal(createCount,1);
    await reception.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();await reception.getByRole('heading',{name:'Vincular paciente a la cita',exact:true}).waitFor({state:'hidden'});
    const linked=await api(reception,'appointment/'+manual.id);assert.equal(linked.status,200);assert.ok(linked.body.data.patientId);const patient=linked.body.data.patientId;
    assert.equal(linked.body.data.contactPhone,manual.contactPhone);assert.equal(linked.body.data.description||'','');assert.equal(await reception.getByLabel('Descripción',{exact:true}).inputValue(),'Captura privada '+label);
    await reception.screenshot({path:path.join(out,'a5-reception-return.png'),animations:'disabled'});
    pass('AC09/AC13 reception: real minimal creation, lost committed response, GET recovery, explicit link and preserved draft');
    await reception.getByRole('button',{name:'Abrir expediente',exact:true}).click();await reception.getByRole('button',{name:/Conservar.*abrir/}).click();
    await reception.waitForURL(/\/px\/history\//);await reception.getByRole('button',{name:'Volver a la agenda',exact:true}).waitFor();assert.equal(await reception.getByRole('tab',{name:'Seguimiento',exact:true}).count(),0);
    await reception.getByRole('button',{name:'Volver a la agenda',exact:true}).click();await reception.getByLabel('Descripción',{exact:true}).waitFor();assert.equal(await reception.getByLabel('Descripción',{exact:true}).inputValue(),'Captura privada '+label);
    await reception.getByRole('button',{name:'Cerrar',exact:true}).click();await reception.getByRole('button',{name:'Descartar y salir',exact:true}).click();
    pass('AC09 reception: full patient record masks clinical sections and returns the unsaved appointment');
    const agendaOnly=await login('agenda');await agenda(agendaOnly,manual.date);await open(agendaOnly,label);
    for(const name of ['Abrir expediente','Vincular paciente','Registrar paciente'])assert.equal(await agendaOnly.getByRole('button',{name,exact:true}).count(),0);
    assert.equal((await api(agendaOnly,'px/get/'+patient)).status,403);assert.equal((await api(agendaOnly,'appointment/follow-ups')).status,403);assert.equal((await api(agendaOnly,'px/create-minimal','POST',{})).status,403);
    const preview=await api(agendaOnly,'appointment/'+manual.id+'/cancellation-impact?revision='+linked.body.data.revision);assert.equal(preview.status,200);assert.doesNotMatch(JSON.stringify(preview.body),/treatment_after|treatment_now/);
    await agendaOnly.screenshot({path:path.join(out,'a5-agenda-role.png'),animations:'disabled'});pass('AC08/AC13 agenda-only: own bookings manageable, patient/clinical/registration routes denied and UI actions absent');
    const clinician=await login('clinician');
    for(const endpoint of ['document/templates','document/patient/'+patient])assert.equal((await api(clinician,endpoint)).status,403,'Document permission denial is not an expired login');
    assert.equal((await api(clinician,'auth/session')).status,200);
    const forbiddenContextReads=[];clinician.on('request',r=>{if(/\/api\/(document\/|prescription\/doctors)/.test(r.url()))forbiddenContextReads.push(new URL(r.url()).pathname);});
    const trace=randomUUID();await f.query("INSERT INTO tracing(id_tracing,id_business,id_person,treatment_now,treatment_after,quote_date_after,created_by) VALUES(:trace,:business,:patient,'Procedimiento QA',:text,:date,:actor)",{trace,business:f.business,patient,text:'Indicación '+label,date:clinicalDate,actor:f.actors.clinician.id});
    await clinician.goto(f.origin+'/px/history/'+patient);await clinician.waitForLoadState('networkidle');assert.deepEqual(forbiddenContextReads,[]);await clinician.getByRole('tab',{name:'Seguimiento',exact:true}).click();
    const clinicalRow=clinician.locator('.monitoring-table tbody tr').filter({hasText:'Indicación '+label});
    await clinicalRow.getByRole('button',{name:'Agendar',exact:true}).click();await clinician.waitForURL(/\/px\/dates/);await clinician.getByLabel('Hora',{exact:true}).waitFor();assert.equal(await clinician.getByLabel('Fin',{exact:true}).inputValue(),'');
    await clinician.getByLabel('Hora',{exact:true}).click();await clinician.getByRole('option').first().click();assert.match(await clinician.getByLabel('Fin',{exact:true}).inputValue(),/^\d{2}:\d{2}$/);await clinician.getByRole('button',{name:'Guardar',exact:true}).click();await clinician.getByLabel('Descripción',{exact:true}).waitFor({state:'hidden'});
    await clinician.getByRole('button',{name:'Seguimientos',exact:true}).click();const row=clinician.locator('.follow-up-table tbody tr').filter({hasText:'Indicación '+label});await row.getByRole('button',{name:'Ver cita',exact:true}).waitFor();await clinician.screenshot({path:path.join(out,'a5-clinical-continuity.png'),animations:'disabled'});
    pass('AC12/AC14 clinician: full clinical Seguimientos component hands off to agenda and saves one reservation');
    const clinicalOnly=await login('clinical_only');assert.equal((await api(clinicalOnly,'tracing/list/'+patient)).status,200);assert.equal((await api(clinicalOnly,'appointment/list')).status,403);assert.equal((await save(clinicalOnly,appointment({startTime:'10:00',endTime:'10:30'}))).status,403);
    await clinicalOnly.goto(f.origin+'/px/history/'+patient);await clinicalOnly.getByRole('tab',{name:'Seguimiento',exact:true}).click();assert.equal(await clinicalOnly.getByRole('button',{name:'Agendar',exact:true}).count(),0);assert.equal(await clinicalOnly.getByRole('button',{name:'Ver cita',exact:true}).count(),0);
    pass('AC12/AC13 clinical-read-only: can inspect follow-up, cannot create/view agenda reservation controls or bypass API permissions');
    const admin=await login('admin');assert.equal((await api(admin,'appointment/config')).status,200);
    let releaseDoctors;const heldDoctors=new Promise(resolve=>releaseDoctors=resolve);
    const doctorRequest=admin.waitForRequest(r=>r.url().endsWith('/api/appointment/doctors'));
    await admin.route('**/api/appointment/doctors',async route=>{await heldDoctors;await route.continue().catch(error=>errors.push('QA delayed doctors: '+error.message));});
    try{await admin.goto(f.origin+'/px/dates');await doctorRequest;assert.equal(await admin.getByLabel('Fecha',{exact:true}).isDisabled(),true);for(const name of ['Consultar semana anterior','Consultar semana siguiente','Hoy'])assert.equal(await admin.getByRole('button',{name,exact:true}).isDisabled(),true);}
    finally{releaseDoctors();await admin.waitForLoadState('networkidle');await admin.unroute('**/api/appointment/doctors');}
    assert.equal(await admin.getByLabel('Fecha',{exact:true}).isDisabled(),false);
    pass('AC09 slow initialization: date/navigation wait for clinic context before allowing a selection');
    const trace2=randomUUID();await f.query("INSERT INTO tracing(id_tracing,id_business,id_person,treatment_now,treatment_after,quote_date_after) VALUES(:trace,:business,:patient,'QA','QA race',:date)",{trace:trace2,business:f.business,patient,date:day(3)});
    const care=appointment({patientId:patient,followUpId:trace2,date:day(3)});
    const race=await Promise.all([save(clinician,care),save(admin,{...care,startTime:'11:00',endTime:'11:30'})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
    const reserved=race.find(r=>r.status===200).body.data[0];const moved=await api(agendaOnly,'appointment/reschedule','POST',{request_id:randomUUID(),appointment:{...reserved,date:day(4)}});assert.equal(moved.status,200,moved.body.message);
    await f.query("UPDATE tracing SET status='cancelled' WHERE id_tracing=:id",{id:trace2});const cancelled=await save(agendaOnly,{...moved.body.data[0],status:'cancelled',cancellationReasonCode:'patient_cancelled'});assert.equal(cancelled.status,200,cancelled.body.message);
    pass('AC12 admin/clinician concurrency: one reservation; reception-level agenda can reschedule and close after follow-up annulment');
    const foreign=await login('foreign');for(const endpoint of ['appointment/'+manual.id,'px/get/'+patient])assert.ok([403,404].includes((await api(foreign,endpoint)).status),'Cross-tenant read denied');
    const cross=await api(foreign,'appointment/'+manual.id+'/link-patient','POST',{request_id:randomUUID(),revision:linked.body.data.revision,patientId:patient});assert.ok([403,404].includes(cross.status));assert.equal((await api(foreign,'appointment/patient/'+patient+'/follow-ups')).body.data.length,0);
    pass('AC10/AC13 foreign tenant: authenticated identities cannot read, link or select another clinic records');
    const secondPatient=await api(admin,'px/create-minimal','POST',{request_id:randomUUID(),person:{name:'Segundo '+label,surname:'Sintetico',birthday:'2000-01-01',age:new Date().getFullYear()-2000,telephone:'5555550012'},address:{}});assert.equal(secondPatient.status,200,secondPatient.body.message);
    const unlinked=await save(admin,appointment({date:day(5)}));assert.equal(unlinked.status,200,unlinked.body.message);const target=unlinked.body.data[0];
    const linkIntents=[{patientId:patient,revision:target.revision,request_id:randomUUID()},{patientId:secondPatient.body.data.id_person,revision:target.revision,request_id:randomUUID()}];
    const links=await Promise.all([api(admin,'appointment/'+target.id+'/link-patient','POST',linkIntents[0]),api(reception,'appointment/'+target.id+'/link-patient','POST',linkIntents[1])]);assert.deepEqual(links.map(r=>r.status).sort(),[200,409]);
    const winner=links[0].status===200?0:1,actor=winner===0?admin:reception;
    assert.equal((await api(actor,'appointment/'+target.id+'/link-patient','POST',linkIntents[winner])).status,200);
    assert.equal((await f.query("SELECT COUNT(*) AS n FROM appointment_audit WHERE appointment_id=:id AND operation='link_patient'",{id:target.id}))[0].n,1);
    const completed=(await save(admin,appointment({date:day(7)}))).body.data[0];await f.query("UPDATE appointment SET status='completed' WHERE id_appointment=:id",{id:completed.id});
    const historicalLink={patientId:patient,revision:completed.revision,request_id:randomUUID()};assert.equal((await api(admin,'appointment/'+completed.id+'/link-patient','POST',historicalLink)).status,428);
    assert.equal((await api(admin,'appointment/'+completed.id+'/link-patient','POST',{...historicalLink,confirm_completed:true})).status,200);
    pass('AC10/AC11 actual concurrent actors link once, replay one receipt, and require confirmation for completed history');
    for(const status of ['completed','no_show','cancelled'])assert.equal(code(await save(admin,appointment({date:day(6),status}))), 'APPOINTMENT_NOT_STARTED');
    assert.equal(code(await save(admin,{...linked.body.data,status:'completed'})),'APPOINTMENT_NOT_STARTED');
    assert.equal((await save(admin,{...linked.body.data,status:'cancelled'})).status,400);
    const key=randomUUID(),intent={appointment:appointment({date:day(6)}),request_id:key};const once=await api(admin,'appointment/save','POST',intent),twice=await api(admin,'appointment/save','POST',intent);assert.equal(once.status,200);assert.equal(twice.body.data[0].id,once.body.data[0].id);
    assert.equal((await api(admin,'appointment/save','POST',{...intent,appointment:{...intent.appointment,title:'Changed'}})).status,409);
    pass('AC04/AC07/AC15 real sessions enforce temporal/cancellation rules and exact write receipts');
    assert.equal((await api(admin,'appointment/save','POST',{appointment:appointment({date:day(8)}),request_id:randomUUID()},false)).status,403);
    const cookieBefore=(await admin.context().cookies()).find(c=>c.name.endsWith('_csrf'))?.value;
    const tab=await admin.context().newPage();await tab.goto(f.origin+'/px/dates');assert.equal((await api(tab,'auth/session')).status,200);await api(tab,'appointment/config');await api(tab,'appointment/config/impact','POST',{});
    const cookieAfter=(await admin.context().cookies()).find(c=>c.name.endsWith('_csrf'))?.value;assert.ok(cookieBefore&&cookieBefore===cookieAfter,'Stable CSRF cookie in two real tabs');await tab.close();
    pass('AC01/AC02/AC03 real secure cookies: two tabs share stable CSRF; mutation without CSRF is rejected');
    const renewal=await save(admin,appointment({patientName:'Renovar '+label,date:day(12)}));assert.equal(renewal.status,200);const renewalRow=renewal.body.data[0];
    await agenda(admin,renewalRow.date);await open(admin,'Renovar '+label);await admin.getByLabel('Descripción',{exact:true}).fill('Conservar al renovar '+label);
    // Change only the QA TTL for this genuine server-issued renewal. No verifier, token or auth endpoint is substituted.
    const jwtConfig=require('../../../hemia-assistance-back-legacy/src/config/jwt'),normalLifetime=jwtConfig.expiresIn;
    jwtConfig.expiresIn={expiresIn:'2s'};try{assert.equal((await api(admin,'auth/refreshToken','POST',{})).status,200);}finally{jwtConfig.expiresIn=normalLifetime;}
    await sleep(2200);assert.equal(code(await api(admin,'appointment/'+renewalRow.id)),'AUTH_ACCESS_EXPIRED');
    const refreshed=admin.waitForResponse(r=>r.url().endsWith('/api/auth/refreshToken')&&r.status()===200);
    const expiredWrite=admin.waitForResponse(r=>r.url().endsWith('/api/appointment/save')&&r.status()===401);
    await admin.getByRole('button',{name:'Guardar',exact:true}).click();await expiredWrite;await refreshed;
    await admin.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar');return b&&!b.disabled;});
    assert.equal(await admin.getByLabel('Descripción',{exact:true}).inputValue(),'Conservar al renovar '+label);
    assert.equal((await api(admin,'appointment/'+renewalRow.id)).body.data.revision,renewalRow.revision);
    const confirmedRenewal=admin.waitForResponse(r=>r.url().endsWith('/api/appointment/save')&&r.status()===200);
    await admin.getByRole('button',{name:'Guardar',exact:true}).click();await confirmedRenewal;await admin.getByLabel('Descripción',{exact:true}).waitFor({state:'hidden'});
    const afterRenewal=(await api(admin,'appointment/'+renewalRow.id)).body.data;assert.equal(afterRenewal.description,'Conservar al renovar '+label);assert.equal(Number(afterRenewal.revision),Number(renewalRow.revision)+1);
    pass('AC02 actual expired access token: real refresh preserves capture; explicit retry applies exactly one update');
    await f.query('UPDATE business SET status=\'suspended\' WHERE id_business=:business',{business:f.foreignBusiness});assert.equal((await save(foreign,appointment({date:day(9)}))).status,403);
    pass('Real tenant operational middleware rejects mutations from a suspended authenticated clinic');
    await api(reception,'auth/close','PUT');await reception.context().close();
    const mobile=await login('reception',true);const mobileName='Movil '+label;
    const mobileSaved=await save(mobile,appointment({patientName:mobileName,contactPhone:'+15555550001',date:day(10)}));assert.equal(mobileSaved.status,200);const mobileRow=mobileSaved.body.data[0];
    await agenda(mobile,mobileRow.date);await open(mobile,mobileName);await mobile.getByLabel('Descripción',{exact:true}).fill('Nota móvil '+label);
    await mobile.getByRole('button',{name:'Vincular paciente',exact:true}).click();await mobile.getByLabel('Buscar por nombre, código o teléfono',{exact:true}).fill('+525555550012');await mobile.getByRole('button',{name:'Buscar pacientes',exact:true}).click();
    await mobile.locator('.agenda-link-card label').filter({hasText:label+' Sintetico'}).first().waitFor();assert.equal(await mobile.locator('.agenda-link-card input[type=radio]:checked').count(),0);
    await mobile.locator('.agenda-link-card label').filter({hasText:label+' Sintetico'}).first().click();await mobile.screenshot({path:path.join(out,'a5-mobile-link.png'),animations:'disabled'});
    let linkCount=0;await mobile.route('**/api/appointment/*/link-patient',async route=>{if(++linkCount===1){await route.fetch();await route.abort('failed');}else await route.continue();});
    await mobile.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();await mobile.getByRole('button',{name:'Reintentar vínculo',exact:true}).click();await mobile.getByRole('heading',{name:'Vincular paciente a la cita',exact:true}).waitFor({state:'hidden'});
    assert.equal((await api(mobile,'appointment/'+mobileRow.id)).body.data.contactPhone,'+15555550001');assert.equal(await mobile.getByLabel('Descripción',{exact:true}).inputValue(),'Nota móvil '+label);
    assert.equal((await f.query("SELECT COUNT(*) AS n FROM appointment_audit WHERE appointment_id=:id AND operation='link_patient'",{id:mobileRow.id}))[0].n,1);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    pass('AC09/AC11 mobile real login: shared MX phone requires selection, lost link retries once, international phone and draft survive');
    await f.query("UPDATE permission_rol pr JOIN cat_permission cp ON cp.id_cat_permission=pr.id_cat_permission SET pr.active=0 WHERE pr.id_rol=:role AND cp.code IN ('px.all','px.new')",{role:f.actors.reception.role});
    await mobile.getByRole('button',{name:'Abrir expediente',exact:true}).click();await mobile.getByRole('button',{name:'Conservar captura y abrir',exact:true}).click();
    await mobile.waitForFunction(()=>{const v=document.querySelector('#app')?.__vue__;const permissions=v?.$store?.state?.CORE?.AUTH?.permissions;return Array.isArray(permissions)&&!permissions.includes('px.all');});
    await mobile.goto(f.origin+'/px/dates');assert.equal(await mobile.getByLabel('Descripción',{exact:true}).count(),0);assert.equal(await mobile.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage,history:history.state}).includes('Nota móvil')),false);
    pass('AC13 live role revocation refreshes real session permissions and discards private return/draft');
    await api(admin,'auth/close','PUT');assert.equal((await api(admin,'appointment/config')).status,401);
    pass('AC02/AC03 logout invalidates actual cookies/session; protected endpoints no longer authenticate');
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  }catch(error){if(active&&!active.isClosed())await active.screenshot({path:path.join(out,'a5-failure.png')}).catch(()=>{});throw error;}
  finally{for(const p of Object.values(pages))if(!p.isClosed())await api(p,'auth/close','PUT').catch(()=>{});for(const c of contexts)await c.close();await f.query("UPDATE business SET status='active' WHERE id_business=:id",{id:f.foreignBusiness});await f.query("UPDATE permission_rol SET active=1 WHERE id_rol=:id",{id:f.actors.reception.role});await sleep(100);}
}
module.exports={run,api};
