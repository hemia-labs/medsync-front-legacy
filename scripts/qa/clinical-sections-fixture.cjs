// Local in-memory API for the real application shell. No accounts, DB or external services.
const http = require('node:http');
const { sequence } = require('../../src/utils/odontogram/dentalContract');
const globals = { caries:'car', fractura:'fx', restos:'rr', resina:'res', amalgama:'a', sellador:'sel', corona:'cor', endodoncia:'endo', implante:'imp', extraccion:'ext', ausente:'aus', noerupcionado:'ne', sano:'ok', revisado:'ok', presente:'pres' };
const catalog = Object.entries({car:'Caries',fx:'Fractura',rr:'Restos radiculares',res:'Resina',a:'Amalgama',sel:'Sellador',cor:'Corona',endo:'Endodoncia',imp:'Implante',ext:'Extracción indicada',aus:'Ausente',ne:'No erupcionado'}).map(([code,label])=>({code,label}));
const defaults = () => ({ modules:{odontogramEnabled:true,treatmentPlanEnabled:true,allowTreatmentToothSelection:true,showTreatmentCosts:true,showTreatmentStatus:true}, mode:'v2', aliases:{}, aliasVersion:1, revision:1, traversal:Object.fromEntries(['permanent','primary','mixed'].map(mode=>[mode,sequence(mode)])), ready:true, hasCharts:false, configured:true, manageRoles:true, role:'admin', theme:'medical-blue', fail:'', writes:[], reads:[] });
let state = defaults();
const aliasState = () => ({schema_ready:true,catalog,global_aliases:globals,local_aliases:state.aliases,aliases:{...globals,...state.aliases},alias_version:String(state.aliasVersion)});
const prefs = () => ({schema_ready:true,valid:true,revision:state.revision,traversal:state.traversal});
const night = {code:'clinical-night',primary_100:'#1E293B',primary_200:'#334155',primary_300:'#475569',primary_500:'#38BDF8',primary_700:'#7DD3FC',primary_900:'#E5E7EB',primary_1000:'#F8FAFC',secondary_500:'#FB7185',secondary_700:'#FDA4AF',terciary_500:'#94A3B8',forty_500:'#334155',grey:'#CBD5E1',gray98:'#0F172A',red:'#FB7185',surface:'#1E293B',success:'#4ADE80',info:'#38BDF8',muted:'#94A3B8'};
function createFixture(frontendOrigin = 'http://127.0.0.1:4397') {
  return http.createServer(async (req,res) => {
    res.setHeader('Access-Control-Allow-Origin',frontendOrigin); res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,Authorization'); res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
    res.setHeader('Content-Type','application/json'); if(req.method==='OPTIONS') return res.end();
    const route = new URL(req.url,'http://127.0.0.1').pathname;
    let raw=''; for await(const chunk of req) raw+=chunk;
    const body=raw ? JSON.parse(raw) : {};
    const send=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify({success:status<400,data,...(status>=400?{message:data.message}: {})}));};
    if(route==='/qa/state') { if(req.method==='POST') state={...state,...body}; return send(state); }
    if(route==='/qa/reset') { state=defaults(); return send(state); }
    if(req.method==='GET') state.reads.push(route);
    if(route==='/api/auth/session') return send({authenticated:true,user:{id_login:'qa-clinical-admin',id_business:'qa-clinic',name:'Administración QA',rol:state.role},role:state.role,business:{id_business:'qa-clinic',name:'Consultorio de prueba',status:'active'},permissions:state.role==='admin'?['admin.config',...(state.manageRoles?['admin.users']:[]),'px.view','px.odontogram','treatments.view','clinical_history_template.view','documents.config','prescriptions.config','px.dates']:['px.view'],tenantOperational:{allowed:true},accessRevision:'qa-stable',accessExpiresAt:new Date(Date.now()+3600000).toISOString()});
    if(route==='/api/auth/csrf') return send({csrfToken:'local-synthetic-token',headerName:'X-CSRF-Token',contextId:'qa-clinical',contextType:'session',expiresAt:new Date(Date.now()+3600000).toISOString()});
    if(route==='/api/config/theme/get') return send([state.theme==='clinical-night'?night:{code:'medical-blue',primary_700:'#186C8E'}]);
    if(route==='/api/config/clinical-modules/get') return state.fail==='modules-load'?send({message:'No se pudo consultar la configuración de prueba.'},503):send(state.modules);
    if(route==='/api/config/clinical-modules/changes') {
      if(state.fail==='modules-save') return send({message:'No se pudo guardar. Conservamos tus cambios.'},503);
      if(Object.entries(body.expected).some(([key,value])=>state.modules[key]!==value)) {
        res.statusCode=409;
        return res.end(JSON.stringify({status:409,message:'La configuración cambió desde que la abriste.',data:state.modules}));
      }
      state.modules={...state.modules,...body.changes};
      if(!state.modules.odontogramEnabled) state.modules.allowTreatmentToothSelection=false;
      state.configured=true;
      state.writes.push({route,body});return send(state.modules);
    }
    if(route==='/api/odontogram/v2/capabilities') return state.fail==='mode-load'?send({message:'Consulta no disponible.'},503):send({schema_ready:true,mode:state.mode});
    if(route==='/api/odontogram/v2/activation-check') return send({ready:state.ready,has_charts:state.hasCharts,capture_operators:state.ready?1:0,finalize_operators:state.ready?1:0,roles:[{id_rol:'qa-admin',role_code:'admin',read:state.ready,capture:state.ready,finalize:state.ready,candidates:{capture:true,finalize:true,reopen:true,delete:true}}]});
    if(route==='/api/odontogram/v2/mode') {state.writes.push({route,body});if(!state.configured)return send({message:'Primero guarda la configuración clínica.'},409);if(state.hasCharts&&body.mode==='v1')return send({message:'Ya hay odontogramas por piezas y caras.'},409);if(!state.ready&&body.mode==='v2')return send({message:'Faltan operadores',code:'CO26_OPERATORS_REQUIRED'},409);state.mode=body.mode;return send({mode:state.mode});}
    if(route==='/api/odontogram/v2/aliases') {
      if(req.method==='GET')return send(aliasState());
      if(state.fail==='alias-save'||body.expected_version!==String(state.aliasVersion))return send({message:'Las palabras cambiaron; vuelve a consultarlas.'},409);
      if(body.target===null)delete state.aliases[body.alias];else state.aliases[body.alias]=body.target;
      state.aliasVersion++;state.writes.push({route,body});return send(aliasState());
    }
    if(route==='/api/odontogram/v2/preferences') {
      if(req.method==='GET')return send(prefs());
      if(state.fail==='walk-save'||body.expected_revision!==state.revision)return send({message:'El recorrido cambió; vuelve a consultarlo.'},409);
      state.traversal=body.traversal;state.revision++;state.writes.push({route,body});return send(prefs());
    }
    if(route.includes('saas-legal'))return send({required:false,documents:[],pending:[],pendingCount:0});
    if(route.includes('preparation'))return send({steps:[],completed:0,total:0});
    return send([]);
  });
}
if(require.main===module) {
  const port=Number(process.env.CLINICAL_FIXTURE_PORT || 4398);
  const frontendPort=Number(process.env.CLINICAL_FRONT_PORT || 4397);
  createFixture('http://127.0.0.1:'+frontendPort).listen(port,'127.0.0.1',()=>console.log('Synthetic clinical settings API on loopback port '+port));
}
module.exports={createFixture};
