const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const babel = require('@babel/core');
const calls = [];
const DACore = Object.fromEntries(['get','put','post'].map(method => [method, async(...args) => { calls.push({method,args}); return {success:true}; }]));
const file = path.resolve(__dirname, '../../src/services/core/odontogram/DAOdontogramV2Service.js');
const compiled = babel.transformSync(fs.readFileSync(file,'utf8'),{babelrc:false,configFile:false,plugins:[require.resolve('@babel/plugin-transform-modules-commonjs')]}).code;
const moduleObject = {exports:{}};
vm.runInNewContext(compiled,{module:moduleObject,exports:moduleObject.exports,require:()=>({DACore}),encodeURIComponent});
(async()=>{
 const api=moduleObject.exports.default;
 await api.capabilities();await api.list('patient');await api.read('chart',2);await api.create('patient',{request_id:'new'});
 await api.operations('chart',{batch_id:'batch'});await api.transition('chart','finalize',{request_id:'close'});await api.setMode('v2_readonly');
 assert.deepEqual(calls.map(call=>call.args[0]),['api/odontogram/v2/capabilities','api/odontogram/v2/charts/patient','api/odontogram/v2/chart/chart?revision=2','api/odontogram/v2/charts/patient','api/odontogram/v2/chart/chart/ops','api/odontogram/v2/chart/chart/finalize','api/odontogram/v2/mode']);
 assert.equal(calls[4].args[1].batch_id,'batch');
 console.log('PASS actual CO26 service URLs/methods/payloads through mocked shared authenticated transport.');
})().catch(error=>{console.error(error);process.exitCode=1;});
