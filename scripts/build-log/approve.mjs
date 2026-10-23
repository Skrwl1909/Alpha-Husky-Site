#!/usr/bin/env node
/**
 * Human-initiated only. Converts a previously reviewed GitHub evidence candidate
 * into a conservative public 'IMPLEMENTED — NOT VERIFIED' entry.
 * The user must inspect the diff and merge the reviewed PR.
 */
import fs from 'node:fs';
import {validateDraft,validatePublic} from './validate.mjs';
const day=process.argv[2], review=process.argv[3];
if(!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||review!=='--reviewed'){
  console.error('Usage: node scripts/build-log/approve.mjs YYYY-MM-DD --reviewed');
  process.exit(2);
}
const file='data/build-log-drafts/'+day+'.json';
const candidate=JSON.parse(fs.readFileSync(file,'utf8'));
validateDraft(candidate);
if(candidate.date!==day)throw Error('Mismatched day');
if(candidate.review_state!=='reviewed')throw Error('Candidate must have review_state=reviewed after editorial review');
const projects=[...new Set(candidate.evidence.map(x=>x.repository))];
const title=String(candidate.editorial?.title||('Development record · '+day)).trim();
const facts=candidate.evidence.map(x=>'#'+x.pr_number+' '+x.title).slice(0,7).join('; ');
const fallback='Merged public pull requests: '+facts+'. This records integrated source changes only; it does not confirm production deployment, player access or a successful device test.';
const summary=String(candidate.editorial?.summary||fallback).trim();
const entry={
  id:'merged-'+day,
  date:day,
  status:'implemented',
  title,
  summary,
  tags:['Development','Source record',...(projects.some(x=>x.endsWith('webapp'))?['Game']:['Website'])],
  sources:candidate.evidence.slice(0,20).map(x=>({label:x.repository.split('/')[1]+' #'+x.pr_number,url:x.url}))
};
const db=JSON.parse(fs.readFileSync('data/build-log.json','utf8'));
if(db.entries.some(e=>e.id===entry.id))throw Error('Already published: '+entry.id);
db.entries.unshift(entry);
db.entries.sort((a,b)=>b.date.localeCompare(a.date));
db.updated_at=new Date().toISOString();
validatePublic(db);
fs.writeFileSync('data/build-log.json',JSON.stringify(db,null,2)+'\n');
console.log('Reviewed candidate inserted in public JSON. Git diff still requires human review and merge.');
