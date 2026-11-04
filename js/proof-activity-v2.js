(()=>{'use strict';
const one=s=>document.querySelector(s), status=one('#activity-v2-status'),grid=one('#activity-v2-heatmap'),detail=one('#activity-v2-day');
if(!status||!grid||!detail)return;
function el(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e}
function dateText(s){return new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}
function mondayOf(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d}
function validDate(s){return /^20[0-9]{2}-[01][0-9]-[0-3][0-9]$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))}
function safePublicLink(uri){try{const u=new URL(uri);return u.protocol==='https:'&&u.hostname==='github.com'&&u.pathname.startsWith('/Skrwl1909/')}catch{return false}}
async function init(){
const res=await fetch('/data/proof-activity-v2.json',{cache:'no-store'});if(!res.ok)throw Error('Git history snapshot unavailable');
const payload=await res.json();
if(payload.schema_version!==2||payload.full_history_backfill!==true||!Array.isArray(payload.days)||!validDate(payload.as_of)||!payload.yearly)throw Error('Invalid history snapshot');
const byDay=new Map(payload.days.map(d=>[d.date,d]));
let year=2026;
const stats=one('#activity-v2-stats'), months=one('#activity-v2-months'), yearButtons=[...document.querySelectorAll('[data-history-year]')];
const number=n=>Number(n).toLocaleString('en-GB');
function showDay(date){
const d=byDay.get(date);detail.replaceChildren();
if(!d){detail.textContent=dateText(date)+' — no matching main-branch authored commit in this snapshot. Other development may have happened.';return}
detail.append(el('strong','',dateText(date)+' · '+d.public_commits+' public commit(s) · '+d.private_commits+' private commit(s)'));
if(d.public_commits){const links=el('div','proof-day-links');for(const url of d.public_sources){if(!safePublicLink(url))continue;const a=el('a','',new URL(url).pathname.split('/').slice(-1)[0].slice(0,9)+' · GitHub receipt ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a)}detail.append(links)}
if(d.private_commits)detail.append(el('p','proof-private-disclosure','Private count only — source code, SHA, commit messages and file paths are not published.'));
}
function render(){
stats.replaceChildren();grid.replaceChildren();months.replaceChildren();
const y=payload.yearly[String(year)];if(!y)throw Error('Missing yearly totals');
for(const [n,label] of [[y.public_commits+y.private_commits,'Founder-authored commits'],[y.active_days,'Days with Git activity'],[y.active_weeks,'Active calendar weeks'],[y.active_months,'Active months']]){
const card=el('div','proof-stat');card.append(el('strong','',number(n)),el('span','',label));stats.append(card)}
for(const b of yearButtons)b.setAttribute('aria-pressed',String(b.dataset.historyYear===String(year)));
const min=mondayOf(year+'-01-01'), end=new Date(year+'-12-31T12:00:00Z');const endDay=year===Number(payload.as_of.slice(0,4))?payload.as_of:year+'-12-31';
let t=new Date(min),week=0,lastMonth='';
while(t<=end){const day=t.toISOString().slice(0,10),data=byDay.get(day),isYear=t.getUTCFullYear()===year, isFuture=day>endDay;
const button=el('button','proof-cell');button.type='button';button.dataset.level='none';
if(!isYear||isFuture){button.disabled=true;button.classList.add('proof-outside');button.setAttribute('aria-label',day+' outside current evidence window')}
else{const publicCount=data?.public_commits||0, privateCount=data?.private_commits||0,total=publicCount+privateCount;
const level=total===0?'none':privateCount>0?'both':'github';button.dataset.level=level;button.dataset.density=total>=12?'4':total>=6?'3':total>=3?'2':total>0?'1':'0';
button.setAttribute('aria-label',dateText(day)+': '+publicCount+' public, '+privateCount+' private Git commits');
button.title=button.getAttribute('aria-label');button.addEventListener('click',()=>showDay(day));
if(!data)button.classList.add('proof-inactive')}
grid.append(button);
if(t.getUTCDay()===0){week++}
t.setUTCDate(t.getUTCDate()+1)}
months.textContent='Jan     Feb     Mar     Apr     May     Jun     Jul     Aug     Sep     Oct     Nov     Dec';
detail.textContent='Select a day to inspect its source-backed record.';
}
for(const b of yearButtons)b.addEventListener('click',()=>{year=Number(b.dataset.historyYear);render()});
render();status.textContent='';
}
init().catch(err=>{status.textContent='Audited Git activity is not available. The public PR and devlog records remain accessible below.';console.warn('Project activity snapshot unavailable:',err.message)});
})();