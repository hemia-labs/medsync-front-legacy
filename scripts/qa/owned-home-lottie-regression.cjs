'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/views/Home/components/OwnedHomeLottie.vue'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
let resolve,created=0,destroyed=0;const LegacyLottie={methods:{loadJsonData:()=>new Promise(r=>{resolve=r;}),async init(){await this.loadJsonData(this.path);if(this.anim)this.anim.destroy();created++;this.anim={destroy(){destroyed++;}};}}};
const c={module:{exports:{}},LegacyLottie,Error};vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replace('export default','module.exports ='),c);const component=c.module.exports;
function owner(){const o={anim:null,path:'lottie/doctor-afternoon.json'};for(const[n,f]of Object.entries(component.methods))o[n]=f.bind(o);component.created.call(o);return o;}
(async()=>{const a=owner(),load=a.init();component.beforeDestroy.call(a);resolve({});await load;assert.equal(created,0,'A late asset must not create an animation after owner destruction');assert.equal(a.anim,null);
const b=owner(),first=b.init();resolve({});await first;assert.equal(created,1);component.deactivated.call(b);component.beforeDestroy.call(b);assert.equal(destroyed,1,'Only the owned instance is destroyed once');
const d=owner(),initial=d.init();resolve({});await initial;component.deactivated.call(d);component.activated.call(d);resolve({});await new Promise(r=>setImmediate(r));assert.equal(created,3);component.beforeDestroy.call(d);assert.equal(destroyed,3);
console.log('PASS owned Home Lottie: destroy once, late JSON cannot create orphan, deactivation/reactivation single owner; real owner methods with controlled asset/renderer.');})().catch(e=>{console.error(e.stack);process.exitCode=1;});
