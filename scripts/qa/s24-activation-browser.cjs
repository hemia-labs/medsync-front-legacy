'use strict';
// Full application and real router/components, explicit API doubles. SQL/auth
// invariants are covered separately by s24-activation-http-mysql.js.
const {chromium,expect}=require('playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const folder=path.resolve(__dirname,'../../../docs/saas-platform/phases/evidence/S24_R4');
(async()=>{
  await fs.mkdir(folder,{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],checks=[];
  try {
    for(const width of [1440,390,320]) {
      const context=await browser.newContext({viewport:{width,height:width===1440?900:844}}),page=await context.newPage();
      let active=false,ack=false,preparationFailure=false,ackFailure=false,statusFailure=false,ackCount=0;
      const requested=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',message=>{if(message.type()==='error' && !message.text().startsWith('Failed to load resource:'))errors.push(message.text());});
      await page.route('http://127.0.0.1:4337/**',async route=>{
        const url=new URL(route.request().url()),endpoint=url.pathname;requested.push(endpoint);
        const status={accountId:'qa-r4',businessId:'qa-business',subscriptionStatus:active?'active':'pending_activation',
          contact:{emailVerified:true,telephoneVerified:false,requiredChannels:['email']},commercialState:active?'activated':'unavailable',
          nextAction:active?(preparationFailure?'retry_preparation':ack?'home':'setup_summary'):'unavailable',welcomePending:!ack,
          destination:active&&!preparationFailure?(ack?'home':'summary'):null,activationCompletedAt:active?'2026-10-23T00:00:00Z':null};
        let json={success:true,status:200,data:{}};
        if(endpoint==='/api/auth/session')json={success:true,data:{authenticated:true,user:{id_login:'qa-r4',id_business:'qa-business',name:'QA Administrator',email:'qa@example.invalid'},role:{code:'admin'},
          permissions:['admin.config'],business:{id_business:'qa-business',name:'Consultorio QA',status:'active',subscriptionStatus:active?'active':'pending_activation',plan:active?'professional':null,registrationWelcomePending:!ack,registrationActivationConfirmed:active},
          tenantOperational:active?{allowed:true}:{allowed:false,code:'TENANT_NOT_OPERATIONAL',reasonCode:'ACCOUNT_PENDING_ACTIVATION',tenantStatus:'pending_activation'},sessionState:'active'}};
        else if(endpoint==='/api/account/activation') {if(statusFailure)return route.fulfill({status:503,json:{code:'REGISTRATION_UNAVAILABLE'}});json=status;}
        else if(endpoint==='/api/account/activation/plans')json={available:false,offers:[],reason:'provider_unavailable',planId:'professional'};
        else if(endpoint==='/api/auth/csrf')json={success:true,data:{csrfToken:'synthetic-csrf',expiresAt:'2099-01-01T00:00:00Z'}};
        else if(endpoint==='/api/account/setup-welcome/acknowledge') {
          ackCount++;assert.deepEqual(route.request().postDataJSON(),{acknowledged:true});
          if(ackFailure)return route.fulfill({status:503,json:{code:'REGISTRATION_UNAVAILABLE'}});
          ack=true;json={acknowledged:true,acknowledgedAt:'2026-10-23T01:00:00Z'};
        }
        else if(endpoint==='/api/business/preparation')json={success:true,data:{steps:[{id:'identity',title:'Datos del consultorio',ready:false,detail:'Completa el domicilio.',action:{path:'/admin?section=identity'}}],pending:1,completed:0}};
        else if(endpoint==='/api/config/theme/get')json={success:true,data:{code:'medical-blue',primary_700:'#1497BD'}};
        else if(endpoint==='/api/config/login-image/get')json={success:true,data:null};
        else if(endpoint==='/api/saas-legal')json={success:true,data:{documents:[],pending_count:0}};
        else if(endpoint==='/api/business/current')json={success:true,data:{name:'Consultorio QA',phone:'5590000000',address:''}};
        return route.fulfill({json});
      });
      await page.goto('http://127.0.0.1:4338/activar-cuenta?paid=true');
      await expect(page.getByRole('heading',{name:'Profesional',exact:true})).toBeVisible();
      assert.equal(requested.some(endpoint=>endpoint.startsWith('/api/business/')),false,'Pending screen must not request clinical readiness');
      assert.equal(await page.getByRole('button',{name:/pagar|simular|activar licencia/i}).count(),0);
      await page.screenshot({path:path.join(folder,'pendiente-'+width+'.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.reload();await expect(page.getByText('Activación pendiente',{exact:true})).toBeVisible();
      active=true;preparationFailure=true;
      await page.getByRole('button',{name:'Actualizar estado',exact:true}).click();
      await expect(page.getByText(/No pudimos revisar la preparación de tu consultorio/)).toBeVisible();
      assert.ok(page.url().includes('/activar-cuenta'));assert.equal(ackCount,0);
      statusFailure=true;
      await page.getByRole('button',{name:'Actualizar estado',exact:true}).click();await expect(page.locator('.flow-alert[role=alert]').last()).toBeVisible();
      statusFailure=false;preparationFailure=false;
      await page.getByRole('button',{name:'Actualizar estado',exact:true}).click();
      await expect(page).toHaveURL('http://127.0.0.1:4338/admin?section=summary');
      await expect(page.getByRole('heading',{name:'Tu licencia está activa. Prepara tu consultorio.'})).toBeVisible();
      assert.equal(new URL(page.url()).searchParams.has('guide'),false);assert.equal(ackCount,0);
      assert.equal(await page.locator('.preparation-guide').count(),0);
      assert.equal(await page.getByText('Probar activación de Profesional',{exact:true}).count(),0);
      await page.screenshot({path:path.join(folder,'bienvenida-'+width+'.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await page.reload();await expect(page.locator('.activation-welcome')).toBeVisible();assert.equal(ackCount,0);
      ackFailure=true;
      await page.getByRole('button',{name:'Entendido, revisar mis tareas',exact:true}).click();
      await expect(page.getByText(/No pudimos guardar la bienvenida/)).toBeVisible();
      ackFailure=false;
      await page.getByRole('button',{name:'Entendido, revisar mis tareas',exact:true}).click();
      await expect(page.locator('.activation-welcome')).toHaveCount(0);
      assert.equal(new URL(page.url()).searchParams.has('guide'),false);
      await page.reload();await expect(page.locator('.activation-welcome')).toHaveCount(0);
      checks.push(width+'px: pending/reload, no client activation or clinical requests, readiness/network recovery, Summary without auto-guide, explicit durable welcome and retry');
      await context.close();
    }
    assert.deepEqual(errors,[]);
    const result={result:'PASS',scope:'Full app browser with API doubles, desktop/mobile, no real checkout or SMTP',checks};
    await fs.writeFile(path.join(folder,'browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
