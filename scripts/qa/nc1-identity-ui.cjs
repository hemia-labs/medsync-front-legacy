'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
 const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'src/components/identity/IdentityFields.vue'),'utf8');
 const template=source.slice(source.indexOf('<template>')+10,source.lastIndexOf('</template>'));
 const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace('export default','window.Nc1Fields =');
 const style=source.match(/<style scoped>([\s\S]*?)<\/style>/)[1];
 const browser=await chromium.launch({headless:true,channel:'msedge'});const errors=[];
 try {for(const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.abort());
  await page.setContent('<html lang="es"><head><meta charset="utf-8"></head><body><main id="app"><nc1-fields v-model="identity" required-sex></nc1-fields><pre id="result">{{ JSON.stringify(identity) }}</pre></main></body></html>');
  await page.addStyleTag({content:style+' body{font-family:Arial;margin:16px}pre{white-space:pre-wrap;overflow-wrap:anywhere}'});
  await page.addScriptTag({path:require.resolve('vue/dist/vue.js')});await page.addScriptTag({content:script});
  await page.evaluate(t=>{window.Nc1Fields.template=t;window.qa=new window.Vue({el:'#app',components:{'nc1-fields':window.Nc1Fields},data:{identity:{}}});},template);
  await page.getByLabel('Sexo biológico').selectOption('3');
  await page.getByLabel('¿Se autodenomina indígena?').selectOption('declined');
  await page.getByLabel('Situación migratoria').selectOption('returned');
  const value=await page.evaluate(()=>window.qa.identity);assert.equal(value.biologicalSex,'3');assert.equal(value.indigenousSelfIdentification,'declined');assert.equal(value.migrantStatus,'returned');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByText('Claves de nacimiento y residencia',{exact:true}).click();await page.getByLabel('Nacionalidad: clave RENAPO').fill('MEX');
  assert.deepEqual(await page.evaluate(()=>window.qa.identity.nationality),{family:'renapo.nationality',code:'MEX'});
  const out=path.join(root,'_qa/nc1');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'identity-'+width+'.png'),fullPage:true});await page.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: IdentityFields Vue 2, 390/1280, enums, candidate refs, no overflow/page errors. Synthetic component QA only.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
