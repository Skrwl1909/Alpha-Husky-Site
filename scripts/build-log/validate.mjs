#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';

const dateRx=/^\d{4}-\d{2}-\d{2}$/;
const allowed=['Skrwl1909/alpha-husky-webapp','Skrwl1909/Alpha-Husky-Site'];
function validDate(d){return typeof d==='string'&&dateRx.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'));}
function validUrl(str){
  try {
    const u=new URL(str);
    return u.protocol==='https:'&&u.hostname==='github.com'&&allowed.some(r=>u.pathname.startsWith('/'+r+'/pull/'));
  }catch{return false}
}
export function validateDraft(d){
  assert.equal(d.schema_version,1,'Draft schema');
  assert.ok(validDate(d.date),'Draft date');
  assert.ok(['pending','reviewed'].includes(d.review_state),'Review state');
  assert.equal(d.status,'implemented','Automation must never mark VERIFIED');
  assert.ok(Array.isArray(d.evidence)&&d.evidence.length>0&&d.evidence.length<=150,'Evidence count');
  const ids=new Set();
  for(const e of d.evidence){
    assert.ok(allowed.includes(e.repository),'Source repo not allowlisted');
    assert.ok(Number.isInteger(e.pr_number)&&e.pr_number>0,'PR number');
    assert.ok(validUrl(e.url),'PR URL');
    assert.equal(e.url,'https://github.com/'+e.repository+'/pull/'+e.pr_number,'Canonical PR URL');
    assert.ok(!ids.has(e.url),'Duplicate source');
    ids.add(e.url);
    assert.ok(e.title&&typeof e.title==='string'&&e.title.length<=200,'Title');
    assert.ok(typeof e.merged_at==='string'&&!Number.isNaN(Date.parse(e.merged_at)),'Merged timestamp');
  }
}
export function validatePublic(db){
  assert.equal(db.version,1,'Public schema');
  assert.ok(Array.isArray(db.entries),'Public entries');
  assert.ok(db.entries.length<=500,'Public feed size');
  const ids=new Set();
  for(const e of db.entries){
    assert.ok(typeof e.id==='string'&&/^[a-z0-9-]{8,70}$/.test(e.id),'Entry id');
    assert.ok(!ids.has(e.id),'Duplicate entry');
    ids.add(e.id);
    assert.ok(validDate(e.date),'Entry date');
    assert.ok(['implemented','verified','hold'].includes(e.status),'Public status');
    assert.ok(typeof e.title==='string'&&e.title.length>=5&&e.title.length<=140,'Headline size');
    assert.ok(typeof e.summary==='string'&&e.summary.length>=40&&e.summary.length<=1200,'Summary size');
    assert.ok(Array.isArray(e.tags)&&e.tags.length<=4,'Tags');
    assert.ok(Array.isArray(e.sources)&&e.sources.length>=1&&e.sources.length<=20,'Sources present');
    for(const src of e.sources){assert.ok(validUrl(src.url),'Source must be canonical, allowlisted GitHub PR');assert.ok(typeof src.label==='string'&&src.label.length<=70,'Source label')}
    if(e.status==='verified'){
      assert.ok(e.verification_note&&e.verification_source,'Verified requires separate test evidence');
      assert.ok(validUrl(e.verification_source),'Verification source must link to reviewed PR');
    }
  }
}
const db=JSON.parse(fs.readFileSync('data/build-log.json','utf8'));
validatePublic(db);
const draftsDir='data/build-log-drafts';
if(fs.existsSync(draftsDir)){
  for(const filename of fs.readdirSync(draftsDir)){
    if(!filename.endsWith('.json'))continue;
    const obj=JSON.parse(fs.readFileSync(path.join(draftsDir,filename),'utf8'));
    validateDraft(obj);
    assert.equal(filename,obj.date+'.json','Draft filename date mismatch');
  }
}
console.log('Build Log schema / evidence QA PASS');
