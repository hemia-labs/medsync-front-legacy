const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const babel=require('@babel/core');const compiler=require('vue-template-compiler');
const {JSDOM,VirtualConsole}=require('jsdom');
const json=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const errors=[],vc=new VirtualConsole();['jsdomError','warn','error'].forEach(event=>vc.on(event,error=>errors.push(String(error))));
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/qa',runScripts:'dangerously',virtualConsole:vc});const w=dom.window;w.confirm=()=>{throw Error('Native confirmation is forbidden');};
 w.eval(fs.readFileSync(require.resolve('vue/dist/vue.js'),'utf8'));w.Vue.config.productionTip=false;w.Vue.config.devtools=false;
 let calls=0,fail=false;
 const snapshot={revision:2,teeth:{16:{findings:[{id:'car-16',code:'car',label:'Caries',status:'active',surfaces:'MO'}]},55:{findings:[]}}};
 const api={list:async()=>{calls++;return fail?{success:false,message:'QA API error'}:{success:true,data:{charts:[{id_chart:'chart',revision:2,status:'active'}]}};},read:async()=>{calls++;return {success:true,data:json(snapshot)};}};
 const file=path.resolve(__dirname,'../../src/views/Patient/Sections/components/TreatmentDentalDetails.vue');const descriptor=compiler.parseComponent(fs.readFileSync(file,'utf8'));
 const code=babel.transformSync(descriptor.script.content,{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
 const feedback={exports:{}};const feedbackCode=babel.transformSync(fs.readFileSync(path.resolve(__dirname,'../../src/mixins/odontogramFeedback.js'),'utf8'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;new w.Function('module','exports',feedbackCode)(feedback,feedback.exports);
 const module={exports:{}};new w.Function('require','module','exports',code)(specifier=>specifier.includes('DAOdontogramV2Service')?{__esModule:true,default:api}:specifier.includes('odontogramFeedback')?feedback.exports:specifier.includes('DAActionConfirm')?{__esModule:true,default:{render:h=>h('div'),methods:{open:async()=>true}}}:require('../../src/utils/odontogram/dentalContract'),module,module.exports);
 const component=module.exports.default,template=compiler.compile(descriptor.template.content);assert.deepEqual(template.errors,[]);
 component.render=new w.Function(template.render);component.staticRenderFns=template.staticRenderFns.map(code=>new w.Function(code));
 const app=new w.Vue({data:()=>({canRead:true,form:{name:'Manual procedure',cost:'125.00',notes:'Keep notes',estimated_start_date:'2026-10-29',teeth:['11'],details:[{tooth_number:'11',surfaces:'L',manual:true,sources:[]}]}}),render(h){return h(component,{ref:'selector',props:{value:this.form.details,teeth:this.form.teeth,patientId:'patient',canRead:this.canRead},on:{input:value=>{this.form.details=value;},selection:value=>{this.form.teeth=value;},'context-notes':text=>{this.form.notes+='\n'+text;}}});}}).$mount('#app');
 try{
  const selector=app.$refs.selector,original={name:app.form.name,cost:app.form.cost,notes:app.form.notes,estimated_start_date:app.form.estimated_start_date};
  await selector.openImport();assert.equal(selector.picked.length,0);selector.sourceId='chart';await selector.loadSource();selector.selectionMode='findings';selector.picked=['car-16'];await selector.importSelection();await w.Vue.nextTick();
  assert.equal(app.form.teeth.length,2);assert.equal(app.form.details.find(d=>d.tooth_number==='16').surfaces,'MO');assert.equal(app.form.details.find(d=>d.tooth_number==='11').surfaces,'L');
  assert.deepEqual({name:app.form.name,cost:app.form.cost,notes:app.form.notes,estimated_start_date:app.form.estimated_start_date},original);
  selector.selectionMode='teeth';selector.picked=['16'];await selector.importSelection();await w.Vue.nextTick();selector.picked=['16'];await selector.importSelection();await w.Vue.nextTick();
  assert.equal(app.form.details.find(d=>d.tooth_number==='16').sources.length,2,'one finding origin plus one deduplicated solo-tooth origin');
  selector.toggleFace('16','D');await w.Vue.nextTick();assert.equal(app.form.details.find(d=>d.tooth_number==='16').manual_surfaces,'D');
  snapshot.revision=3;snapshot.teeth[16].findings[0].surfaces='V';selector.source=json(snapshot);selector.selectionMode='findings';selector.picked=['car-16'];await selector.importSelection();await w.Vue.nextTick();
  let dental=app.form.details.find(d=>d.tooth_number==='16');assert.equal(dental.surfaces,'DV');assert.equal(dental.sources.find(s=>s.finding_id==='car-16').replace_revision,2);
  await selector.removeSource('16',dental.sources.find(s=>s.finding_id==='car-16'));await w.Vue.nextTick();assert.equal(app.form.details.find(d=>d.tooth_number==='16').surfaces,'D');
  const before=json(app.form);await selector.openImport();selector.picked=['55'];selector.importOpen=false;assert.deepEqual(json(app.form),before);
  fail=true;await selector.openImport();assert.match(selector.error,/QA API error/);assert.deepEqual(json(app.form),before);
  app.canRead=false;await w.Vue.nextTick();const count=calls;await selector.openImport();assert.equal(calls,count);
  selector.toggleFace('11','M');await w.Vue.nextTick();assert.equal(app.form.details.find(d=>d.tooth_number==='11').surfaces,'ML');
  assert.deepEqual(errors,[]);
  console.log('PASS real Vue plan selector: no automatic selection, manual fields preserved, findings/faces, null-finding dedup, cancel, source API failure and manual editing without odontogram permission. No persistence calls.');
 }finally{app.$destroy();w.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
