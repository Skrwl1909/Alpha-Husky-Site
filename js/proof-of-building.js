(async()=>{'use strict';
const $=s=>document.querySelector(s), status=$('#proof-status'), heat=$('#proof-heatmap'), detail=$('#proof-day');
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=String(text);return n}
function link(url,label){if(typeof url!=='string')return null;let u;try{u=new URL(url,location.origin)}catch{return null}if(u.protocol!=='https:'&&u.origin!==location.origin)return null;const a=el('a','',label);a.href=u.href;if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}return a}
function dateValid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))}
function present(d){return new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}
try{
async function renderPublicCommits(){
const status=$('#project-activity-status'),panel=$('#project-activity-panel'),calendar=$('#project-activity-calendar'),stats=$('#project-activity-stats'),detail=$('#project-activity-day');
try{
const response=await fetch('/data/proof-activity.json',{cache:'no-store'});if(!response.ok)throw Error('Public commit snapshot unavailable');
const snapshot=await response.json();
if(snapshot.schema_version!==1||!Array.isArray(snapshot.days)||!Array.isArray(snapshot.sources))throw Error('Invalid commit snapshot');
const map=new Map(snapshot.days.map(entry=>[entry.date,entry]));
let selectedYear='2026';
function draw(){
calendar.replaceChildren();stats.replaceChildren();detail.textContent='Select an active date to inspect the repository breakdown.';
const yearData=snapshot.years[selectedYear]||{commits:0,active_days:0};
const start=new Date(selectedYear+'-01-01T12:00:00Z'),end=new Date(selectedYear+'-12-31T12:00:00Z');
start.setUTCDate(start.getUTCDate()-start.getUTCDay());end.setUTCDate(end.getUTCDate()+(6-end.getUTCDay()));
const activeWeeks=new Set(snapshot.days.filter(x=>x.date.startsWith(selectedYear)).map(x=>{const d=new Date(x.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10)})).size;
for(const [value,label] of [[yearData.commits,'Public repository commits'],[yearData.active_days,'Days with commits'],[activeWeeks,'Weeks with commits']]){
const card=el('div','proof-stat');card.append(el('strong','',value.toLocaleString('en-GB')),el('span','',label));stats.append(card)}
for(let t=new Date(start);t<=end;t.setUTCDate(t.getUTCDate()+1)){
const date=t.toISOString().slice(0,10),inYear=date.startsWith(selectedYear),entry=inYear?map.get(date):null,number=entry?.commits||0;
const level=number>=15?4:number>=7?3:number>=3?2:number>0?1:0;
const button=el('button','proof-cell proof-commit-cell');button.type='button';button.dataset.level=String(level);
button.disabled=!inYear||!number;button.title=date+' · '+number+' public commit(s)';
button.setAttribute('aria-label',button.title);
if(inYear&&number)button.addEventListener('click',()=>{
detail.replaceChildren(el('strong','',present(date)+' · '+number+' commit(s) across public repositories'));
const breakdown=el('div','proof-day-links');
for(const [repoName,count] of Object.entries(entry.repositories)){
const source=snapshot.sources.find(x=>x.id===repoName);if(!source)continue;
const anchor=link('https://github.com/'+source.repository+'/commits',''+repoName+': '+count);if(anchor)breakdown.append(anchor)}
detail.append(breakdown);
});
calendar.append(button)}
document.querySelectorAll('[data-commit-year]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.commitYear===selectedYear)));
}
document.querySelectorAll('[data-commit-year]').forEach(btn=>btn.addEventListener('click',()=>{selectedYear=btn.dataset.commitYear;draw()}));
draw();panel.hidden=false;status.textContent='';
}catch(error){status.textContent='The public code-history snapshot is unavailable. The verified PR and devlog record below remains accessible.';console.warn('Commit calendar unavailable:',error.message)}
}
await renderPublicCommits();
const r=await fetch('/data/proof-of-building.json',{cache:'no-store'});if(!r.ok)throw Error('No data');const d=await r.json();if(d.schema_version!==1||!Array.isArray(d.github?.days)||!Array.isArray(d.archive?.days)||!Array.isArray(d.milestones)||!Array.isArray(d.evolution))throw Error('Invalid data');
const gm=new Map(d.github.days.map(x=>[x.date,x])),am=new Map(d.archive.days.map(x=>[x.date,x]));
const archiveDays=d.archive.days.filter(x=>dateValid(x.date)).length,githubDays=d.github.days.filter(x=>dateValid(x.date)).length;
for(const [count,label] of [[d.github.merged_pr_count,'Merged public PRs'],[d.archive.entry_count,'Dated archive entries'],[new Set([...gm.keys(),...am.keys()]).size,'Days with a public trace']]){const card=el('div','proof-stat');card.append(el('strong','',count),el('span','',label));$('#proof-stats').append(card)}
const first=[...gm.keys(),...am.keys()].filter(dateValid).sort()[0],last=[...gm.keys(),...am.keys()].filter(dateValid).sort().at(-1);
if(!first||!last)throw Error('No dated evidence');
const begin=new Date(first+'T12:00:00Z');begin.setUTCDate(begin.getUTCDate()-begin.getUTCDay());const end=new Date(last+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+(6-end.getUTCDay()));
let filter='all',selected=null;
function inspect(day){selected=day;detail.replaceChildren();const g=gm.get(day),a=am.get(day);detail.append(el('strong','',present(day)+' · '+(g?.merged_prs||0)+' merged PR(s) · '+(a?.entries||0)+' archived note(s)'));const links=el('div','proof-day-links');if(g){for(const sample of (g.samples||[])){const l=link(sample.url,sample.title);if(l)links.append(l)}}if(a){const l=link(a.url||'/history.html','Read the dated archived note');if(l)links.append(l)}if(!links.children.length)detail.append(el('p','','No public activity in the selected sources for this date; other work may have happened.'));else detail.append(links)}
function draw(){heat.replaceChildren();for(let t=new Date(begin);t<=end;t.setUTCDate(t.getUTCDate()+1)){const day=t.toISOString().slice(0,10),g=gm.get(day),a=am.get(day),gh=!!g&&filter!=='archive',ar=!!a&&filter!=='github',level=gh&&ar?'both':gh?'github':ar?'archive':'none';const btn=el('button','proof-cell');btn.type='button';btn.dataset.level=level;btn.title=day+': '+(gh?g.merged_prs:0)+' merged PRs, '+(ar?a.entries:0)+' archived notes';btn.setAttribute('aria-label',btn.title);btn.disabled=level==='none';if(level!=='none')btn.addEventListener('click',()=>inspect(day));heat.append(btn)}}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();detail.textContent='Select a documented day to inspect its sources.'}));draw();
if(last)inspect(last);$('#proof-updated').textContent=d.generated_at;
for(const p of d.evolution){const card=el('article','proof-card');card.append(el('small','',p.label),el('h3','',p.title),el('p','',p.description));const l=link(p.url,'Explore the '+p.evidence+' ↗');if(l)card.append(l);$('#proof-evolution').append(card)}
for(const p of d.milestones){const card=el('article','proof-milestone'),stamp=el('time','',present(p.date)),body=el('div');stamp.dateTime=p.date;body.append(el('h3','',p.title),el('p','',p.description),el('span','proof-proof-tag',p.status+' source · '));const l=link(p.url,'Inspect evidence ↗');if(l)body.append(l);card.append(stamp,body);$('#proof-milestones').append(card)}
try{
const visualResponse=await fetch('/data/proof-visuals-review.json',{cache:'no-store'});
if(!visualResponse.ok)throw Error('Visual evidence register unavailable');
const visuals=await visualResponse.json(), gallery=$('#proof-visual-gallery');
if(visuals.schema_version!==1||!Array.isArray(visuals.groups))throw Error('Visual evidence register invalid');
const groupCopy={
map:'Regions Map — authentic interface states, not a verified release sequence.',
navigation:'Navigation — from character-centred menus to the dedicated Hub.',
gameplay:'Historical game interfaces. No matched modern gameplay capture is asserted.'
};
for(const group of visuals.groups){
const section=el('section','proof-visual-group'),heading=el('h4','',group.title),intro=el('p','',groupCopy[group.id]||'Historical interface screenshots');
const cards=el('div','proof-visual-cards');section.append(heading,intro,cards);
for(const item of group.items||[]){
if(!/^[a-z0-9-]+$/.test(item.id))continue;
const card=el('figure','proof-visual-card'),img=el('img','proof-visual-image');img.src='/assets/proof-of-building/'+item.id+'.webp';img.alt='Historical Alpha Husky Telegram WebApp screenshot — '+item.role;img.loading='lazy';img.decoding='async';img.width=300;img.onerror=()=>{card.hidden=true};
const caption=el('figcaption',''),label=el('strong','',item.role),sub=el('span','','Capture date unverified · original '+item.original);caption.append(label,sub);card.append(img,caption);cards.append(card)
}
gallery.append(section)
}
}catch(galleryError){console.warn('Historical images unavailable:',galleryError.message)}
status.textContent='';
}catch(e){status.textContent='Proof records are temporarily unavailable. You can still inspect the original Build History and GitHub repositories using the links below.';detail.textContent='No unverified activity is displayed.';console.error('Proof of Building unavailable:',e.message)}
})();