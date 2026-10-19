const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
(async()=>{
    const source=fs.readFileSync(path.join(root,'src/domain/prescriptions/prescription.print.js'),'utf8');
    const printing=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    let windows=0, renders=0;
    global.window={open(){ windows++;return {document:{open(){},write(html){renders++;assert.ok(html.includes('QA-001'));},close(){}}};}};
    for(const status of ['draft','cancelled',null,'unexpected']) {
        assert.equal(printing.buildPrescriptionPrintHtml({status}), '');
        assert.equal(printing.openPrescriptionPrintWindow({status}), false);
    }
    assert.equal(windows,0,'Blocked statuses cannot open an output window');
    assert.equal(printing.openPrescriptionPrintWindow({status:'issued',folio:'QA-001',items:[]}),true);assert.equal(renders,1);
    delete global.window;
    for(const file of ['src/views/prescriptions/Prescriptions.vue','src/views/Patient/Sections/Prescriptions.vue']) {
        let api=0,outputs=0,loads=0;const messages=[];
        const service={async prepareOutput(){ api++; return {success:true,data:{prescription:{id_prescription:'qa-rx',status:'issued'},config:{}}};}};
        const context={component:null,ListPageNav:{},mapGetters:()=>({}),moduleTypes:{AUTH:'AUTH'},fnTypes:{},PrescriptionForm:{},dialogName:{},DAPrescriptionService:service,DAPxService:{},openPrescriptionPrintWindow:()=>{outputs++;return true;}};
        const sfc=fs.readFileSync(path.join(root,file),'utf8');
        vm.runInNewContext(sfc.split('<script>')[1].split('</script>')[0].replace(/^import[^;]+;\r?\n/gm,'').replace('export default','component ='),context);
        const view={outputBusy:false,canPrint:true,canDownload:true,previewData:{id_prescription:'qa-rx',status:'issued'},notify:(_type,message)=>messages.push(message),toast:(_type,message)=>messages.push(message),load:async()=>{loads++;}};
        const output=context.component.methods.openPrintable.bind(view);
        for(const status of ['draft','cancelled','unexpected']) assert.equal(await output({id_prescription:'qa-rx',status},'printed'),false);
        assert.equal(api,0);assert.equal(outputs,0);
        view.canPrint=false;assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'printed'),false);assert.equal(api,0);
        view.canPrint=true;view.canDownload=false;assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'downloaded'),false);assert.equal(api,0);view.canDownload=true;
        service.prepareOutput=async()=>{api++;return {success:false,message:'Cancelada en servidor',data:{id_prescription:'qa-rx',status:'cancelled',cancellation_reason:'QA'}};};
        assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'printed'),false);assert.equal(outputs,0);assert.equal(view.previewData.status,'cancelled');assert.equal(loads,1);assert.equal(view.outputBusy,false);
        service.prepareOutput=async()=>{api++;return {success:false,message:'Permission denied'};};
        assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'downloaded'),false);assert.equal(outputs,0);
        for(const document of [{id_prescription:'qa-rx',status:'cancelled'},{id_prescription:'qa-other',status:'issued'}]) {
            service.prepareOutput=async()=>({success:true,data:{prescription:document,config:{}}});
            assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'printed'),false);assert.equal(outputs,0,'Unexpected state or identity must not render a copy');
        }
        service.prepareOutput=async()=>{throw new Error('Network unavailable');};
        assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'printed'),false);assert.equal(outputs,0);assert.equal(view.outputBusy,false);
        let resolve;service.prepareOutput=()=>new Promise(done=>{resolve=done;});
        const pending=output({id_prescription:'qa-rx',status:'issued'},'printed');assert.equal(view.outputBusy,true);
        assert.equal(await output({id_prescription:'qa-rx',status:'issued'},'printed'),false,'Double click cannot prepare another output');
        resolve({success:true,data:{prescription:{id_prescription:'qa-rx',status:'issued'},config:{}}});
        assert.equal(await pending,true);assert.equal(outputs,1);assert.equal(view.outputBusy,false);
    }
    console.log('PASS prescription output UI: only issued copies, render guard, local permission checks, stale cancellation refresh, failed authorization/network, duplicate clicks and both entry points. Browser/API mocked.');
})().catch(error=>{console.error(error);process.exitCode=1;});
