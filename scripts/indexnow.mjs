import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const origin = 'https://alphahusky.win';
const key = 'a8d3c4f19e724b60b52f8a917d63ce04';
const hash = b => createHash('sha256').update(b).digest('hex');
const deps = {
 'build-log.html': ['data/build-log.json'],
 'history.html': ['assets/updates.json'],
 'proof-of-building.html': ['data/proof-of-building.json','data/proof-activity-v2.json']
};
const sitemap = readFileSync('sitemap.xml','utf8');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => {
 const u = new URL(m[1]);
 if (u.origin !== origin || u.search || u.hash || !/^\/(?:[a-z0-9-]+\.html)?$/.test(u.pathname)) throw Error('Invalid sitemap URL');
 return {url:u.href,path:u.pathname.slice(1)||'index.html'};
});
const all = process.env.INDEXNOW_ALL === 'true';
const dry = process.env.INDEXNOW_DRY_RUN !== 'false';
const before = process.env.INDEXNOW_BEFORE;
let changed = [];
if (!all) {
 if (!/^[a-f0-9]{40}$/.test(before||'') || /^0+$/.test(before)) throw Error('Missing valid comparison base; use manual all mode');
 changed = execFileSync('git',['diff','--name-only',before,'HEAD'],{encoding:'utf8'}).trim().split('\n');
}
const selected = pages.filter(p=>all || changed.includes(p.path) || (deps[p.path]||[]).some(d=>changed.includes(d)));
console.log('Selected:',selected.map(p=>p.url));
if (dry || !selected.length) process.exit(0);
async function matches(path, remotePath=path) {
 const res = await fetch(origin+'/'+remotePath,{redirect:'error',cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
 return res.ok && hash(Buffer.from(await res.arrayBuffer())) === hash(readFileSync(path));
}
const gate = async()=> {
 if (!await matches(key+'.txt')) return false;
 for (const p of selected) {
  if (!await matches(p.path,p.path==='index.html'?'':p.path)) return false;
  for (const d of deps[p.path]||[]) if (!await matches(d)) return false;
 }
 return true;
};
let ready=false;
for(let i=0;i<10;i++){
 try {ready=await gate();} catch(e){console.log('Gate:',e.message);}
 if(ready) break;
 if(i<9) await new Promise(r=>setTimeout(r,30000));
}
if(!ready) throw Error('Production parity not confirmed; no submission. Re-run manually after deployment.');
const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:'alphahusky.win',key,keyLocation:origin+'/'+key+'.txt',urlList:selected.map(p=>p.url)}),signal:AbortSignal.timeout(30000)});
console.log('IndexNow HTTP',r.status);
if (![200,202].includes(r.status)) throw Error('Submission not accepted; inspect status before retry');
