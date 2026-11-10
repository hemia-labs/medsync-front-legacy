const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const {buildClient}=require('./odontogram-ui-preview.cjs');
const D=require('./co26-backend-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const output=path.resolve(__dirname,'../../../_qa/co26-review-evidence');
 try{
  const page=await browser.newPage({viewport:{width:794,height:1123}});await page.route('**/*',route=>route.abort());
  const built=buildClient({includeEditors:true});await page.setContent('<div id="app"></div>');await page.addStyleTag({path:require.resolve('vuetify/dist/vuetify.min.css')});await page.addStyleTag({content:built.styles});
  for(const file of [require.resolve('vue/dist/vue.js'),path.join(path.dirname(require.resolve('vuex')),'vuex.js'),require.resolve('vuetify/dist/vuetify.js'),require.resolve('vuelidate/dist/vuelidate.min.js'),require.resolve('vuelidate/dist/validators.min.js')])await page.addScriptTag({path:file});
  const initial={id_chart:'qa-print',id_person:'qa-patient',created_by:'QA author',...D.emptyChart('mixed')};
  await page.evaluate(({chart,catalog})=>{window.__odontogramPermissions=['px.tab.odontogram','odontogram.capture'];window.__odontogramV2Fixture={capabilities:async()=>({success:true,data:{schema_ready:true,mode:'v2'}}),list:async()=>({success:true,data:{catalog,charts:[{id_chart:chart.id_chart,revision:0,dentition:'mixed',status:'active'}]}}),read:async()=>({success:true,data:chart})};},{chart:initial,catalog:D.CATALOG});
  await page.addScriptTag({content:built.script});await page.waitForFunction(()=>window.__odontogramQA.vm.$refs.capture && window.__odontogramQA.vm.$refs.capture.chart);
  await page.evaluate(()=>{const app=window.__odontogramQA.app.$el,wrapper=document.createElement('div');wrapper.style.cssText='position:relative;transform:translateY(120px);margin-top:500px;min-height:3000px';app.parentNode.insertBefore(wrapper,app);wrapper.appendChild(app);const nav=document.createElement('div');nav.textContent='QA_NAV_NOT_FOR_PRINT';nav.style.height='300px';document.body.prepend(nav);window.print=()=>{const root=document.getElementById('co26-print-root');if(!root)throw Error('Missing isolated print root');window.__printClone=root.cloneNode(true);};});
  for(const mode of ['permanent','primary','mixed','comparison']){
   const chart={id_chart:'qa-'+mode,id_person:'qa-patient',created_by:'QA author',...D.emptyChart(mode==='comparison'?'mixed':mode)};
   const number=mode==='primary'?55:16;chart.teeth[number].note='Synthetic print note';chart.teeth[number].findings=[{id:'qa-finding',label:'Caries',intent:'observed',status:'active',surfaces:'MO'}];
   await page.evaluate(async({chart,mode})=>{const live=window.__odontogramQA.vm.$refs.capture;live.install(chart);if(mode==='comparison'){const before=JSON.parse(JSON.stringify(chart));before.teeth[16].note='Previous note';before.revision=0;chart.revision=1;live.setComparison(before,chart);}await live.printChart(mode==='comparison'?'comparison':'snapshot');if(document.getElementById('co26-print-root')||document.body.classList.contains('co26-printing'))throw Error('Print cleanup failed');document.body.appendChild(window.__printClone);document.body.classList.add('co26-printing');},{chart,mode});
   await page.emulateMedia({media:'print'});
   const box=await page.locator('#co26-print-root').boundingBox();assert.ok(box.y<=1,'No displaced content from application ancestors');
   await page.pdf({path:path.join(output,'print-'+mode+'.pdf'),format:'A4',margin:{top:'12mm',right:'12mm',bottom:'12mm',left:'12mm'},printBackground:true});
   await page.evaluate(()=>{document.getElementById('co26-print-root').remove();document.body.classList.remove('co26-printing');});await page.emulateMedia({media:'screen'});
  }
  console.log('PASS actual print path: 3 dentitions and comparison, isolated from a displaced/transformed application, no leftover print DOM. Synthetic PDF evidence generated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
