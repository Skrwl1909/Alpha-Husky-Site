import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ah-build-log-'));
const root=path.resolve('scripts/build-log/approve.mjs');
try{
  fs.mkdirSync(path.join(temp,'data/build-log-drafts'),{recursive:true});
  const date='2026-10-23';
  const evidence=[11,13].map(n=>({
    repository:'Skrwl1909/Alpha-Husky-Site',
    pr_number:n,
    url:'https://github.com/Skrwl1909/Alpha-Husky-Site/pull/'+n,
    merged_at:'2026-10-23T14:00:00Z',
    title:'Reviewed merged change '+n
  }));
  const draft={
    schema_version:1,date,status:'implemented',review_state:'pending',evidence,
    editorial:{title:null,summary:null}
  };
  const writeDraft=()=>fs.writeFileSync(path.join(temp,'data/build-log-drafts/'+date+'.json'),JSON.stringify(draft));
  const dbFile=path.join(temp,'data/build-log.json');
  fs.writeFileSync(dbFile,JSON.stringify({version:1,updated_at:null,entries:[]}));
  const run=()=>spawnSync(process.execPath,[root,date,'--reviewed'],{cwd:temp,encoding:'utf8'});
  writeDraft();
  let result=run();
  assert.notEqual(result.status,0,'Pending must not publish');
  draft.review_state='reviewed';
  writeDraft();
  result=run();
  assert.notEqual(result.status,0,'Human review without editorial must not publish');
  draft.editorial.title='Website and Build Log merged into main';
  draft.editorial.summary='Two merged source changes were recorded, including the HOWL page and the Build Log foundation. This is not a claim of device testing or production verification.';
  writeDraft();
  result=run();
  assert.equal(result.status,0,'Approved edited entry should publish: '+result.stderr);
  const data=JSON.parse(fs.readFileSync(dbFile));
  assert.equal(data.entries.length,1);
  assert.equal(data.entries[0].status,'implemented');
  assert.equal(data.entries[0].sources.length,2);
  result=run();
  assert.notEqual(result.status,0,'Duplicate publishing must fail');
  console.log('Build Log approval end-to-end PASS: pending refused, unedited refused, reviewed accepted, duplicate refused');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
