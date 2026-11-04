#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('data/proof-of-building.json','utf8'));
assert.equal(d.schema_version,1);
assert.match(d.generated_at,/^\d{4}-\d{2}-\d{2}$/);
const allowed=new Set(['Skrwl1909/alpha-husky-webapp','Skrwl1909/Alpha-Husky-Site']);
assert.deepEqual(new Set(d.github.repositories),allowed);
const gh=d.github.days, ar=d.archive.days;
assert.equal(gh.reduce((n,x)=>n+x.merged_prs,0),d.github.merged_pr_count);
assert.equal(ar.reduce((n,x)=>n+x.entries,0),d.archive.entry_count);
assert.ok(gh.length>0&&ar.length>0);
function date(x){return typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))}
for(const series of [gh,ar]){const dates=series.map(x=>x.date);assert.deepEqual([...dates].sort(),dates);assert.equal(new Set(dates).size,dates.length);assert.ok(dates.every(date))}
for(const x of gh){assert.ok(Number.isInteger(x.merged_prs)&&x.merged_prs>0);assert.equal(x.game_prs+x.site_prs,x.merged_prs);assert.ok(x.samples.length<=4);for(const s of x.samples){const u=new URL(s.url);assert.equal(u.hostname,'github.com');assert.ok([...allowed].some(r=>u.pathname.startsWith('/'+r+'/pull/')))}}
for(const x of ar){assert.ok(Number.isInteger(x.entries)&&x.entries>0);assert.equal(x.url,'/history.html#archive-'+x.date)}
for(const x of d.milestones){assert.ok(date(x.date));assert.ok(['merged','archived','committed'].includes(x.status));assert.ok(x.url.startsWith('/history.html#archive-')||x.url.startsWith('https://github.com/Skrwl1909/'))}
for(const x of d.evolution)assert.ok(x.url.startsWith('/history.html')||x.url.startsWith('https://github.com/Skrwl1909/'));
const page=fs.readFileSync('proof-of-building.html','utf8'),index=fs.readFileSync('index.html','utf8');
const history=fs.readFileSync('history.html','utf8');for(const x of ar)assert.ok(history.includes('id="archive-'+x.date+'"'),'Unresolvable archive date '+x.date);assert.match(page,/id="proof-heatmap"/);assert.match(page,/id="proof-milestones"/);assert.match(page,/id="proof-evolution"/);assert.match(index,/href="\/proof-of-building.html"/);
const v=JSON.parse(fs.readFileSync('data/proof-visuals-review.json','utf8'));
assert.equal(v.schema_version,1);
assert.equal(v.groups.length,3);
let imageCount=0;
for(const group of v.groups){for(const item of group.items){
assert.match(item.id,/^[a-z0-9-]+$/);
assert.match(item.original,/^[0-9]+\.jpg$/);
assert.ok(fs.statSync('assets/proof-of-building/'+item.id+'.webp').size>1000,'Missing actual image asset: '+item.id);
imageCount++;
}}
assert.equal(imageCount,8);
assert.match(page,/id="proof-visual-gallery"/);
assert.match(page,/id="consistency-title"/);
assert.match(page,/687<\/strong>/);
assert.match(page,/3,239<\/strong>/);
assert.match(page,/account-wide snapshots provided by the founder/);
assert.match(page,/not a complete history of daily work/);
assert.match(page,/https:\/\/github.com\/Skrwl1909\?tab=overview/);

console.log('Visual source images PASS:',imageCount);
console.log('Proof of Building evidence consistency PASS:',d.github.merged_pr_count,'PRs,',d.archive.entry_count,'archive entries');
