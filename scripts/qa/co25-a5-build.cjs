'use strict';
// Full-app QA build. Do not load the checkout's .env files or publish this output.
const path=require('node:path');
const front=path.resolve(__dirname,'../..');
process.chdir(front);
const Service=require(path.join(front,'node_modules/@vue/cli-service/lib/Service'));
Object.keys(process.env).filter(key=>key.startsWith('VUE_APP_')).forEach(key=>delete process.env[key]);
if(!/^https:\/\/127\.0\.0\.1:\d+$/.test(process.env.CO25_A5_ORIGIN||''))throw Error('Private A5 HTTPS origin required');
Object.assign(process.env,{NODE_ENV:'production',VUE_APP_CORE_URL_API:process.env.CO25_A5_ORIGIN+'/',VUE_APP_AUTH_COOKIE_MODE:'d2',VUE_APP_BROWSER_AUTH_TRANSPORT:'cookie',VUE_APP_CSRF_ENABLED:'true'});
const service=new Service(front);service.loadEnv=()=>{};
service.run('build',{dest:path.resolve(front,'../_qa/co25-a5/build'),clean:false}).catch(()=>{console.error('A5 verification build failed');process.exitCode=1;});
