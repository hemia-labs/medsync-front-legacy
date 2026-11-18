// Local QA only: real DocumentsAndSignatures inside the Admin shell, synthetic transport, no backend.
const path=require('path');
const root=path.resolve(__dirname,'../../..');
process.env.NODE_ENV='development';process.env.VUE_APP_AUTH_COOKIE_MODE='d2';process.env.VUE_APP_BROWSER_AUTH_TRANSPORT='cookie';process.env.VUE_APP_CSRF_ENABLED='true';process.env.VUE_APP_CORE_URL_API='https://qa.invalid/';
const Service=require('@vue/cli-service/lib/Service');
const port=Number(process.env.NC1_QA_PORT||4372);
const service=new Service(root,{inlineOptions:{lintOnSave:false,pages:{index:{entry:path.join(__dirname,'main.js'),template:path.join(root,'public/index.html'),title:'NC1 B · QA local'}},devServer:{host:'127.0.0.1',port}}});
service.loadUserOptions=()=>({...require(path.join(root,'vue.config.js')),...service.inlineOptions});
service.run('serve',{host:'127.0.0.1',port});
