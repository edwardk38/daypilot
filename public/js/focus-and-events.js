/* ---------------- Focus timer ---------------- */
let tick = null;
function refInfo(ref){
  const it = itemById(ref.itemId); if(!it) return null;
  if(ref.kind==="habit"){ const r=(it.habit.routine||{})[new Date().getDay()]; return {it, title:it.title, sub:r||"Habit", minutes:it.habit.minimum||10, remaining:null, tip:r||""}; }
  if(ref.kind==="step"){ const s=(it.steps||[]).find(x=>x.id===ref.stepId); if(!s) return null; return {it, step:s, title:s.title, sub:it.title, minutes:s.minutes||30, remaining:s.remaining, tip:""}; }
  return {it, title:it.title, sub:"Task", minutes:it.minutes||20, remaining:it.remaining, tip:""};
}
function persistFocus(){ S.focus = focus ? JSON.parse(JSON.stringify(focus)) : null; save(); }
function startFocus(ref){
  if(focus){ if(isActive(ref)){ openFocus(); return; } toast("Finish or pause the active one first."); openFocus(); return; }
  const info = refInfo(ref); if(!info) return;
  const total = info.minutes*60, r0 = info.remaining ?? total;
  focus = {ref, total, base:r0, start0:r0, remaining:r0, running:true, startedAt:Date.now(), hidden:false};
  ov = null; persistFocus(); drawFocus(); clearInterval(tick); tick = setInterval(updateFocus, 500);
}
function openFocus(){ if(!focus) return; focus.hidden=false; ov=null; drawFocus(); }
function hideFocus(){ if(!focus) return; focus.hidden=true; persistFocus(); const o=$("#ov"); if(o) o.remove(); render(); toast("Timer still running. It's on Now as Active."); }
function remainingNow(){ return focus.running ? Math.round(focus.base - (Date.now()-focus.startedAt)/1000) : focus.remaining; }
function fmt(s){ const neg=s<0; s=Math.abs(s); return (neg?"+":"")+Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function drawFocus(){
  const info = refInfo(focus.ref);
  let el = $("#ov"); if(!el){ el=document.createElement("div"); el.id="ov"; $("#app").appendChild(el); }
  el.className="overlay focus"; el.style.background=""; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Focus timer");
  el.innerHTML = `<div class="row" style="justify-content:space-between"><button class="btn text" data-fhide style="color:#C5CEE6;padding:0">${ico("back",20)} Leave it running</button></div>
  <div style="text-align:center"><span class="small" style="color:#A9B6D4">${esc(info.sub)}</span><h1 style="font-size:24px;margin-top:2px">${esc(info.title)}</h1></div>
  <div class="ring"><svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="110" fill="none" stroke="#2A3A5E" stroke-width="12"/><circle id="arc" cx="130" cy="130" r="110" fill="none" stroke="#FF8A7E" stroke-width="12" stroke-linecap="round" transform="rotate(-90 130 130)" stroke-dasharray="0 999"/></svg>
  <div class="c"><span class="time" id="ftime">0:00</span><span class="small" id="fsub" style="color:#A9B6D4"></span></div></div>
  ${info.tip?`<div class="tip">${ico("bulb",20,"#F2D4A4")} ${esc(info.tip)}</div>`:""}
  <div id="fcheck"></div>
  <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
    <button class="btn coral" data-fdone>Done</button>
    <div class="row"><button class="btn ghost" data-ftoggle style="flex:1" id="ftoggle">${focus.running?"Pause":"Resume"}</button>${focus.ref.kind==="habit"?"":`<button class="btn ghost" data-fstop style="flex:1">Stop for today</button>`}</div>
  </div>`;
  updateFocus();
}
function updateFocus(){
  if(!focus) return; const r = remainingNow();
  if(focus.hidden){ const a=$("#activeTime"); if(a) a.textContent = fmt(Math.max(r,-5999)); const arc=$("#activeArc"); if(arc){ const C=2*Math.PI*26, fr=Math.min(1,Math.max(0,1-r/focus.total)); arc.setAttribute("stroke-dasharray", `${(C*fr).toFixed(1)} ${C.toFixed(1)}`); } return; }
  const t=$("#ftime"); if(!t) return;
  t.textContent = fmt(Math.max(r,-5999));
  $("#fsub").textContent = r>=0 ? `left of ${Math.round(focus.total/60)} min` : "over the estimate, no problem";
  const C=2*Math.PI*110, frac=Math.min(1,Math.max(0,1-r/focus.total));
  $("#arc").setAttribute("stroke-dasharray", `${(C*frac).toFixed(1)} ${C.toFixed(1)}`);
  const fc=$("#fcheck"); if(r<0 && fc && !fc.dataset.shown){ fc.dataset.shown="1"; fc.innerHTML=`<div class="tip" style="background:#24345E">Planned time is up. Keep going, wrap up, or tap Done. Extra time is fine.</div>`; }
}
function logHabit(it){
  const t = todayStr(); if(it.habit.log[t]) return false;
  it.habit.log[t] = true; logDone("habit"); return true;
}
function completeStep(it, step, workedMin){
  step.done = true; delete step.remaining; it.minutesLogged = (it.minutesLogged||0) + (workedMin||0);
  if((it.steps||[]).every(s=>s.done)){ it.status = "done"; it.doneAt = new Date().toISOString(); }
}
/* Completion moment: shown whenever a session ends, finished or stopped early. Calm, one screen. */
function routeBar(steps, cur){
  return `<div class="route" aria-hidden="true">${steps.map((s,k)=>`<i class="${s.done?"done":k===cur?"cur":""}"></i>`).join("")}</div>`;
}
function showCompletion(info, finished, workedMin, next){
  const it = info.it, steps = info.step ? (it.steps||[]) : [];
  const k = info.step ? steps.indexOf(info.step) : -1;
  const route = k>=0 ? `<div class="card" style="background:#1E2D52;color:#E3E8F4;gap:8px;text-align:left;width:100%"><span class="small" style="color:#A9B6D4">Step ${k+1} of ${steps.length} · ${esc(it.title)}</span>${routeBar(steps, finished ? steps.findIndex(s=>!s.done) : k)}</div>` : "";
  const worked = workedMin<1 ? "Under a minute" : `${workedMin} min`;
  $("#ov").innerHTML = `<div style="margin:auto 0;display:flex;flex-direction:column;gap:14px;text-align:center;align-items:center">
      ${finished?`<span style="width:56px;height:56px;border-radius:50%;background:#2E7D5B;display:flex;align-items:center;justify-content:center">${ico("check",28,"#fff")}</span>`:""}
      <h1>${finished?`${esc(info.title)}, done`:"You started. That counts."}</h1>
      ${finished?"":`<span style="color:#C5CEE6">${esc(info.title)} stays on Now for next time.</span>`}
      ${route}
      <div class="dstat" style="flex:none;padding:10px 18px"><b>${worked}</b><span>time worked</span></div></div>
      ${next?`<div class="tip" style="text-align:left"><span class="small" style="color:#FF8A7E;font-weight:700">Next</span><br><b>${esc(next.title)}</b> · about ${next.minutes} min</div>`:""}
      <div style="display:flex;flex-direction:column;gap:8px">${next?`<button class="btn coral" data-go-task="${next.itemId}" data-step="${next.stepId||""}">Keep going</button>`:""}<button class="btn ghost" data-fclose>Done for now</button></div>`;
}
// The next thing to offer: the following step on the same route, else the top of Now (never the thing just stopped).
function nextAfter(ref){
  const list = actionables().filter(a=>a.kind!=="setup" && !(a.itemId===ref.itemId && (a.stepId||null)===(ref.stepId||null)));
  return list.find(a=>a.itemId===ref.itemId) || list[0] || null;
}
function endFocus(kind){
  if(focus.hidden && kind!=="pause"){ focus.hidden=false; drawFocus(); }
  const info = refInfo(focus.ref); if(!info){ focus=null; persistFocus(); clearInterval(tick); render(); return; } const it = info.it; const r = remainingNow();
  const sessionMin = Math.max(0, Math.round((focus.start0 - r)/60));
  if(focus.start0 - r >= 120) markStart(); // a 2-minute session counts toward the start streak, in real seconds
  const workedMin = Math.max(1, Math.round((focus.total - r)/60));
  clearInterval(tick);
  const target = focus.ref.kind==="step" ? info.step : it;
  if(kind==="done"){
    if(focus.ref.kind==="habit"){ logHabit(it); }
    else { logDone("step"); if(focus.ref.kind==="step") completeStep(it, info.step, workedMin); else { it.status="done"; it.doneAt=new Date().toISOString(); delete it.remaining; } }
    addMin(Math.max(1, sessionMin)); save();
    const ref = focus.ref; focus = null; persistFocus();
    showCompletion(info, true, workedMin, nextAfter(ref));
  } else if(kind==="stop"){
    addMin(sessionMin);
    if(focus.ref.kind==="step") it.minutesLogged = (it.minutesLogged||0)+sessionMin;
    delete target.remaining; const ref = focus.ref, stopMin = Math.round((focus.total - r)/60); focus=null; save(); persistFocus();
    showCompletion(info, false, stopMin, nextAfter(ref));
  } else if(kind==="pause"){
    if(focus.ref.kind!=="habit") target.remaining = Math.max(60, r);
    addMin(sessionMin); if(focus.ref.kind==="step") it.minutesLogged=(it.minutesLogged||0)+sessionMin;
    focus=null; persistFocus(); const o=$("#ov"); if(o) o.remove(); render(); toast("Paused. It's waiting at the top of Now.");
  }
}

/* ---------------- Events ---------------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button, a"); if(!b) return;
  const d = b.dataset;
  if(d.tab){ if(d.tab==="itin"){ itinDate=todayStr(); itinView=itinView||"day"; tlScrolled=null; } tab=d.tab; const o=$("#ov"); if(o && !(focus && !focus.hidden)){ o.remove(); ov=null; } render(); $("#main").scrollTop=0; return; }
  if("fhide" in d){ hideFocus(); return; }
  if("emenu" in d){ energyMenu=!energyMenu; render(); return; }
  if(d.strip!==undefined){ stripOpen = stripOpen==+d.strip ? -1 : +d.strip; render(); return; }
  if(d.sleep){ S.sleep=S.sleep||{}; S.sleep[todayStr()]=d.sleep; if(d.sleep==="rough") S.sleepHint=todayStr(); save(); render(); toast(d.sleep==="rough"?"Noted. Taking it easier today is allowed.":"Noted."); return; }
  if("lowsheet" in d){ lowSheet(); return; }
  if("fivemin" in d){ const sc=$("#scrim"); if(sc) sc.remove(); const top=actionables().find(a=>a.kind!=="setup"); if(top){ startFocus({kind:top.kind==="step"?"step":"task", itemId:top.itemId, stepId:top.stepId||null}); if(focus){ focus.total=300; focus.base=300; focus.start0=300; focus.remaining=300; persistFocus(); drawFocus(); } } return; }
  if("ftoggleCard" in d){ if(focus.running){ focus.remaining=remainingNow(); focus.running=false; } else { focus.base=focus.remaining; focus.startedAt=Date.now(); focus.running=true; } persistFocus(); render(); return; }
  if("fopen" in d){ openFocus(); return; }
  if("fdonecard" in d){ endFocus("done"); return; }
  if(d.turnto){ const sc=$("#scrim"); const id=ov&&ov.id; if(sc) sc.remove(); const it=itemById(id); if(!it) return; it.draft=freshDraft(d.turnto); it.draft.fromIdea=true; it.draft.title=it.title; save(); openOv("plan", id); return; }
  if(d.pin){ const it=itemById(d.pin); it.pinned=!it.pinned; save(); toast(it.pinned?"Added to Now":"Removed from Now"); if(ov) renderOv(); else render(); return; }
  if(d.dumpdel){ const it=itemById(d.dumpdel); if(it && (it.type==="unplanned" || confirm(`"${it.title}" is already planned. Delete it everywhere?`))){ S.items=S.items.filter(x=>x.id!==d.dumpdel); save(); render(); toast("Deleted"); } return; }
  if(d.taskcheck){ const it=itemById(d.taskcheck); logDone("step"); it.status="done"; it.pinned=false; it.doneAt=new Date().toISOString(); save(); render(); toast(`Done · ${it.title}`); return; }
  if(d.hor){ horView=d.hor; tab="hor"; render(); return; }
  if(d.energy){ S.energy=d.energy; energyMenu=false; save(); render(); return; }
  if(b.id==="dumpBtn"){ doDump(); return; }
  if(d.plan){ openOv("plan", d.plan); return; }
  if(d.open){ openOv("item", d.open); return; }
  if(d.goTask!==undefined){ startFocus({kind:d.step?"step":"task", itemId:d.goTask, stepId:d.step||null}); return; }
  if(d.hstart){ startFocus({kind:"habit", itemId:d.hstart}); return; }
  if(d.hdone){ const it=itemById(d.hdone); const ok=logHabit(it); save(); toast(ok?`${it.title} · done today`:"Already done today"); if(ov) renderOv(); else render(); return; }
  if(d.hskip){ const it=itemById(d.hskip); it.habit.skip=it.habit.skip||{}; it.habit.skip[todayStr()]=true; save(); toast("Skipped for today. No penalty."); render(); return; }
  // plan-it controls
  if(ov && ov.kind==="plan"){
    const it = itemById(ov.id);
    if(d.pnav){ const dr=it.draft; if(d.pnav==="next"){ if(dr.step===0 && !dr.type) return; const nm=$("#nameIn"); if(nm) dr.title=nm.value; dr.step=Math.min(totalSteps(dr)-1, dr.step+1); } else { dr.step=Math.max(0, dr.step-1); if(dr.type==="task" && dr.step<2) dr.more=false; } save(); renderOv(); const b=$("#planBody"); if(b) b.scrollTop=0; return; }
    if(d.pmore!==undefined){ const nm=$("#nameIn"); if(nm) it.draft.title=nm.value; it.draft.more=true; it.draft.step=2; save(); renderOv(); return; }
    if(d.focuschat!==undefined){ const c=$("#chatIn"); if(c) c.focus(); return; }
    if(d.finish){ finishPlan(it, d.then); return; }
    if(d.ptype){ it.draft.type=d.ptype; if(it.draft.step>0) it.draft.step=1; save(); renderOv(); return; }
    if(d.pf){ it.draft[d.pf] = it.draft[d.pf]==d.v && d.pf==="feeling" ? null : d.v; save(); renderOv(); return; }
    if(d.pday!==undefined){ const k=+d.pday; const a=it.draft.days; it.draft.days = a.includes(k)?a.filter(x=>x!==k):a.concat(k).sort(); save(); renderOv(); return; }
    if(d.notquite){ it.correcting=true; renderOv(); const c=$("#corrIn"); if(c) c.focus(); return; }
    if(d.corr){ const v=($("#corrIn").value||"").trim(); if(v) understand(it, v); return; }

    if(d.restart){ it.draft=null; it.chat=[]; it.steps=[]; it.routine=null; it.doc=null; renderOv(); toast("Started over."); return; }
  }
  if(ov && ov.kind==="item"){
    const it = itemById(ov.id);
    if(d.ideatab){ it.ideaTab=d.ideatab; save(); renderOv(); return; }
    if(d.thinktime){ S.items.push({id:uid(), raw:"Think it through: "+it.title, title:"Think it through: "+it.title, type:"task", minutes:30, due:todayStr(), at:"", noTime:true, status:"open", created:Date.now(), planned:true, linkedIdea:it.id}); save(); toast("Added a 30-minute thinking block to today's Tasks"); return; }
    if(d.turninto){ const sh=document.createElement("div"); sh.className="scrim"; sh.id="scrim"; sh.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-label="Turn it into"><div class="grab"></div><b style="font-size:20px">Turn it into…</b>${["goal","assignment","task","habit"].map(k=>{const t=TYPE_INFO[k]; return `<button class="typecard row" data-turnto="${k}" style="--c:${t.col};flex-direction:row;align-items:center;gap:12px;padding:12px 14px"><span class="ti">${ico(t.icon,20,t.col)}</span><span style="display:flex;flex-direction:column;align-items:flex-start"><b>${t.label}</b><span>${t.desc}</span></span></button>`;}).join("")}<div class="fact small"><b>Comes with it:</b> your take and notes${(it.spark||{}).source?", the source":""}${it.chat&&it.chat.length?", and your conversation":""}. The plan's first steps can be built from them.</div></div>`; $("#app").appendChild(sh); return; }
    if(d.hday!==undefined){ const k=+d.hday; const a=it.habit.days; it.habit.days = a.includes(k)?a.filter(x=>x!==k):a.concat(k).sort(); if(!it.habit.days.length) it.habit.days=[k]; save(); renderOv(); return; }
    if(d.hmin){ it.habit.minimum=+d.hmin; save(); renderOv(); return; }
    if(d.stepdone){ const s=it.steps.find(x=>x.id===d.stepdone); logDone("step"); completeStep(it,s,0); save(); toast("Step logged"); if(it.status==="done"){ closeOv(); toast(`${it.title} complete!`); } else renderOv(); return; }
    if(d.complete){ markStart(); it.status="done"; it.doneAt=new Date().toISOString(); save(); closeOv(); toast(`${it.title} complete!`); return; }
    if(d.taskdone){ logDone("step"); it.status="done"; it.pinned=false; it.doneAt=new Date().toISOString(); save(); closeOv(); toast("Logged"); return; }
    if(d.replan){ it.draft={type:null,minutes:null,due:"",feeling:null,days:[0,1,2,3,4,5,6],time:"",minimum:10,date:"",etime:"",title:""}; it.type="unplanned"; save(); openOv("plan", it.id); return; }
    if(d.delitem){ if(confirm(it.status==="done"?`Delete "${it.title}" forever?`:`Delete "${it.title}"?`)){ S.items=S.items.filter(x=>x.id!==it.id); save(); closeOv(); toast("Deleted"); } return; }
    if(d.reopen){ it.status="open"; delete it.doneAt; if(it.steps) it.steps.forEach(s=>{}); save(); renderOv(); toast("Reopened"); return; }
  }
  if(ov){
    const it = itemById(ov.id);
    if(d.starter!==undefined){ const type = it.type==="unplanned"?it.draft.type:it.type; sendChat(it.ai.starters[type][+d.starter]); return; }
    if(d.send!==undefined){ const ci=$("#chatIn"); const v=ci.value; ci.value=""; sendChat(v); return; }
    if(d.mkplan!==undefined){ makePlan(); return; }
    if(d.mkroutine!==undefined){ makeRoutine(); return; }
    if(d.clearchat!==undefined){ it.chatArchive=(it.chatArchive||[]).concat(it.chat||[]).slice(-60); it.chat=[]; save(); renderOv(); toast("Chat cleared from view. Notes and memory kept."); return; }
    if(d.stepadd!==undefined){ it.steps=it.steps||[]; it.steps.push({id:uid(),title:"New step",minutes:30,done:false}); save(); renderOv(); return; }
    if(d.stepdel){ it.steps=it.steps.filter(s=>s.id!==d.stepdel); save(); renderOv(); return; }
    if(d.ovclose!==undefined){ closeOv(); return; }
  }
  if(d.ovclose!==undefined){ closeOv(); return; }
  // focus
  if("fdone" in d){ endFocus("done"); return; }
  if("fstop" in d){ endFocus("stop"); return; }
  if("fpause" in d){ endFocus("pause"); return; }
  if("fclose" in d){ const o=$("#ov"); if(o) o.remove(); render(); return; }
  if("ftoggle" in d){ if(focus.running){ focus.remaining=remainingNow(); focus.running=false; } else { focus.base=focus.remaining; focus.startedAt=Date.now(); focus.running=true; } $("#ftoggle").textContent=focus.running?"Pause":"Resume"; persistFocus(); return; }
});
document.addEventListener("change", e => {
  const t = e.target;
  if(t.id==="fileIn" && t.files && t.files[0]){ attachFile(t.files[0]); return; }
  if(!ov) return; const it = itemById(ov.id); if(!it) return;
  if(t.dataset.pfin){ it.draft[t.dataset.pfin] = t.value; save(); if(["feelVal","due","date","time"].includes(t.dataset.pfin)) renderOv(); return; }
  if(t.dataset.rename!==undefined){ const v=t.value.trim(); if(v){ it.title=v.slice(0,80); save(); toast("Renamed"); } return; }
  if(t.dataset.notes!==undefined){ it.notes=t.value.slice(0,3000); save(); toast("Notes saved"); return; }
  if(t.dataset.htime!==undefined){ it.habit.time=t.value; save(); return; }
  if(t.dataset.stepedit){ const s=it.steps.find(x=>x.id===t.dataset.stepedit); if(s){ s.title=t.value.slice(0,80); save(); } return; }
  if(t.dataset.routine!==undefined){ const tgt = it.type==="habit"?it.habit:it; tgt.routine=tgt.routine||{}; tgt.routine[t.dataset.routine]=t.value.slice(0,60); if(it.type!=="habit") it.routine=tgt.routine; save(); return; }
});
document.addEventListener("click", e => { if(e.target.id==="scrim"){ if(ov) e.target.remove(); else closeOverlay(); } });
document.addEventListener("keydown", e => {
  if(e.key==="Enter" && e.target){
    if(e.target.id==="dumpIn"){ e.preventDefault(); doDump(); return; }
    if(e.target.id==="chatIn"){ e.preventDefault(); const v=e.target.value; e.target.value=""; sendChat(v); return; }
    if(e.target.id==="corrIn"){ e.preventDefault(); const v=e.target.value.trim(); if(v) understand(itemById(ov.id), v); return; }
  }
  if(e.key==="Escape"){ const sc=$("#scrim"); if(sc){ if(ov) sc.remove(); else closeOverlay(); } else if(ov) closeOv(); }
});
if(S.focus){ focus = S.focus; focus.hidden = true; if(refInfo(focus.ref)){ clearInterval(tick); tick=setInterval(updateFocus,500); } else { focus=null; S.focus=null; } }
render();
