'use strict';
const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/clinical-operations/evidence/CO25');
async function build(origin){
  const log=fs.openSync(path.join(out,'a5-build.log'),'w');
  const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])env[key]=process.env[key];
  Object.assign(env,{CO25_A5_ORIGIN:origin,NODE_OPTIONS:'--openssl-legacy-provider'});
  try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'co25-a5-build.cjs')],{cwd:root,env,windowsHide:true,stdio:['ignore',log,log]});child.on('exit',code=>code===0?resolve():reject(Error('Verification build failed')));child.on('error',reject);});}finally{fs.closeSync(log);}
}
async function run(){
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'a5-browser-results.json'),JSON.stringify({status:'running',startedAt:new Date().toISOString()},null,2));
  const f=await require('../../../hemia-assistance-back-legacy/scripts/qa/co25-a5-fixture').start();let browser;
  const checks=[],errors=[],failures=[];const pass=name=>{checks.push(name);console.log('PASS '+name);};
  try{
    console.log('Full backend ready; compiling actual application');await build(f.origin);
    browser=await chromium.launch({channel:'msedge',headless:true});
    let attempt=0;
    while(true){
      attempt++;checks.length=0;errors.length=0;failures.length=0;
      try{
        delete require.cache[require.resolve('./co25-a5-cases.cjs')];
        await require('./co25-a5-cases.cjs').run({f,browser,out,pass,errors,failures,attempt});
        fs.writeFileSync(path.join(out,'a5-browser-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),syntheticOnly:true,fullApplication:true,realAuthentication:true,checks,errors,failures},null,2));break;
      }catch(error){
        let message=error.message;for(const a of Object.values(f.actors))message=message.replaceAll(a.password,'[redacted]');
        fs.writeFileSync(path.join(out,'a5-browser-results.json'),JSON.stringify({checks,errors,failures,error:message,location:String(error.stack).split('\n').filter(line=>line.includes('co25-a5-cases.cjs')).join('\n')},null,2));
        console.log('A5 acceptance failed: '+message);
        if(process.env.CO25_A5_INTERACTIVE!=='1')throw Error(message);
        console.log('A5 QA retained in memory. Enter retry, build, or quit.');
        const rl=require('node:readline').createInterface({input:process.stdin});
        const command=await new Promise(resolve=>rl.once('line',resolve));rl.close();
        if(command.trim()==='quit')throw Error('A5 acceptance stopped');
        if(command.trim()==='build')await build(f.origin);
      }
    }
  }catch(error){fs.writeFileSync(path.join(out,'a5-browser-results.json'),JSON.stringify({checks,errors,failures,error:error.message},null,2));throw error;}
  finally{if(browser)await browser.close();await f.close();}
}
run().catch(error=>{const file=path.join(out,'a5-browser-results.json');let result={};try{result=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){}fs.writeFileSync(file,JSON.stringify({...result,status:'failed',error:error.message},null,2));console.error(error.name+': '+error.message);process.exitCode=1;});
