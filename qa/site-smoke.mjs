import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:8765/';
const widths = [360, 390, 768, 1440];
const issues = [], records = [];
fs.mkdirSync('qa-artifacts', {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:process.env.QA_CHROMIUM_EXECUTABLE ?? '/usr/bin/google-chrome', args:['--no-sandbox']});
try {
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
    const exceptions = [], errors = [];
    page.on('pageerror', e=>exceptions.push(String(e)));
    page.on('console', m=>{if (m.type()==='error') errors.push(m.text())});
    const response = await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('.howl-network-live').waitFor({timeout:8000});
    await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0)});
    await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img')].map(async i=>{i.loading='eager';await Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,1800))]);}))});
    await page.waitForTimeout(600);
    const data = await page.evaluate(()=>{
      const all = [...document.querySelectorAll('img')];
      const refs = [...document.querySelectorAll('a[href^="#"]')];
      const badImgs=all.filter(x=>(!x.complete||x.naturalWidth===0)&&new URL(x.src,location.href).origin===location.origin).map(x=>({src:x.getAttribute('src'),complete:x.complete,width:x.naturalWidth}));
      const missingHash=refs.filter(x=>x.getAttribute('href')!== '#'&&!document.getElementById(x.hash.slice(1))).map(x=>x.getAttribute('href'));
      const tree=document.querySelector('.howl-network-live');
      const holder=document.querySelector('.howl-live-holder');
      const treasury=document.querySelector('.howl-live-treasury');
      const shell=document.querySelector('.shell');
      const body=document.body;
      const root=document.documentElement;
      return {
        horizontalOverflow:Math.max(body.scrollWidth,root.scrollWidth)-root.clientWidth,
        imagesBroken:badImgs,
        missingAnchors:missingHash,
        holderVisible:holder?.getBoundingClientRect().width>0,
        treasuryVisible:treasury?.getBoundingClientRect().width>0,
        treeWidth:Math.round(tree?.getBoundingClientRect().width||0),
        rootWidth:root.clientWidth,
        fonts:document.fonts.status,
        mint:document.getElementById('official-mint')?.textContent.trim(),
        stylesheet:[...document.styleSheets].some(s=>String(s.href).includes('howl-ecosystem.css'))
      };
    });
    const expected='FY6ynAy9XUfiABUf9PkF9QzjSmZDTfWJJMLTmYyjBAGS';
    const c={
      httpOk:response.status()===200,
      noHorizontalOverflow:data.horizontalOverflow<=2,
      allImagesLoaded:data.imagesBroken.length===0,
      noMissingAnchors:data.missingAnchors.length===0,
      coreNodesVisible:data.holderVisible&&data.treasuryVisible,
      officialMint:data.mint===expected,
      howlCssLoaded:data.stylesheet,
      noJsExceptions:exceptions.length===0
    };
    // Errors from third-party network calls are separately reported; not a hard fail.
    const result={width,checks:c,data,exceptions,consoleErrors:errors.slice(0,6)};
    records.push(result);
    for (const [name,pass] of Object.entries(c)) if(!pass) issues.push({width,name,detail:result});
    if(width===390){
      const menu=page.locator('.menu-toggle');
      await menu.click();
      if(await menu.getAttribute('aria-expanded')!=='true')issues.push({width, name:'menu toggles open'});
      await page.keyboard.press('Escape');
      if(await menu.getAttribute('aria-expanded')!=='false')issues.push({width,name:'menu closes on Escape'});
      await page.locator('a[href="#howl-holder-proof-title"]').first().click();
      const visible = await page.evaluate(()=>{const e=document.getElementById('howl-holder-proof-title');const r=e.getBoundingClientRect();return r.top>=-130&&r.top<window.innerHeight});
      if(!visible)issues.push({width,name:'proof navigation scrolls to holder'});
    }
    await page.screenshot({path:'qa-artifacts/site-'+width+'.png',fullPage:true,animations:'disabled'});
    await page.close();
  }
  // Full-site smoke: all user-facing static routes at representative mobile width.
  for (const route of ['bible.html','contact.html','cookies.html','eclipse-event.html','history.html','howloween.html','lore.html','privacy.html','terms.html']) {
    const page=await browser.newPage({viewport:{width:390,height:850}});
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));
    const response=await page.goto(new URL(route,base).toString(),{waitUntil:'domcontentloaded',timeout:30000});
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=850){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,12))}window.scrollTo(0,0)});
    await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img')].map(async i=>{i.loading='eager';await Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,1600))])}))});
    await page.waitForTimeout(200);
    const data=await page.evaluate(()=>{
      const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);
      const hrefs=[...document.querySelectorAll('a[href^="#"]')].map(x=>x.getAttribute('href')).filter(x=>x!=='#');
      return {overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-document.documentElement.clientWidth,
       brokenImages:[...document.querySelectorAll('img')].filter(x=>(!x.complete||x.naturalWidth===0)&&new URL(x.src,location.href).origin===location.origin).map(x=>({src:x.src,loading:x.loading,complete:x.complete})),
       offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>document.documentElement.clientWidth+2||r.left< -2)}).slice(0,14).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,80),id:el.id,box:[Math.round(el.getBoundingClientRect().left),Math.round(el.getBoundingClientRect().right)]})),
       duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),
       brokenAnchors:hrefs.filter(x=>!ids.includes(x.slice(1)))};
    });
    const checks={httpOk:response.status()===200,noHorizontalOverflow:data.overflow<=2,imagesLoaded:data.brokenImages.length===0,noDuplicateIds:data.duplicateIds.length===0,noMissingAnchors:data.brokenAnchors.length===0,noPageErrors:pageErrors.length===0};
    records.push({route,width:390,checks,data,pageErrors});
    for(const [name,pass] of Object.entries(checks))if(!pass)issues.push({route,width:390,name,data});
    await page.close();
  }
} finally { await browser.close(); }
fs.writeFileSync('qa-artifacts/results.json',JSON.stringify({base,records,issues},null,2));
console.log(JSON.stringify({widths,results:records.map(x=>({route:x.route??'index.html',width:x.width,checks:x.checks,imagesBroken:x.data?.imagesBroken??x.data?.brokenImages,overflow:x.data?.horizontalOverflow??x.data?.overflow,consoleErrors:x.consoleErrors})),failures:issues.map(x=>({route:x.route??'index.html',width:x.width,name:x.name,detail:{imagesBroken:x.detail?.data?.imagesBroken,overflow:x.detail?.data?.horizontalOverflow}}))},null,2));
assert.equal(issues.length,0,'Site browser QA failures: '+issues.map(x=>x.width+':'+x.name).join(', '));
