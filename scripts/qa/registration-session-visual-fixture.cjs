'use strict';
// Local-only visual double. No credentials, accounts, legal acceptance or DB writes.
const http=require('node:http');
let expired=true,recoveries=0,submissions=0;
http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4339');
  res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Headers','content-type,x-csrf-token,idempotency-key');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.end();return;}
  const send=value=>res.end(JSON.stringify(value));
  if(req.url==='/api/registration/context')return send({enabled:true,sessionState:expired?'expired':'anonymous',legalContext:'synthetic-context',legalSnapshotToken:'synthetic-snapshot',legalDocuments:[{documentKey:'qa_notice',versionId:'qa-v1',contentHash:'synthetic-hash',requiredAction:'acknowledge',title:'Aviso de prueba sin efectos legales',contentHtml:'<p>Solo prueba visual sintética. No es un contrato.</p>'}]});
  if(req.url==='/api/auth/csrf')return send({success:true,data:{csrfToken:'synthetic-csrf',headerName:'X-CSRF-Token',contextId:'synthetic-preauth',contextType:'preauth',expiresAt:new Date(Date.now()+600000).toISOString()}});
  if(req.url==='/api/registration/recover-session'&&req.method==='POST'){recoveries++;expired=false;return send({recovered:true});}
  if(req.url==='/api/auth/register'){submissions++;res.statusCode=409;return send({code:'QA_ONLY_NO_ACCOUNT_CREATION'});}
  if(req.url==='/qa/status')return send({synthetic:true,expired,recoveries,submissions});
  send({success:true,data:{authenticated:false}});
}).listen(4340,'127.0.0.1',()=>console.log('Synthetic visual fixture on 127.0.0.1:4340'));
