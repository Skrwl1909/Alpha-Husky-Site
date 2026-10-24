// Pure editorial candidate grouping. A PR title/description is a lead, not proof of a tested feature.
export function classify(pr){
 const content=(String(pr.title||'')+' '+String(pr.body||'').slice(0,1600)+' '+(pr.changed_files||[]).join(' ')).toLowerCase();
 const groups=[
 ['tactical-ops',/\btactical\b|\bcombat\b|\bwar table\b|\bfield ops\b/],
 ['signal-atlas',/\bsignal atlas\b|\bskill tree\b|\bsector crests?\b/],
 ['lore',/\blore\b|\bcanon\b|\bfracture\b|\bstory\b/],
 ['howl-ecosystem',/\bhowl ecosystem\b|\btreasury\b|\bholder\b|\bhowlpay\b/],
 ['build-log',/\bbuild log\b|\bbuild-log\b/],
 ['android',/\bandroid\b|\bcapacitor\b|\bguest recovery\b/],
 ['first-hour',/\bftue\b|\btutorial\b|\bfirst signal\b/]
 ];
 return groups.find(([key,rx])=>rx.test(content))?.[0]||'needs-triage';
}
export function buildStoryCandidates(evidence){
 const grouped=new Map();
 for(const pr of evidence){
  const group=classify(pr);
  // Unknown PRs are separate candidates: no accidental catch-all "misc" story.
  const key=group==='needs-triage'?'triage-'+pr.repository.replace('/','-')+'-'+pr.pr_number:group;
  if(!grouped.has(key))grouped.set(key,{id:key,category:group,review_state:'pending',editorial:{title:null,summary:null},evidence_urls:[],source_count:0});
  const item=grouped.get(key);item.evidence_urls.push(pr.url);item.source_count++;
 }
 return [...grouped.values()].sort((a,b)=>b.source_count-a.source_count||a.id.localeCompare(b.id));
}
