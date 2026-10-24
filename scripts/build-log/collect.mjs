#!/usr/bin/env node
/**
 * Evidence capture only. No summaries, no automatic publishing.
 * Public GitHub merged pull requests are code history, NOT device verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {buildStoryCandidates} from './story-groups.mjs';

const repos=['Skrwl1909/alpha-husky-webapp','Skrwl1909/Alpha-Husky-Site'];
const timestamp=new Date();
function londonDate(date) {
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const v=Object.fromEntries(p.map(x=>[x.type,x.value]));
  return [v.year,v.month,v.day].join('-');
}
function dateToCollect(now) { return londonDate(new Date(now.getTime()-24*60*60*1000)); }
export {londonDate,dateToCollect};
const day=process.env.BUILD_DATE || dateToCollect(timestamp);
if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00Z')))throw Error('Invalid BUILD_DATE');
const dryRun=process.env.BUILD_LOG_DRY_RUN==='1';
if(!dryRun){
  const publicDb=JSON.parse(fs.readFileSync('data/build-log.json','utf8'));
  if(publicDb.entries?.some(e=>e.date===day&&e.id==='merged-'+day)){
    console.log(JSON.stringify({date:day,result:'HOLD — daily source record already published; cannot duplicate'}));
    process.exit(0);
  }
}
const token=process.env.GITHUB_TOKEN;
if(!token)throw Error('GITHUB_TOKEN required (read public GitHub API).');
const headers={Accept:'application/vnd.github+json','User-Agent':'alpha-husky-build-log/1',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28'};
const evidence=[];
for(const repo of repos){
  for(let page=1;page<=3;page++){
    const url='https://api.github.com/repos/'+repo+'/pulls?state=closed&sort=updated&direction=desc&per_page=100&page='+page;
    const response=await fetch(url,{headers});
    if(!response.ok)throw Error('GitHub pull request read failed: '+repo+' HTTP '+response.status);
    const prs=await response.json();
    if(!Array.isArray(prs))throw Error('GitHub response missing PR array');
    for(const pr of prs){
      if(!pr.merged_at||londonDate(new Date(pr.merged_at))!==day)continue;
      if(String(pr.head?.ref||'').startsWith('auto/build-log-')||/^Build Log evidence:/i.test(String(pr.title||'')))continue;
      const canonical='https://github.com/'+repo+'/pull/'+pr.number;
      evidence.push({repository:repo,pr_number:pr.number,url:canonical,merged_at:pr.merged_at,merge_sha:pr.merge_commit_sha??null,title:String(pr.title||'Untitled merged PR').slice(0,200)});
    }
    if(prs.length<100)break;
  }
}
evidence.sort((a,b)=>a.merged_at.localeCompare(b.merged_at)||a.url.localeCompare(b.url));
const result={
  schema_version:1,
  date:day,
  collected_at:timestamp.toISOString(),
  status:'implemented',
  review_state:'pending',
  evidence,
  story_candidates:buildStoryCandidates(evidence),
  editorial:{title:null,summary:null},
  note:'Merged code only. No runtime or device verification asserted. Review required before any public entry.'
};
if(!evidence.length){console.log(JSON.stringify({date:day,evidence:0,result:'HOLD — no public merged PRs, no entry created'}));process.exit(0)}
const dir=dryRun?'qa-artifacts/build-log':'data/build-log-drafts';
fs.mkdirSync(dir,{recursive:true});
const dest=path.join(dir,day+'.json');
if(fs.existsSync(dest)&&!dryRun){
  const previous=JSON.parse(fs.readFileSync(dest,'utf8'));
  const oldKeys=new Set(previous.evidence?.map(x=>x.url)||[]);
  const newKeys=new Set(result.evidence.map(x=>x.url));
  if(oldKeys.size===newKeys.size&&[...oldKeys].every(k=>newKeys.has(k))){
    console.log(JSON.stringify({date:day,result:'HOLD — identical evidence draft already exists'}));
    process.exit(0);
  }
  if(previous.review_state==='reviewed')throw Error('New merged PR evidence for an already reviewed date; manual reconciliation required');
}
fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({date:day,evidence:evidence.length,dest,result:'DRAFT ONLY'}));
