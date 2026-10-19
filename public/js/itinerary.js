/* ================= Itinerary (v0.6) ================= */
const HPX = 52, DAY0 = 6, DAY1 = 24;
let itinView = "day", itinDate = null, tlScrolled = null, tlScrollTop = 0;
const refKey = r => `${r.kind}:${r.itemId}:${r.stepId||""}`;
const hm = s => { if(!s) return null; const [h,m]=s.split(":").map(Number); return h+m/60; };
const toHM = h => { const hh=Math.floor(h), mm=Math.round((h-hh)*60); return String(hh).padStart(2,"0")+":"+String(mm===60?0:mm).padStart(2,"0"); };
function dateObj(s){ return new Date(s+"T12:00:00"); }
function shiftDate(s,n){ const d=dateObj(s); d.setDate(d.getDate()+n); return todayStr(d); }
function plansFor(date){ S.plan=S.plan||{}; return S.plan[date]||(S.plan[date]=[]); }
function placedAt(ref, date){ const p=(S.plan||{})[date||todayStr()]; if(!p) return null; const x=p.find(q=>refKey(q.ref)===refKey(ref) && !q.proposed); return x?x.start:null; }
function refTitle(ref){
  const it=itemById(ref.itemId); if(!it) return null;
  if(ref.kind==="step"){ const s=(it.steps||[]).find(x=>x.id===ref.stepId); if(!s) return null; return {title:s.title, sub:it.title, minutes:s.minutes||30, col:"var(--coral)", done:s.done}; }
  if(ref.kind==="habit") return {title:it.title, sub:"Habit", minutes:(it.habit&&it.habit.minimum)||10, col:"var(--blue)", done:!!((it.habit||{}).log||{})[todayStr()]};
  return {title:it.title, sub:"Task", minutes:it.minutes||20, col:"var(--coral)", done:it.status==="done"};
}
function trayFor(date){
  const t=todayStr(), dow=dateObj(date).getDay(), out=[];
  const placed=new Set(plansFor(date).map(p=>refKey(p.ref)));
  for(const it of S.items){
    if(it.status!=="open") continue;
    if(it.type==="task"){
      if(it.at || it.noTime) continue;
      const due=it.due;
      const show = due===date || (date===t && ((due && due<t) || (!due && it.pinned)));
      if(show && !(it.skipOn===date)) out.push({ref:{kind:"task",itemId:it.id}, title:it.title, minutes:it.minutes||20, col:"var(--coral)", sub:it.pinned?"Your pick":"Task", noAuto:!!it.noAuto});
    }
    if(it.type==="assignment"||it.type==="goal"){
      const s=(it.steps||[]).find(x=>!x.done); if(!s) continue;
      const show = s.planDate===date || (!s.planDate && date===t && (it.pinned || (it.due && daysUntil(it.due)<=3)));
      if(show && s.skipOn!==date) out.push({ref:{kind:"step",itemId:it.id,stepId:s.id}, title:s.title, minutes:s.minutes||30, col:"var(--coral)", sub:it.title, noAuto:!!it.noAuto});
    }
    if(it.type==="habit" && !it.habit.time && (it.habit.days||[]).includes(dow) && !(it.habit.log||{})[date] && !(it.habit.skip||{})[date])
      out.push({ref:{kind:"habit",itemId:it.id}, title:it.title, minutes:it.habit.minimum||10, col:"var(--blue)", sub:"Habit", noAuto:!!it.noAuto});
  }
  return out.filter(x=>!placed.has(refKey(x.ref)));
}
function fixedFor(date){
  const dow=dateObj(date).getDay(), out=[];
  for(const it of S.items){
    if(it.type==="unplanned") continue;
    if(it.type==="event" && it.status==="open" && it.event && it.event.time && (it.event.date===date || (it.event.repeat==="weekly" && dateObj(it.event.date).getDay()===dow && it.event.date<=date)))
      out.push({h:hm(it.event.time), dur:(it.event.dur||60), title:it.title, kind:"event", feeling:it.feeling, id:it.id});
    if(it.type==="habit" && it.status==="open" && it.habit.time && (it.habit.days||[]).includes(dow))
      out.push({h:hm(it.habit.time), dur:it.habit.minimum||10, title:it.title, kind:"habit", done:!!(it.habit.log||{})[date], id:it.id});
    if(it.type==="task" && it.at && it.due===date)
      out.push({h:hm(it.at), dur:it.minutes||20, title:it.title, kind:"task", done:it.status==="done", id:it.id});
  }
  return out;
}
/* ---- Fill my day ---- */
function fillDay(date, proposed){
  const items = trayFor(date).filter(x=>!x.noAuto);
  if(!items.length) return 0;
  const isToday = date===todayStr(); const now=new Date();
  let start = isToday ? Math.max(8, Math.ceil((now.getHours()+now.getMinutes()/60+0.1)*4)/4) : 8;
  let end = 22;
  const busy = fixedFor(date).map(f=>({a:f.h, b:f.h+f.dur/60, f})).concat(plansFor(date).map(p=>({a:hm(p.start), b:hm(p.start)+p.dur/60})));
  for(const b of busy.slice()){ if(b.f && b.f.kind==="event"){ if(b.f.feeling==="excited") end=Math.min(end, b.a-0.5); if(b.f.feeling==="scary"){ b.a-=0.5; b.b+=0.5; } } }
  const win = {morning:[8,12], afternoon:[13,17], evening:[18,21]}[S.focusWin||"afternoon"];
  const fits = (a,dur) => a>=start && a+dur<=end && !busy.some(b=> a < b.b+0.17 && a+dur > b.a-0.17);
  const findSlot = (dur, pref) => {
    const ranges = pref ? [[Math.max(pref[0],start), pref[1]], [start,end]] : [[start,end]];
    for(const [a0,a1] of ranges){ for(let a=Math.ceil(a0*4)/4; a+dur<=a1+1e-6; a+=0.25){ if(fits(a,dur)) return a; } }
    return null;
  };
  const order = items.slice().sort((x,y)=> (y.ref.kind==="habit")-(x.ref.kind==="habit") || y.minutes-x.minutes);
  let n = 0; const hardest = items.filter(x=>x.ref.kind!=="habit").sort((a,b)=>b.minutes-a.minutes)[0];
  for(const x of order){
    const dur = x.minutes/60;
    const a = findSlot(dur, x===hardest ? win : (x.ref.kind==="habit" ? [8,10] : null));
    if(a==null) continue;
    plansFor(date).push({ref:x.ref, start:toHM(a), dur:x.minutes, proposed:!!proposed});
    busy.push({a, b:a+dur}); n++;
  }
  return n;
}
function maybeAutoPlan(date){
  const mode = S.autoPlan || "suggest";
  if(mode==="off" || date!==todayStr()) return;
  S.proposedOn = S.proposedOn || {};
  if(mode==="suggest" && !S.proposedOn[date] && trayFor(date).some(x=>!x.noAuto)){ if(fillDay(date, true)) { S.proposedOn[date]=true; save(); } }
  if(mode==="auto" && trayFor(date).some(x=>!x.noAuto)){ if(fillDay(date, false)) save(); }
}
/* ---- deadline status (refined in the next chunk) ---- */
function deadlineStatus(it){
  if(!it.due) return null;
  const steps = it.steps||[];
  if((it.type==="assignment"||it.type==="goal") && !steps.length) return {lab:"No plan yet", cls:""};
  const remaining = it.type==="task" ? (it.status==="done"?0:(it.minutes||20)) : steps.filter(s=>!s.done).reduce((a,s)=>a+(s.minutes||30),0);
  if(!remaining) return {lab:"Done", cls:"exc"};
  const days = Math.max(0, daysUntil(it.due)) + 1; const cap = days*120;
  if(remaining > cap) return {lab:"At risk", cls:"scary"};
  if(remaining > cap*0.6) return {lab:"Tight", cls:"due"};
  return {lab:"On track", cls:"exc"};
}
/* ---- views ---- */
function itinHeader(){
  const d = itinDate; const ds=dateObj(d); const sun=new Date(ds); sun.setDate(ds.getDate()-ds.getDay());
  const strip = [...Array(7)].map((_,k)=>{ const x=new Date(sun); x.setDate(sun.getDate()+k); const xs=todayStr(x); return `<button data-idate="${xs}" aria-pressed="${xs===d}" class="dstrip${xs===d?" on":""}${xs===todayStr()?" today":""}"><span>${"SMTWTFS"[k]}</span><b>${x.getDate()}</b></button>`; }).join("");
  const seg = ["day","week","month"].map(v=>`<button data-iview="${v}" aria-pressed="${itinView===v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join("");
  const title = itinView==="month" ? ds.toLocaleDateString(undefined,{month:"long",year:"numeric"}) : itinView==="week" ? `${sun.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${new Date(sun.getFullYear(),sun.getMonth(),sun.getDate()+6).toLocaleDateString(undefined,{month:"short",day:"numeric"})}` : ds.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  return `<div class="pad" style="padding-top:18px;padding-bottom:8px;gap:10px">
    <div class="row" style="justify-content:space-between"><h1>Itinerary</h1><div class="row" style="gap:6px">${itinView!=="month"?`<button class="btn ink" data-fill style="min-height:36px;padding:0 14px;font-size:13px">Fill my ${itinView}</button>`:""}<button class="iconbtn" data-isettings aria-label="Planning settings" style="width:40px;height:40px">${ico("gear",20)}</button></div></div>
    <div class="seg">${seg}</div>
    ${itinView==="day"?`<div style="display:flex;gap:4px">${strip}</div>`:""}
    <div class="row" style="justify-content:space-between"><button class="iconbtn" data-ishift="-1" aria-label="Previous" style="width:36px;height:36px">${ico("back",18)}</button><b style="font-size:15px">${title}</b><button class="iconbtn" data-ishift="1" aria-label="Next" style="width:36px;height:36px;transform:scaleX(-1)">${ico("back",18)}</button></div>
  </div>`;
}
function viewItinerary(){
  if(!itinDate) itinDate = todayStr();
  if(itinView==="day") maybeAutoPlan(itinDate);
  let body = itinHeader();
  if(itinView==="day") body += dayView(itinDate);
  else if(itinView==="week") body += weekView(itinDate);
  else body += monthView(itinDate);
  return body;
}
function trayChip(x){ return `<button class="tchip" data-drag="tray" data-ref='${JSON.stringify(x.ref)}' style="--c:${x.col}">${ico("grip",14)}<b>${esc(x.title)}</b><span>${x.minutes}m</span>${x.noAuto?`<em title="Left out of auto-planning">⊘</em>`:""}</button>`; }
function dayView(date){
  const tray = trayFor(date), plans = plansFor(date), fixed = fixedFor(date);
  const proposed = plans.filter(p=>p.proposed);
  let h = `<div class="pad" style="padding-top:0;padding-bottom:6px;gap:6px"><div class="row" style="justify-content:space-between"><b class="small">To place${date===todayStr()?" today":""} · ${tray.length}</b><span class="tiny muted">${tray.length?"drag onto a time · hold for options":"everything is placed"}</span></div>${tray.length?`<div class="tray" id="tray">${tray.map(trayChip).join("")}</div>`:""}</div>`;
  if(proposed.length) h += `<div class="propbar"><span>Proposed: ${proposed.length} placed${S.focusWin?"":", the biggest step in your afternoon focus window"}. Drag any to adjust.</span><button class="btn" data-keep style="background:#FF8A7E;color:#14213D;min-height:36px;padding:0 12px;font-size:13px">Keep</button><button class="btn" data-undoprop style="background:transparent;border:1.5px solid #3A4C78;color:#fff;min-height:36px;padding:0 10px;font-size:13px">Undo</button></div>`;
  const H=(DAY1-DAY0)*HPX; const y=x=>(x-DAY0)*HPX;
  let g = "";
  for(let k=DAY0;k<=DAY1;k++) g += `<span class="hl" style="top:${y(k)-7}px">${k===24?"":timeLabel(String(k%24).padStart(2,"0")+":00").replace(":00","")}</span><div class="hline" style="top:${y(k)}px"></div>`;
  for(const f of fixed){ const hh=Math.max(26,f.dur/60*HPX-4); g += `<div class="blk ${f.kind}${f.done?" done":""}" style="top:${y(f.h)+2}px;height:${hh}px" ${f.kind==="event"?"":`data-open="${f.id}"`}><b>${esc(f.title)}</b>${hh>34?`<span>${timeLabel(toHM(f.h))}${f.kind==="event"&&f.feeling==="excited"?" · excited":f.kind==="event"&&f.feeling==="scary"?" · dreading":""}${f.kind==="habit"?" · habit":""}</span>`:""}</div>`; }
  for(const p of plans){ const info=refTitle(p.ref); if(!info) continue; const st=hm(p.start), hh=Math.max(26,p.dur/60*HPX-4);
    g += `<div class="blk plan ${p.ref.kind}${p.proposed?" prop":""}${info.done?" done":""}" data-drag="block" data-ref='${JSON.stringify(p.ref)}' style="top:${y(st)+2}px;height:${hh}px;--c:${info.col}"><b>${esc(info.title)}</b>${hh>34?`<span>${timeLabel(p.start)} · ${p.dur} min${info.sub&&info.sub!=="Task"?" · "+esc(info.sub):""}</span>`:""}</div>`; }
  if(date===todayStr()){ const n=new Date(); const nh=n.getHours()+n.getMinutes()/60; if(nh>=DAY0) g += `<div class="nowline" style="top:${y(nh)}px"><i></i></div>`; }
  h += `<div class="tl" id="tl"><div class="tlc" id="tlc" style="height:${H+12}px" data-date="${date}">${g}<div id="dropShadow" class="dropshadow" hidden></div></div></div>`;
  return h;
}
function weekView(date){
  const ds=dateObj(date); const sun=new Date(ds); sun.setDate(ds.getDate()-ds.getDay());
  const t=todayStr(); const rest=S.restDays||[];
  const wtray = [];
  for(const it of S.items){
    if(it.status!=="open") continue;
    if(it.type==="task" && !it.due && !it.at) wtray.push({ref:{kind:"task",itemId:it.id}, title:it.title, minutes:it.minutes||20, col:"var(--coral)"});
    if((it.type==="assignment"||it.type==="goal")){ const s=(it.steps||[]).find(x=>!x.done); if(s && !s.planDate) wtray.push({ref:{kind:"step",itemId:it.id,stepId:s.id}, title:s.title, minutes:s.minutes||30, col:"var(--coral)"}); }
  }
  let h = `<div class="pad" style="padding-top:0;padding-bottom:6px;gap:6px"><div class="row" style="justify-content:space-between"><b class="small">To place this week · ${wtray.length}</b><span class="tiny muted">${wtray.length?"drag onto a day":"nothing waiting"}</span></div>${wtray.length?`<div class="tray">${wtray.map(trayChip).join("")}</div>`:""}</div><div class="pad" style="padding-top:2px;gap:6px">`;
  for(let k=0;k<7;k++){
    const x=new Date(sun); x.setDate(sun.getDate()+k); const xs=todayStr(x);
    const fx=fixedFor(xs).filter(f=>f.kind==="event"); const tr=trayFor(xs).length; const pl=plansFor(xs).filter(p=>!p.proposed);
    const mins = pl.reduce((a,p)=>a+p.dur,0) + fixedFor(xs).filter(f=>f.kind!=="event").reduce((a,f)=>a+f.dur,0) + trayFor(xs).reduce((a,x)=>a+x.minutes,0);
    const load = mins>300?3:mins>150?2:mins>0?1:0; const isRest=rest.includes(k);
    const evs = fx.map(f=>`<span class="evc ${f.feeling==="excited"?"x":f.feeling==="scary"?"d":""}">${timeLabel(toHM(f.h)).replace(":00","")} ${esc(f.title)}</span>`).join("");
    const work = (pl.length+tr) ? `${pl.length+tr} thing${pl.length+tr>1?"s":""} planned${pl.length?` · ${pl.length} placed`:""}` : "";
    h += `<button class="wrow${xs===t?" today":""}${isRest?" rest":""}" data-dropday="${xs}" data-idate="${xs}" data-iv="day"><div class="wd"><span>${"SunMonTueWedThuFriSat".substr(k*3,3)}</span><b>${x.getDate()}</b></div><div class="wmid"><div class="tags">${evs||`<span class="tiny muted">${isRest?"Rest day":"Open"}</span>`}</div>${work?`<span class="tiny" style="color:var(--ink2)">${work}</span>`:""}</div>${isRest?`<span class="chip exc">Rest</span>`:`<div class="loadb">${[0,1,2].map(i=>`<i style="background:${i<load?"var(--blue)":"var(--line)"}"></i>`).join("")}</div>`}</button>`;
  }
  return h + `</div>`;
}
function monthView(date){
  const ds=dateObj(date); const first=new Date(ds.getFullYear(), ds.getMonth(), 1); const days=new Date(ds.getFullYear(), ds.getMonth()+1, 0).getDate();
  const t=todayStr(); const rest=S.restDays||[];
  const dues={}, evs={};
  for(const it of S.items){ if(it.status!=="open") continue; if(it.due && (it.type==="assignment"||it.type==="task"||it.type==="goal")) (dues[it.due]=dues[it.due]||[]).push(it); if(it.type==="event"&&it.event) (evs[it.event.date]=evs[it.event.date]||[]).push(it); }
  let cells = "";
  for(let k=0;k<first.getDay();k++) cells += `<div></div>`;
  for(let d=1; d<=days; d++){
    const xs = todayStr(new Date(ds.getFullYear(), ds.getMonth(), d)); const dw=(first.getDay()+d-1)%7;
    const tight = (dues[xs]||[]).some(i=>{ const s=deadlineStatus(i); return s && (s.lab==="Tight"||s.lab==="At risk"); });
    cells += `<button class="mcell${xs===t?" today":""}${rest.includes(dw)?" rest":""}${tight?" tight":""}" data-idate="${xs}" data-iv="day" aria-label="${xs}"><span>${d}</span><i>${dues[xs]?'<em class="dd"></em>':""}${evs[xs]?'<em class="de"></em>':""}</i></button>`;
  }
  const list = S.items.filter(i=>i.status==="open" && i.due && (i.type==="assignment"||i.type==="goal"||i.type==="task") && dateObj(i.due).getMonth()===ds.getMonth() && i.due>=t).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,8);
  return `<div class="pad" style="padding-top:0"><div class="card" style="padding:10px;gap:6px"><div class="mgrid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<span class="tiny muted" style="text-align:center;font-weight:600">${x}</span>`).join("")}${cells}</div>
    <div class="row tiny muted" style="gap:12px;flex-wrap:wrap;padding:4px"><span class="row" style="gap:4px"><em class="dd"></em>Deadline</span><span class="row" style="gap:4px"><em class="de"></em>Event</span><span class="row" style="gap:4px"><em style="width:10px;height:10px;border-radius:3px;box-shadow:0 0 0 2px var(--gem) inset"></em>Tight</span></div></div>
    <b>Deadlines</b>${list.length?list.map(i=>{ const s=deadlineStatus(i)||{lab:"",cls:""}; const dt=dateObj(i.due); return `<button class="item" data-open="${i.id}" style="flex-direction:row;align-items:center;gap:12px;border:none;width:100%;text-align:left"><div style="width:40px;text-align:center"><span class="tiny muted">${dt.toLocaleDateString(undefined,{month:"short"})}</span><br><b>${dt.getDate()}</b></div><span style="flex:1;font-weight:600">${esc(i.title)}</span>${s.lab?`<span class="chip ${s.cls}">${s.lab}</span>`:""}</button>`; }).join(""):`<p class="small muted" style="margin:0">No deadlines left this month.</p>`}</div>`;
}
/* ---- drag and drop ---- */
let drag = null;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest("[data-drag]"); if(!el || tab!=="itin") return;
  const ref = JSON.parse(el.dataset.ref); const info = refTitle(ref); if(!info) return;
  drag = {el, src:el.dataset.drag, ref, info, x:e.clientX, y:e.clientY, moved:false, pid:e.pointerId, lp:null, ghost:null};
  if(drag.src==="tray") drag.lp = setTimeout(()=>{ if(drag && !drag.moved){ const d=drag; drag=null; chipMenu(d.ref); } }, 480);
});
document.addEventListener("pointermove", e => {
  if(!drag || e.pointerId!==drag.pid) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(!drag.moved){
    if(Math.hypot(dx,dy)<8) return;
    if(drag.src==="tray" && Math.abs(dx)>Math.abs(dy)*1.3 && itinView!=="week"){ clearTimeout(drag.lp); drag=null; return; } // horizontal swipe scrolls the tray
    drag.moved = true; clearTimeout(drag.lp);
    const g=document.createElement("div"); g.className="dghost"; g.textContent=drag.info.title; document.body.appendChild(g); drag.ghost=g;
    drag.el.style.opacity=".35";
  }
  e.preventDefault();
  drag.ghost.style.left=(e.clientX-60)+"px"; drag.ghost.style.top=(e.clientY-22)+"px";
  if(itinView==="day"){
    const tl=$("#tl"), tlc=$("#tlc"), sh=$("#dropShadow"); if(!tl) return;
    const r=tl.getBoundingClientRect();
    if(e.clientY<r.top+36) tl.scrollTop-=10; else if(e.clientY>r.bottom-36) tl.scrollTop+=10;
    if(e.clientX>r.left && e.clientX<r.right && e.clientY>r.top && e.clientY<r.bottom){
      const cy = e.clientY - tlc.getBoundingClientRect().top - 12;
      let hh = Math.round((DAY0 + cy/HPX)*4)/4; hh=Math.max(DAY0, Math.min(DAY1-drag.info.minutes/60, hh));
      drag.slot = hh; sh.hidden=false; sh.style.top=((hh-DAY0)*HPX+2)+"px"; sh.style.height=Math.max(26,drag.info.minutes/60*HPX-4)+"px";
      sh.textContent = `${timeLabel(toHM(hh))} – ${timeLabel(toHM(hh+drag.info.minutes/60))}`;
    } else { drag.slot=null; sh.hidden=true; }
  } else {
    document.querySelectorAll(".wrow.drop").forEach(x=>x.classList.remove("drop"));
    const tgt=document.elementFromPoint(e.clientX,e.clientY); const row=tgt&&tgt.closest("[data-dropday]");
    drag.day = row ? row.dataset.dropday : null; if(row) row.classList.add("drop");
  }
}, {passive:false});
function endDrag(e, cancel){
  if(!drag || (e && e.pointerId!==drag.pid)) return;
  const d=drag; drag=null; clearTimeout(d.lp);
  if(d.ghost) d.ghost.remove(); if(d.el) d.el.style.opacity="";
  if(!d.moved){ if(cancel) return; if(d.src==="block") blockMenu(d.ref); else openOv("item", d.ref.itemId); return; }
  if(cancel){ render(); return; }
  if(itinView==="day"){
    const list = plansFor(itinDate); const k=refKey(d.ref);
    if(d.slot!=null){ const ex=list.find(p=>refKey(p.ref)===k); if(ex){ ex.start=toHM(d.slot); ex.proposed=false; } else list.push({ref:d.ref, start:toHM(d.slot), dur:d.info.minutes, proposed:false}); toast(`Placed at ${timeLabel(toHM(d.slot))}`); }
    else if(d.src==="block"){ S.plan[itinDate]=list.filter(p=>refKey(p.ref)!==k); toast("Moved back to the tray"); }
  } else if(d.day){
    const it=itemById(d.ref.itemId);
    if(d.ref.kind==="task"){ it.due=d.day; }
    if(d.ref.kind==="step"){ const s=it.steps.find(x=>x.id===d.ref.stepId); s.planDate=d.day; }
    toast(`Planned for ${dateObj(d.day).toLocaleDateString(undefined,{weekday:"long"})}`);
  }
  save(); render();
}
document.addEventListener("pointerup", e=>endDrag(e,false));
document.addEventListener("pointercancel", e=>endDrag(e,true));
/* ---- menus ---- */
function sheet(html){ const el=document.createElement("div"); el.className="scrim"; el.id="scrim"; el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`; $("#app").appendChild(el); }
function chipMenu(ref){
  const info=refTitle(ref); const it=itemById(ref.itemId);
  sheet(`<b style="font-size:18px">${esc(info.title)}</b><span class="small muted" style="margin-top:-6px">${esc(info.sub)} · ${info.minutes} min</span>
  <div class="card" style="padding:0;gap:0;background:var(--bg)">
  ${[["notToday","Not today","Moves to tomorrow"],["noTime","No time needed","Stays a checklist item on Now, off the timeline"],["noAuto",it.noAuto?"Include in auto-planning":"Leave out of auto-planning",it.noAuto?"Fill my day can place it again":"Fill my day skips it"],["open","Open","See its page"]].filter(x=>!(x[0]==="noTime"&&ref.kind!=="task")).map(([k,l,s])=>`<button class="menuitem" data-chipact="${k}" data-ref='${JSON.stringify(ref)}'><b>${l}</b><span>${s}</span></button>`).join("")}</div>`);
}
function blockMenu(ref){
  const info=refTitle(ref); const p=plansFor(itinDate).find(q=>refKey(q.ref)===refKey(ref));
  sheet(`<b style="font-size:18px">${esc(info.title)}</b><span class="small muted" style="margin-top:-6px">${p?timeLabel(p.start)+" · ":""}${info.minutes} min${p&&p.proposed?" · proposed":""}</span>
  <div class="row" style="gap:8px">${itinDate===todayStr()&&ref.kind!=="habit"?`<button class="btn coral" data-blkact="start" data-ref='${JSON.stringify(ref)}' style="flex:1">Start</button>`:""}<button class="btn ghost" data-blkact="open" data-ref='${JSON.stringify(ref)}' style="flex:1">Open</button></div>
  <button class="btn text" data-blkact="remove" data-ref='${JSON.stringify(ref)}'>Remove from the schedule</button><span class="tiny muted" style="text-align:center">To move it, drag the block to a new time.</span>`);
}
function settingsSheet(){
  const m=S.autoPlan||"suggest", fw=S.focusWin||"afternoon", rd=S.restDays||[];
  sheet(`<b style="font-size:20px">Planning settings</b>
  <span class="small" style="font-weight:600">Auto-planning</span>
  ${[["off","Off","You place everything. Fill my day is there when you want it."],["suggest","Suggest each morning","A proposed day waits when you open Itinerary. Nothing moves until you tap Keep."],["auto","Automatic","Items are placed as they come in. You can still drag anything."]].map(([k,l,s])=>`<button class="radio${m===k?" on":""}" role="radio" aria-checked="${m===k}" data-autoplan="${k}"><i></i><span><b>${l}</b><br><em>${s}</em></span></button>`).join("")}
  <span class="small" style="font-weight:600">Your best focus time</span>
  <div class="tags">${[["morning","Morning"],["afternoon","Afternoon"],["evening","Evening"]].map(([k,l])=>`<button class="chipbtn${fw===k?" on":""}" data-focuswin="${k}">${l}</button>`).join("")}</div>
  <span class="small" style="font-weight:600">Rest days</span>
  <div style="display:flex;gap:5px">${DOW.map((l,k)=>`<button class="daybtn${rd.includes(k)?" on":""}" data-restday="${k}" aria-pressed="${rd.includes(k)}" aria-label="${DOWL[k]}">${l}</button>`).join("")}</div>
  <span class="small" style="font-weight:600">Reminders</span>
  <button class="btn ghost" data-notify style="background:var(--surface)">Turn on reminders</button>
  <button class="btn text" data-export style="color:var(--blue)">Export my data</button>
  <span class="tiny muted">Items you add to Now always appear in To place today. Items marked "No time needed" or "Leave out of auto-planning" are never placed for you.</span>`);
}
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if(!b) return; const d=b.dataset;
  if(d.iview){ itinView=d.iview; render(); return; }
  if(d.idate){ itinDate=d.idate; if(d.iv) itinView=d.iv; tlScrolled=null; render(); return; }
  if(d.ishift){ const n=+d.ishift; itinDate = itinView==="day"?shiftDate(itinDate,n):itinView==="week"?shiftDate(itinDate,7*n):todayStr(new Date(dateObj(itinDate).getFullYear(), dateObj(itinDate).getMonth()+n, 1)); tlScrolled=null; render(); return; }
  if("fill" in d){
    if(itinView==="week"){ const ds=dateObj(itinDate); let n=0; for(let k=0;k<7;k++){ const x=new Date(ds); x.setDate(ds.getDate()-ds.getDay()+k); const xs=todayStr(x); if(xs>=todayStr() && !(S.restDays||[]).includes(k)) n+=fillDay(xs,true); } save(); render(); toast(n?`Proposed ${n} placements across the week. Open a day to keep them.`:"Nothing left to place this week."); return; }
    plansFor(itinDate).filter(p=>p.proposed); const n=fillDay(itinDate,true); save(); render(); toast(n?`Proposed ${n} placement${n>1?"s":""}. Keep or drag to adjust.`:"Nothing fits, or nothing left to place."); return; }
  if("keep" in d){ plansFor(itinDate).forEach(p=>p.proposed=false); save(); render(); toast("Kept"); return; }
  if("undoprop" in d){ S.plan[itinDate]=plansFor(itinDate).filter(p=>!p.proposed); save(); render(); toast("Proposal removed"); return; }
  if("isettings" in d){ settingsSheet(); return; }
  if("export" in d){ const sc=$("#scrim"); if(sc) sc.remove(); sheet(`<b style="font-size:20px">Export my data</b><span class="small muted">Copy all of this text, then paste it into the hosted app at /#import.</span><textarea class="notes" id="expTxt" rows="9" readonly style="font-family:monospace;font-size:11px">${esc(JSON.stringify(S))}</textarea><button class="btn coral" data-expsel>Select all</button>`); return; }
  if("expsel" in d){ const t=$("#expTxt"); t.focus(); t.select(); try{ navigator.clipboard && navigator.clipboard.writeText(t.value).then(()=>toast("Copied")); }catch(e){} return; }
  if(d.autoplan){ S.autoPlan=d.autoplan; save(); $("#scrim").remove(); settingsSheet(); return; }
  if(d.focuswin){ S.focusWin=d.focuswin; save(); $("#scrim").remove(); settingsSheet(); return; }
  if(d.restday!==undefined){ const k=+d.restday; S.restDays=S.restDays||[]; S.restDays = S.restDays.includes(k)?S.restDays.filter(x=>x!==k):S.restDays.concat(k); save(); $("#scrim").remove(); settingsSheet(); render(); return; }
  if(d.chipact){ const ref=JSON.parse(d.ref); const it=itemById(ref.itemId); const sc=$("#scrim"); if(sc) sc.remove();
    if(d.chipact==="notToday"){ const tm=shiftDate(itinDate,1); if(ref.kind==="task") it.due=tm; else if(ref.kind==="step"){ it.steps.find(x=>x.id===ref.stepId).planDate=tm; } else { it.habit.skip=it.habit.skip||{}; it.habit.skip[itinDate]=true; } toast("Moved to tomorrow"); }
    if(d.chipact==="noTime"){ it.noTime=true; toast("No time needed. It stays on Now as a checklist item."); }
    if(d.chipact==="noAuto"){ it.noAuto=!it.noAuto; toast(it.noAuto?"Left out of auto-planning":"Included in auto-planning"); }
    if(d.chipact==="open"){ openOv("item", ref.itemId); return; }
    save(); render(); return; }
  if(d.blkact){ const ref=JSON.parse(d.ref); const sc=$("#scrim"); if(sc) sc.remove();
    if(d.blkact==="remove"){ S.plan[itinDate]=plansFor(itinDate).filter(p=>refKey(p.ref)!==refKey(ref)); save(); render(); toast("Removed from the schedule"); }
    if(d.blkact==="open") openOv("item", ref.itemId);
    if(d.blkact==="start") startFocus(ref);
    return; }
});
function afterItinRender(){
  const tl=$("#tl"); if(!tl) return;
  tl.addEventListener("scroll", ()=>{ tlScrollTop = tl.scrollTop; }, {passive:true});
  const key=itinDate+itinView; if(tlScrolled===key){ tl.scrollTop = tlScrollTop; return; } tlScrolled=key;
  const n=new Date(); const h = itinDate===todayStr() ? Math.max(DAY0, n.getHours()-1) : 8;
  tl.scrollTop = (h-DAY0)*HPX; tlScrollTop = tl.scrollTop;
}
