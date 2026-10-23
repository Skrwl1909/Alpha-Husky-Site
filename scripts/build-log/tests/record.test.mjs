import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDraft,validatePublic} from '../validate.mjs';
import {dateToCollect,londonDate} from '../collect.mjs';

test('no empty or unsourced public entries',()=>{
  assert.throws(()=>validatePublic({version:1,entries:[{id:'made-up',date:'2026-10-22',status:'verified',title:'Fabricated',summary:'No proof',tags:[],sources:[]}]}));
});
test('reject impossible source provenance',()=>{
  assert.throws(()=>validateDraft({schema_version:1,date:'2026-10-22',review_state:'pending',status:'implemented',evidence:[{repository:'Skrwl1909/Alpha-Husky-Site',pr_number:11,url:'https://example.com/claim',title:'Test',merged_at:'2026-10-22T12:00:00Z'}]}));
});
test('valid public records are conservative',()=>{
  assert.doesNotThrow(()=>validatePublic({version:1,entries:[{id:'merged-2026-10-22',date:'2026-10-22',status:'implemented',title:'October development',summary:'Merged source work recorded from approved public pull requests; deployment and device behavior remain unverified.',tags:['Website'],sources:[{label:'Website #11',url:'https://github.com/Skrwl1909/Alpha-Husky-Site/pull/11'}]}]}));
});
test('UK clock date not accidental UTC day',()=>{
  assert.equal(londonDate(new Date('2026-07-01T23:30:00Z')),'2026-07-02');
  assert.equal(dateToCollect(new Date('2026-10-23T08:00:00Z')),'2026-10-22');
});