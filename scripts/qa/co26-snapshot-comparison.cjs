const {test}=require('node:test');const assert=require('node:assert/strict');
const {compareSnapshots}=require('../../src/domain/odontogram/compareSnapshots');
const D=require('../../../medsync-back-legacy/src/domain/odontogram/operations');
test('snapshot comparison distinguishes evolution/correction/notes and never interprets missing text as health',()=>{
 const before={id_chart:'chart',...D.emptyChart('mixed')};before.teeth[16].note='Prior note';before.teeth[16].findings=[{id:'a',label:'Caries',status:'active',surfaces:'MO'},{id:'b',label:'Fractura',status:'active',surfaces:null}];
 const after=D.clone(before);after.revision=2;after.teeth[16].findings[0].status='resolved';after.teeth[16].findings[1].status='corrected';after.teeth[16].findings.push({id:'c',label:'Resina',status:'active',surfaces:'MO'});after.teeth[16].note='';
 const result=compareSnapshots(before,after),row=result.teeth.find(row=>row.number===16);
 assert.equal(row.added[0].label,'Resina');assert.deepEqual(row.removed.map(f=>f.resulting_status),['resolved','corrected']);assert.equal(row.note_changed,true);assert.equal(row.before_note,'Prior note');assert.equal(row.after_note,'');assert.equal('healthy' in row,false);
});
test('different charts do not share finding identities and missing dentition is not absence',()=>{
 const before={id_chart:'old',...D.emptyChart('primary')};before.teeth[55].findings=[{id:'same-id',label:'Caries',status:'active',surfaces:'O'}];
 const after={id_chart:'new',...D.emptyChart('permanent')};after.teeth[15].findings=[{id:'same-id',label:'Resina',status:'active',surfaces:'O'}];
 const result=compareSnapshots(before,after);assert.equal(result.teeth.find(row=>row.number===55).after_included,false);assert.equal(result.teeth.find(row=>row.number===15).added.length,1);assert.equal(result.teeth.find(row=>row.number===55).removed[0].resulting_status,'not_in_snapshot');
});
