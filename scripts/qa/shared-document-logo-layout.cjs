'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('@playwright/test');
const {treatmentPlanPrintHtml}=require('../../src/domain/treatment-plan/plan.print');
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.argv[2] || 'shared-logo-layout');
const load=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const rx=await load(await fs.readFile(path.join(root,'src/domain/prescriptions/prescription.print.js'),'utf8'));
 const old=await load(execFileSync('git',['show','b355991:src/domain/prescriptions/prescription.print.js'],{cwd:root,encoding:'utf8'}));
 const source=(await fs.readFile(path.join(root,'src/views/Patient/Sections/MedicalHistory.vue'),'utf8')).replace(/\r/g,'');
 const start=source.indexOf('    printableClinicalHistoryHtml(payload) {'),end=source.indexOf('\n    },',start)+6;
 const history=new Function('return ({'+source.slice(start,end)+'})')().printableClinicalHistoryHtml;
 const self={normalizeTemplateSchema:()=>({}),printablePatient:()=>[],printableSections:()=>'',currentUserPayload:{name:'QA'},printableStatusMark:()=>'',escapeHtml:String,statusLabel:String,formatDateTime:()=>'',printableTemplateLabel:()=>'',printableFieldsHtml:()=>'',printableDoctorFields:()=>[],printableConsentFields:()=>[]};
 const browser=await chromium.launch({headless:true,channel:'chromium'}),page=await browser.newPage(),results=[];
 try{
  await page.route('**/*',route=>route.abort());
  for(const [name,width,height,transparent] of [['large',3000,1500,false],['wide',640,140,false],['tall',140,640,false],['transparent',360,140,true]]){
   const logo=await page.evaluate(({width,height,transparent})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
    if(!transparent){ctx.fillStyle='#087c86';ctx.fillRect(0,0,width,height);}ctx.fillStyle=transparent?'#087c86':'#ffffff';
    ctx.font=`bold ${Math.min(width,height)*.35}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('QA',width/2,height/2);return canvas.toDataURL('image/png');
   },{width,height,transparent});
   assert.ok(old.buildPrescriptionPrintHtml({status:'issued',header_image_snapshot:logo,template_snapshot:{template_mode:'header'},items:[]}).includes(logo),'Prior renderer accepts embedded image');
   for(const viewport of [1280,390])for(const kind of ['recipe-header','recipe-background','history','plan']){
    await page.setViewportSize({width:viewport,height:1000});let html;
    if(kind.startsWith('recipe'))html=rx.buildPrescriptionPreviewHtml({template_mode:kind.endsWith('background')?'background':'header',clinic_name:'Consultorio QA',clinic_address:'Domicilio de ejemplo',clinic_phone:'5512345678'}, {professional_name:'Profesional QA',professional_license:'123456'},logo);
    else if(kind==='history')html=history.call(self,{history:{status:'FINALIZED',version_number:1},business:{name:'Consultorio QA'},document_logo:{state:'captured',image:logo}});
    else html=treatmentPlanPrintHtml({businessName:'Consultorio QA',logo,patientName:'Paciente QA',title:'Plan QA',treatments:[],showStatus:false,showCosts:false});
    await page.setContent(html);const img=page.locator('img').first();await img.waitFor();
    const size=await img.evaluate(el=>({loaded:el.complete&&el.naturalWidth>0,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,fit:getComputedStyle(el).objectFit,scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(size.loaded);assert.equal(size.fit,'contain');assert.ok(size.scroll<=size.viewport+1,`${kind} ${viewport} overflow`);
    const max=kind==='history'?58:kind==='plan'?70:kind==='recipe-background'?60:70;assert.ok(size.height<=max+.1);
    if(kind==='recipe-background'){
     const overlap=await page.evaluate(()=>{const a=document.querySelector('img.document-logo').getBoundingClientRect(),b=document.querySelector('.doctor').getBoundingClientRect();return Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);});assert.equal(overlap,false);
    }
    if(viewport===390)await page.screenshot({path:path.join(output,`${name}-${kind}.png`),fullPage:true});
    results.push({name,viewport,kind,result:'PASS'});
   }
  }
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({result:'PASS',cases:results.length,results,limits:'Synthetic PNG geometry and real renderers; no printer or external storage.'},null,2));console.log('PASS '+results.length+' document/logo layout cases; prior header renderer accepts captured bytes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
