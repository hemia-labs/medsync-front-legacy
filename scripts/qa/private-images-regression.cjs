'use strict';
// Real Vue components and browser file input; synthetic API/storage, no authenticated session.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const compiler=require('vue-template-compiler');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'../..');
const output=process.env.PRIVATE_IMAGES_QA_OUTPUT || path.join(os.tmpdir(),'medsync-private-images-qa');
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
const components=[['Logo','src/views/configuration/components/PrivateClinicLogo.vue'],['Profile','src/views/User/components/DAProfessionalProfile.vue']].map(([name,file])=>{
 const sfc=compiler.parseComponent(fs.readFileSync(path.join(root,file),'utf8'));
 assert.deepEqual(compiler.compile(sfc.template.content).errors,[],file+' template compiles');
 return {name,template:sfc.template.content,script:sfc.script.content.replace(/^import[^;]+;\r?\n/gm,'').replace('export default','window.'+name+' =')};
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('**/*',route=>route.request().url().includes('/private/') ? route.fulfill({contentType:'image/png',body:image}) : route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>'}));
  await page.goto('https://qa.invalid/');
  await page.addStyleTag({path:path.join(root,'node_modules/vuetify/dist/vuetify.min.css')});
  const cssDir=path.join(root,'dist/css');
  if(fs.existsSync(cssDir)) for(const file of fs.readdirSync(cssDir).filter(file=>file.startsWith('app.')&&file.endsWith('.css')))await page.addStyleTag({path:path.join(cssDir,file)});
  await page.addStyleTag({content:'body{margin:0} #qa{max-width:900px;margin:auto;padding:16px} button{padding:8px}'});
  await page.addScriptTag({path:path.join(root,'node_modules/vue/dist/vue.js')});
  await page.addScriptTag({path:path.join(root,'node_modules/vuetify/dist/vuetify.js')});
  await page.evaluate(({components,image})=>{
   window.imageData='data:image/png;base64,'+image;
   window.store={state:{CORE:{AUTH:{authenticated:true,accessRevision:1,user:{id_login:'doctor'},business:{id_business:'tenant'}}}}};
   window.authorizationContext=()=>({revision:window.store.state.CORE.AUTH.accessRevision});
   window.isCurrentAuthorization=context=>context.revision===window.store.state.CORE.AUTH.accessRevision;
   window.mapGetters=()=>({});window.moduleTypes={AUTH:'AUTH'};window.fnTypes={};window.getSettingsSections=()=>[];
   window.registerSettingsNavigationGuard=()=>()=>{};window.confirmSettingsDiscard=async()=>true;window.focusControl=()=>{};
   window.buildLicenseLimitMessage=(response,message)=>message;
   window.PreparationGuide={template:'<span></span>'};
   window.logoWrites=[];window.signatureWrites=[];window.logoReads=0;
   window.clinic={id_business:'tenant',logoUrl:'',logoKey:null};
   window.profile={id_doctor_professional_profile:'profile',professional_name:'Doctor de prueba',professional_license:'12345',is_active:1,can_issue_prescriptions:1,can_sign_documents:1,signature_image:null,signature_url:null};
   window.DABusinessService={
    getCurrent:async()=>{window.logoReads++;return {success:true,data:{...window.clinic}};},
    updateLogo:async data=>{window.logoWrites.push(data);window.clinic.logoKey='consultorios/tenant/logos/opaque.png';window.clinic.logoUrl='https://qa.invalid/private/logo?signature=synthetic';return {success:true,data:{...window.clinic}};},
    deleteLogo:async()=>{window.logoWrites.push({deleted:true});window.clinic.logoKey=null;window.clinic.logoUrl='';return {success:true,data:{...window.clinic}};}
   };
   window.DAUserService={getProfessionalProfile:async()=>({success:true,data:{...window.profile}}),saveProfessionalProfile:async(id,payload)=>{
    window.signatureWrites.push(payload);
    const next={...window.profile,...payload};
    if(String(payload.signature_image || '').startsWith('data:image/')){
     const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload.signature_image));
     next.signature_digest=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
     next.signature_image='consultorios/tenant/profesionales/doctor/firmas/opaque-'+next.signature_digest+'.png';
     next.signature_url='https://qa.invalid/private/signature?signature=synthetic';
    }else if(!payload.signature_image)next.signature_url=null;
    window.profile=next;return {success:true,data:{...next}};
   }};
   for(const component of components){(0,eval)(component.script);window[component.name].template=component.template;}
   window.Vue.prototype.$store=window.store;
   for(const name of ['da-button-primary','da-button-secondary'])window.Vue.component(name,{props:['label','disabled'],template:'<button type="button" :disabled="disabled">{{label}}</button>'});
   window.Vue.component('da-signature-pad',{template:'<button type="button" @click="$emit(\'signed\', image)">Aplicar firma de prueba</button>',data:()=>({image:window.imageData})});
   window.app=new window.Vue({vuetify:new window.Vuetify(),data:()=>({clinic:{...window.clinic}}),template:'<v-app><main id="qa"><h1>Imágenes privadas del consultorio</h1><Logo ref="logo" business-id="tenant" :image="clinic.logoUrl" @saved="clinic=$event"/><Profile ref="profile" id-login="doctor"/></main></v-app>',components:{Logo:window.Logo,Profile:window.Profile}}).$mount('#app');
  },{components,image:image.toString('base64')});
  await page.getByRole('button',{name:'Guardar perfil',exact:true}).waitFor();
  for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   await page.setViewportSize({width,height});
   await page.locator('input[type=file]').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:image});
   await page.getByRole('button',{name:'Guardar logo',exact:true}).click();
   await page.getByRole('button',{name:'Eliminar logo',exact:true}).waitFor();
   await page.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:image});
   await page.getByRole('button',{name:'Guardar logo',exact:true}).click();
   await page.getByRole('button',{name:'Capturar firma',exact:true}).click();
   await page.getByRole('button',{name:'Aplicar firma de prueba',exact:true}).click();
   await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();
   await page.waitForFunction(()=>window.app.$refs.profile.form.signature_image?.startsWith('consultorios/'));
   const state=await page.evaluate(()=>({key:window.app.$refs.profile.form.signature_image,preview:window.app.$refs.profile.signaturePreview,dirty:window.app.$refs.profile.hasUnsavedChanges,width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.match(state.key,/^consultorios\/tenant\//);assert.match(state.preview,/private\/signature/);assert.equal(state.dirty,false);assert.ok(state.scroll<=state.width+1,label+' no horizontal overflow');
   await page.screenshot({path:path.join(output,label+'.png'),fullPage:true});
   await page.getByRole('button',{name:'Actualizar imagen',exact:true}).first().click();
   await page.getByRole('button',{name:'Eliminar logo',exact:true}).click();
   await page.waitForFunction(()=>!window.app.clinic.logoUrl);
   await page.getByRole('button',{name:'Eliminar firma del perfil',exact:true}).click();
   await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();
   await page.waitForFunction(()=>!window.profile.signature_image);
  }
  const state=await page.evaluate(async()=>({logoWrites:window.logoWrites.length,signatureWrites:window.signatureWrites.length,recovery:await window.app.$refs.profile.matchesSavedProfile({signature_image:'key',signature_digest:(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(window.imageData))).byteLength ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(window.imageData))),x=>x.toString(16).padStart(2,'0')).join('') : null},{signature_image:window.imageData})}));
  assert.equal(state.logoWrites,6);assert.equal(state.signatureWrites,4);assert.equal(state.recovery,true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS',viewports:['1440x1000','390x844'],...state,storage:'synthetic; no AWS, DB or authenticated session',output},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
