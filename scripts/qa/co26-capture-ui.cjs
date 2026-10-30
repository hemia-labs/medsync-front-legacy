const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { buildClient } = require('./odontogram-ui-preview.cjs');
const D = require('../../../medsync-back-legacy/src/domain/odontogram/operations');
const pause = () => new Promise(resolve => setTimeout(resolve, 10));
async function until(check) { for (let i=0;i<800;i++) { if(check()) return; await pause(); } throw Error('Timed out in CO26 rendered flow'); }
(async () => {
  const errors = [], vc = new VirtualConsole(); ['jsdomError','warn','error'].forEach(event => vc.on(event,e=>errors.push(String(e))));
  const dom = new JSDOM('<div id="app"></div>',{url:'http://localhost/preview',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
  const w = dom.window;
  let server = { id_chart:'chart',id_person:'qa-patient',...D.emptyChart('mixed') }, writes = 0;
  const versions = new Map([[0,JSON.parse(JSON.stringify(server))]]);
  const ok = data => ({success:true,data:JSON.parse(JSON.stringify(data))});
  const events = {};
  const toasts=[];
  try {
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.scrollTo=()=>{};w.confirm=()=>{throw Error('Native confirmation is forbidden');};
    w.__odontogramPermissions=['px.tab.odontogram','odontogram.capture','odontogram.finalize','odontogram.reopen','odontogram.delete'];
    w.__odontogramV2Fixture={
      capabilities:async()=>ok({mode:'v2',schema_ready:true}),
      list:async()=>ok({mode:'v2',catalog:D.CATALOG,catalog_version:D.CATALOG_VERSION,charts:[{id_chart:'chart',revision:server.revision,dentition:'mixed',status:server.status}]}),
      read:async(id,revision)=>ok(revision===undefined?server:versions.get(revision)),
      operations:async(id,payload)=>{
        try { const result=D.applyBatch(server,payload,'actor',events); writes++;server={id_chart:id,id_person:'qa-patient',...result.chart};
          for(const op of payload.ops)events[op.client_op_id]={actor:'actor',revision:server.revision,event:result.events.find(e=>e.client_op_id===op.client_op_id)||{tooth:op.tooth,noop:true}};
          versions.set(server.revision,JSON.parse(JSON.stringify(server))); return ok(server);
        }catch(error){return {success:false,status:error.status,message:error.message};}
      },
      transition:async(id,action)=>{server.status=action==='finalize'?'finalized':'active';server.revision++;server.generation++;versions.set(server.revision,JSON.parse(JSON.stringify(server)));return ok(server);}
    };
    [require.resolve('vue/dist/vue.js'),path.join(path.dirname(require.resolve('vuex')),'vuex.js'),require.resolve('vuetify/dist/vuetify.js')].forEach(file=>w.eval(fs.readFileSync(file,'utf8')));
    w.eval(buildClient().script);
    w.Vue.prototype.$toast=Object.fromEntries(['success','error','warning','info'].map(type=>[type,message=>toasts.push({type,message})]));
    await until(()=>w.document.querySelectorAll('.co26-live-teeth button').length===52);
    const live=w.__odontogramQA.vm.$refs.capture;
    let autoConfirm=true;w.setInterval(()=>{const dialog=live.$refs.confirmation;if(autoConfirm&&dialog&&dialog.opened)dialog.settle(true);},5);
    live.command='16 car mo';await live.runCommand();await until(()=>live.sync==='saved'&&!live.pending);
    assert.equal(server.teeth[16].findings[0].surfaces,'MO');
    assert.ok(toasts.some(toast=>toast.type==='success'&&toast.message==='Hallazgo registrado.'));
    await live.selectTooth(16);live.changeNote('Nota conservada');await until(()=>server.teeth[16].note==='Nota conservada'&&!live.pending);
    assert.ok(toasts.some(toast=>toast.type==='success'&&toast.message==='Nota guardada.'));
    await live.reviewTooth();await live.session.flush();await until(()=>!live.pending);
    assert.equal(server.teeth[16].findings.length,1);assert.equal(server.teeth[16].note,'Nota conservada');
    live.evolutionOrigins=[server.teeth[16].findings[0].id];live.evolutionResult='res';live.surfaces=['M','O'];await live.evolve();await live.session.flush();await until(()=>!live.pending);
    assert.equal(server.teeth[16].findings[0].status,'resolved');
    await live.undo();await live.session.flush();await until(()=>!live.pending);
    assert.equal(server.teeth[16].findings[0].status,'active');assert.equal(server.teeth[16].note,'Nota conservada');
    autoConfirm=false;const beforeCancel=writes,beforeCancelToasts=toasts.length;const cancellingRemoval=live.removeFinding(server.teeth[16].findings[0]);await until(()=>live.$refs.confirmation.opened);live.$refs.confirmation.settle(false);await cancellingRemoval;assert.equal(writes,beforeCancel);assert.equal(toasts.length,beforeCancelToasts);autoConfirm=true;
    live.command='16 car ov';const merging=live.runCommand();await until(()=>live.overlapProposal);assert.equal(server.teeth[16].findings.filter(f=>f.status==='active').length,1);live.resolveOverlap('merge');await merging;await live.session.flush();await until(()=>!live.pending);
    assert.equal(server.teeth[16].findings.find(f=>f.status==='active').surfaces,'MOV');
    live.command='16 car od';const cancelling=live.runCommand();await until(()=>live.overlapProposal);const noWrite=writes;live.resolveOverlap(null);await cancelling;assert.equal(writes,noWrite);assert.equal(live.command,'16 car od');
    const count=writes;live.command='15 car m, 99 aus';await live.runCommand();assert.equal(writes,count);
    await w.Vue.nextTick();assert.equal(toasts[toasts.length-1].type,'error');
    live.setComparison(versions.get(0),server);let printCalled=0;w.print=()=>{printCalled++;assert.match(w.document.querySelector('.co26-live-print').textContent,/Comparación de odontogramas/);assert.match(w.document.querySelector('.co26-live-print').textContent,/Nota conservada/);assert.equal(w.document.body.classList.contains('co26-printing'),true);};await live.printChart('comparison');assert.equal(printCalled,1);assert.equal(w.document.body.classList.contains('co26-printing'),false);
    await live.transition('finalize');await until(()=>live.chart===null);
    assert.equal(server.status,'finalized');assert.deepEqual(errors,[]);
    assert.ok(toasts.some(toast=>toast.type==='success'&&toast.message==='Odontograma finalizado.'));
    await live.openHistory();await live.selectChart('chart',true);await w.Vue.nextTick();assert.equal(live.historyOpen,true);assert.equal(w.document.querySelectorAll('.co26-history-card').length,1);assert.match(w.document.querySelector('.co26-history-card').textContent,/En consulta/);assert.ok(!live.historyDate('2026-10-29T23:26:23.000Z').includes('T23:'));
    console.log('PASS real CO26 Vue UI: 52 pieces, parser, autosaved note, contextual review, evolution, audited undo, invalid batch no write, finalization. Synthetic service only.');
  }finally{if(w.__odontogramQA)w.__odontogramQA.app.$destroy();w.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
