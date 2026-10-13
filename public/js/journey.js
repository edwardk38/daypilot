/* ---------------- Journey ---------------- */
function viewJourney(){
  const seg = `<div class="seg"><button data-jv="map" aria-pressed="${journeyView==="map"}">Map</button><button data-jv="pass" aria-pressed="${journeyView==="pass"}">Passport</button></div>`;
  const head = `<div class="pad" style="padding-top:20px;padding-bottom:10px"><div class="row" style="justify-content:space-between"><h1>Journey</h1><div style="display:flex;flex-direction:column;align-items:flex-end"><b>${S.miles} mi</b><span class="tiny muted">ready to spend</span></div></div>${seg}</div>`;
  if(journeyView==="pass") return head + viewPassport();
  const deps = Object.keys(PLACES).filter(c=>!S.visited.includes(c)).map(c=>({c,...costTo(c)})).sort((a,b)=>a.mi-b.mi);
  return head + `<div class="mapwrap" id="mapwrap"><svg id="map" role="img" aria-label="Map of Central America and the Caribbean. Tap a country."></svg>
    <span class="maplabel">You're in ${esc(PLACES[S.location].name)}</span>
    <div class="zoom"><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="out" aria-label="Zoom out">−</button></div></div>
    <div class="sheetish"><div class="row" style="justify-content:space-between;margin-bottom:4px"><h2>Departures</h2><span class="tiny muted">closest first</span></div>
    ${deps.length?deps.map(d=>{const p=PLACES[d.c]; const ok=d.mi<=S.miles; return `<button class="dep" data-place="${d.c}"><span class="flag">${S.visited.includes(d.c)?p.flag:"🏳️"}</span><span class="grow"><span style="font-weight:600">${esc(p.name)} ${p.gem?'<span class="chip due" style="margin-left:4px">Hidden gem</span>':""}</span><span class="tiny muted">${esc(p.region)} · ${d.km.toLocaleString()} km away</span></span><span class="r"><b class="small">${d.mi} mi</b>${ok?'<span class="ready">Ready to fly</span>':`<span class="tiny muted">${d.mi-S.miles} more</span>`}</span></button>`}).join(""):'<p class="muted">You have visited every stop in this region. More continents come later.</p>'}
    </div>`;
}
function viewPassport(){
  const cs = Object.keys(PLACES);
  const cells = cs.map((c,i)=>{
    const st = S.stamps.find(s=>s.code===c);
    if(!st) return `<div class="stamp empty"><div class="o" style="--r:0deg"><div class="i"><span class="f" style="opacity:.5">?</span><span class="n">${esc(PLACES[c].name)}</span></div></div></div>`;
    const col = INK_COLORS[i%INK_COLORS.length], rot = ((i*37)%24)-12;
    return `<button class="stamp" data-place="${c}" style="border:none;background:none" aria-label="${esc(PLACES[c].name)} stamp"><div class="o" style="--c:${col};--r:${rot}deg"><div class="i"><span class="f">${PLACES[c].flag}</span><span class="n">${esc(PLACES[c].name)}</span></div></div></button>`;
  }).join("");
  return `<div class="pad" style="padding-top:0">
    <div class="row" style="gap:8px">
      <div class="card" style="flex:1;align-items:center;padding:10px;gap:0"><b style="font-size:18px">${S.visited.length} / 195</b><span class="tiny muted">countries</span></div>
      <div class="card" style="flex:1;align-items:center;padding:10px;gap:0"><b style="font-size:18px">${(S.hoursMin/60).toFixed(1)}</b><span class="tiny muted">hours focused</span></div>
      <div class="card" style="flex:1;align-items:center;padding:10px;gap:0"><b style="font-size:18px">${S.earned.toLocaleString()}</b><span class="tiny muted">miles earned</span></div>
    </div>
    <div class="card"><div class="row" style="justify-content:space-between"><h2>North America</h2><span class="small muted">${S.visited.length} of 23</span></div><div class="stampgrid">${cells}</div>
    <span class="tiny muted">v0.1 covers Central America and the Caribbean. Tap a stamp to reread its page.</span></div></div>`;
}
/* map: pan + zoom with viewBox */
let VB = null;
function initMap(){
  const svg = $("#map"); if(!svg) return;
  const ocean = getComputedStyle(document.documentElement).getPropertyValue("--ocean");
  let html = `<rect x="-300" y="-300" width="1100" height="900" fill="var(--ocean)"/>`;
  for(const [k,v] of Object.entries(MAP)){
    if(typeof v!=="string") continue;
    const code = PATH_CODES.includes(k) ? k : null;
    const visited = code && S.visited.includes(code);
    const here = code===S.location;
    const can = code && !visited && costTo(code).mi<=S.miles;
    const fill = visited ? "var(--blue)" : can ? "var(--reach)" : "var(--land)";
    const stroke = can ? "var(--coral)" : "var(--surface)";
    html += `<path d="${v}" fill="${fill}" stroke="${stroke}" stroke-width="${can?1.4:0.8}" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${code?`data-place="${code}" tabindex="0" role="button" aria-label="${esc(PLACES[code].name)}"`:""}/>`;
  }
  for(const [k,v] of Object.entries(MAP)){
    if(!k.startsWith("dot_")) continue;
    const code = Object.keys(DOT_CODES).find(c=>DOT_CODES[c]===k);
    if(code){
      const visited = S.visited.includes(code);
      html += `<circle class="isl" cx="${v[0]}" cy="${v[1]}" r="9" fill="transparent" data-place="${code}" aria-label="${esc(PLACES[code].name)}"/><circle cx="${v[0]}" cy="${v[1]}" r="3.4" fill="${visited?"var(--blue)":"var(--gem)"}" stroke="var(--surface)" stroke-width="1" pointer-events="none"/>`;
    } else html += `<circle cx="${v[0]}" cy="${v[1]}" r="2.4" fill="var(--land)" pointer-events="none"/>`;
  }
  const P = PLACES[S.location]; const hx = (P.lon+100)*10, hy = (26-P.lat)*10;
  html += `<circle cx="${hx}" cy="${hy}" r="9" fill="var(--coral)" opacity=".25" pointer-events="none"/><circle cx="${hx}" cy="${hy}" r="4.5" fill="var(--coral)" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`;
  svg.innerHTML = html;
  if(!VB){ VB = {x:hx-130, y:hy-90, w:260, h:170}; }
  applyVB();
  // pan
  const pts = new Map(); let last=null, pinch0=null, moved=0;
  svg.onpointerdown = e => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); moved=0; if(pts.size===2){ const [a,b]=[...pts.values()]; pinch0={d:Math.hypot(a.x-b.x,a.y-b.y), w:VB.w, h:VB.h}; } last={x:e.clientX,y:e.clientY}; };
  svg.onpointermove = e => {
    if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r = svg.getBoundingClientRect();
    if(pts.size===2 && pinch0){ const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); zoomTo(pinch0.w*pinch0.d/d); moved+=10; return; }
    const k = VB.w / r.width; VB.x -= (e.clientX-last.x)*k; VB.y -= (e.clientY-last.y)*k; moved += Math.abs(e.clientX-last.x)+Math.abs(e.clientY-last.y); last={x:e.clientX,y:e.clientY}; applyVB();
  };
  const up = e => { pts.delete(e.pointerId); if(pts.size<2) pinch0=null; if(pts.size===1){ last={...[...pts.values()][0]}; } };
  svg.onpointerup = e => { up(e); if(moved<6){ const hit = document.elementFromPoint(e.clientX, e.clientY); const t = hit && hit.closest ? hit.closest("[data-place]") : null; if(t) openPlace(t.dataset.place); } };
  svg.onpointercancel = up;
  svg.onwheel = e => { e.preventDefault(); zoomTo(VB.w * (e.deltaY>0?1.15:0.87)); };
  svg.onkeydown = e => { const t = e.target.closest("[data-place]"); if(t && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); openPlace(t.dataset.place); } };
}
function zoomTo(w){ w = Math.min(520, Math.max(70, w)); const cx = VB.x+VB.w/2, cy = VB.y+VB.h/2; const ratio = VB.h/VB.w; VB.w=w; VB.h=w*ratio; VB.x=cx-w/2; VB.y=cy-VB.h/2; applyVB(); }
function applyVB(){ const svg=$("#map"); if(!svg) return; const r = svg.getBoundingClientRect(); if(r.width){ VB.h = VB.w * (r.height/r.width); } svg.setAttribute("viewBox", `${VB.x} ${VB.y} ${VB.w} ${VB.h}`); }

/* ---------------- Place pages ---------------- */
function openPlace(code){
  const p = PLACES[code]; const visited = S.visited.includes(code);
  if(visited){ showArrival(code, false); return; }
  const c = costTo(code); const ok = c.mi<=S.miles;
  overlay = "sheet";
  const el = document.createElement("div"); el.className="scrim"; el.id="scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(p.name)}"><div class="grab"></div>
    <div class="row"><span style="width:44px;height:30px;border-radius:5px;background:var(--line);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--muted)" aria-label="Flag hidden until you arrive">?</span><div style="flex:1"><h2>${esc(p.name)}</h2><span class="tiny muted">${esc(p.region)} · not visited yet${p.gem?" · hidden gem":""}</span></div><button class="iconbtn" data-close aria-label="Close">${ico("close")}</button></div>
    <div class="row" style="gap:8px"><div class="fact" style="flex:1"><span class="tiny muted">Flight from ${esc(PLACES[S.location].name)}</span><br><b>${c.mi} mi</b> <span class="tiny muted">(${c.km.toLocaleString()} km)</span></div><div class="fact" style="flex:1"><span class="tiny muted">You have ${S.miles}</span><br><b style="color:${ok?"var(--green)":"var(--coral)"}">${ok?"Enough to fly":(c.mi-S.miles)+" more"}</b></div></div>
    <div class="fact" style="background:var(--coral-soft)"><span class="label">A taste of what's waiting</span><br>${esc(p.facts[0])}</div>
    <div class="tags">${["Flag","Capital","2 more facts","Stamp"].map(x=>`<span class="chip">${ico("lock",12)}&nbsp;${x}</span>`).join("")}</div>
    <button class="btn coral" data-fly="${code}" ${ok?"":"disabled"}>${ok?`Fly to ${esc(p.name)} · ${c.mi} mi`:`Earn ${c.mi-S.miles} more miles to fly`}</button>
  </div>`;
  $("#app").appendChild(el);
}
function closeOverlay(){ const s=$("#scrim"); if(s) s.remove(); const o=$("#ov"); if(o) o.remove(); overlay=null; render(); }
function fly(code){
  const c = costTo(code); if(c.mi>S.miles) return;
  S.miles -= c.mi; S.location = code; if(!S.visited.includes(code)) S.visited.push(code);
  S.stamps.push({code, date: todayStr()}); VB = null; save();
  const s=$("#scrim"); if(s) s.remove();
  showArrival(code, true);
}
function showArrival(code, fresh){
  const p = PLACES[code]; const idx = Object.keys(PLACES).indexOf(code);
  const col = INK_COLORS[idx%INK_COLORS.length];
  const st = S.stamps.find(s=>s.code===code);
  const el = document.createElement("div"); el.className="overlay arrival"; el.id="ov"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label",p.name);
  el.innerHTML = `<div class="art"><div class="hero" style="position:absolute;inset:0;height:auto"><div class="sun" style="top:40px"></div><div class="m1" style="height:120px;bottom:30px"></div><div class="m2" style="height:90px;bottom:30px"></div><div class="w" style="height:30px"></div></div>
    <button class="iconbtn" data-close aria-label="Close" style="position:absolute;right:12px;top:12px;background:var(--surface)">${ico("close")}</button>
    <div style="position:absolute;right:22px;bottom:-40px;--c:${col};--r:-12deg" class="stamp ${fresh?"slam":""}"><div class="o" style="--c:${col};--r:-12deg;background:var(--surface)"><div class="i"><span class="n" style="letter-spacing:.06em">${esc(p.name.toUpperCase())}</span><span class="f">${p.flag}</span><span class="n" style="font-weight:600">${st?new Date(st.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):""}</span></div></div></div></div>
    <div class="pad" style="padding-top:8px">
      <div style="padding-right:110px"><span class="label">${fresh?"You made it":"Your stamp"} · country ${S.visited.indexOf(code)+1} of 195</span><h1 style="margin-top:4px">${fresh?"Welcome to ":""}${esc(p.name)}</h1></div>
      <div class="row" style="gap:8px"><div class="fact" style="flex:1"><span class="tiny muted">Capital</span><br><b>${esc(p.cap)}</b></div><div class="fact" style="flex:1"><span class="tiny muted">Region</span><br><b>${esc(p.region)}</b></div></div>
      <h2>Did you know?</h2>
      ${p.facts.map(f=>`<div class="fact">${esc(f)}</div>`).join("")}
      ${!fresh && code!==S.location ? `<button class="btn ink" data-flyback="${code}" ${returnFare(code)>S.miles?"disabled":""}>Fly back here · ${returnFare(code)} mi${returnFare(code)>S.miles?` (${returnFare(code)-S.miles} more needed)`:""}</button><span class="tiny muted" style="margin-top:-6px">Return trips cost half, since you've been here before.</span>` : (code===S.location && !fresh ? `<span class="small muted">You're here now.</span>` : "")}
      <a class="btn ghost" href="https://en.wikipedia.org/wiki/${encodeURIComponent(p.name.replace(/ /g,"_"))}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:var(--ink)">Learn more on Wikipedia ↗</a>
      <button class="btn coral" data-close>${fresh?"Add stamp to passport":"Back"}</button>
    </div>`;
  $("#app").appendChild(el);
  if(fresh) toast(`New stamp: ${p.name}`);
}
