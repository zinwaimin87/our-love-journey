const KEY="our-love-journey-v2";
const blank={profile:{name1:"",name2:"",startDate:""},trips:[],activeTripId:null,memories:[]};

function normalizeData(raw){
  const d=raw&&typeof raw==="object"?raw:{};
  d.profile=d.profile&&typeof d.profile==="object"?d.profile:{};
  d.profile.name1=String(d.profile.name1||"");
  d.profile.name2=String(d.profile.name2||"");
  d.profile.startDate=String(d.profile.startDate||"");
  d.trips=Array.isArray(d.trips)?d.trips:[];
  d.trips=d.trips.map(t=>({
    id:t?.id||uid(),name:String(t?.name||"Untitled Trip"),destination:String(t?.destination||""),
    startDate:String(t?.startDate||""),endDate:String(t?.endDate||""),budget:Number(t?.budget||0),
    stops:Array.isArray(t?.stops)?t.stops.map(s=>({...s,price:Number(s?.price||0),legs:Array.isArray(s?.legs)?s.legs:[]})):[],expenses:Array.isArray(t?.expenses)?t.expenses:[],
    memories:Array.isArray(t?.memories)?t.memories:[],finished:!!t?.finished,
    createdAt:t?.createdAt||new Date().toISOString(),finishedAt:t?.finishedAt||null
  }));
  d.activeTripId=d.trips.some(t=>t.id===d.activeTripId)?d.activeTripId:null;
  d.memories=Array.isArray(d.memories)?d.memories:[];
  d.specialDays=Array.isArray(d.specialDays)?d.specialDays:[];
  return d;
}
function load(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem("our-love-journey-v1");
    const data=normalizeData(raw?JSON.parse(raw):structuredClone(blank));
    localStorage.setItem(KEY,JSON.stringify(data));
    return data;
  }catch(e){console.error("Love Journey data load error",e);return structuredClone(blank)}
}
let db=load();
function save(){db=normalizeData(db);localStorage.setItem(KEY,JSON.stringify(db))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(n){return new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(n)||0)}
function toast(t){const x=document.getElementById("toast");if(!x)return;x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function ageParts(start){if(!start)return null;const a=new Date(start),b=new Date();if(isNaN(a))return null;let years=b.getFullYear()-a.getFullYear(),months=b.getMonth()-a.getMonth(),days=b.getDate()-a.getDate();if(days<0){months--;days+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(months<0){years--;months+=12}return {years,months,days}}
function pageName(){return location.hash.slice(1)||"home"}
function go(p){location.hash=p}
function setup3D(){
 document.querySelectorAll(".card,.timebox,.btn").forEach(el=>{if(el.dataset.tilt)return;el.dataset.tilt="1";el.addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(700px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateZ(2px)`});el.addEventListener("pointerleave",()=>{el.style.transform=""})})
}
function render(){
 const p=pageName(),app=document.getElementById("app");
 if(!app)return;
 document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 try{
   if(p==="home")home(app); else if(p==="anniversary")anniversary(app); else if(p==="calendar")calendar(app); else if(p==="travel")travel(app); else if(p==="memories")memories(app); else if(p==="history")history(app); else settings(app);
   setup3D();
 }catch(e){
   console.error("Love Journey render error",e);
   app.innerHTML=`<section class="card panel" style="margin-top:20px"><div class="eyebrow">OUR LOVE JOURNEY</div><h1>Welcome back ♡</h1><p class="muted">The page recovered from an old saved-data format. Your saved information is being kept safe.</p><button class="btn" onclick="location.hash='home';render()">Open Home</button></section>`;
 }
}
function shellHead(title,sub){return `<div class="page-head"><div class="eyebrow">OUR PRIVATE JOURNEY</div><h1>${title}</h1><div class="muted">${sub}</div></div>`}
function home(a){
 const n1=db.profile.name1||"Your Name",n2=db.profile.name2||"Love";
 const age=ageParts(db.profile.startDate),active=db.trips.find(t=>t.id===db.activeTripId);
 a.innerHTML=`<section class="hero"><div class="card hero-card"><div class="eyebrow">A PRIVATE PLACE FOR TWO</div><h1>${esc(n1)} <span>∞</span> ${esc(n2)}</h1><p>Keep your favorite moments, journeys, routes and little memories in one beautiful place. No login. No Gmail. Just yours.</p>${age?`<div class="countdown"><div class="timebox"><b>${age.years}</b><small>Years</small></div><div class="timebox"><b>${age.months}</b><small>Months</small></div><div class="timebox"><b>${age.days}</b><small>Days</small></div><div class="timebox"><b id="liveHours">0</b><small>Hours</small></div><div class="timebox"><b id="liveMinutes">0</b><small>Minutes</small></div><div class="timebox"><b id="liveSec">0</b><small>Seconds</small></div></div>`:''}<div class="actions"><button class="btn" data-page="anniversary">♡ Anniversary</button><button class="btn secondary" data-page="travel">✈ Start a Journey</button></div></div><div class="card orb"><div class="orb-ring"></div></div></section>
 <div class="section-title"><h2>Your Journey</h2><span class="muted">${db.trips.length} trip(s)</span></div>
 <div class="grid"><div class="card stat"><small>Trips</small><div class="num">${db.trips.length}</div><small>saved journeys</small></div><div class="card stat"><small>Reached</small><div class="num">${db.trips.reduce((s,t)=>s+t.stops.filter(x=>x.reached).length,0)}</div><small>places reached</small></div><div class="card stat"><small>Memories</small><div class="num">${db.trips.reduce((s,t)=>s+(t.memories?.length||0),0)}</div><small>saved memories</small></div><div class="card stat"><small>Travel Spend</small><div class="num">฿${money(db.trips.reduce((s,t)=>s+total(t),0))}</div><small>expenses + route transport</small></div></div>
 ${active?`<div class="section-title"><h2>Continue Traveling</h2></div><div class="card trip-card"><div><span class="badge">Active</span><h3>${esc(active.name)}</h3><p>${active.stops.filter(x=>x.reached).length} / ${active.stops.length} stops reached · ${esc(active.destination||"")}</p></div><button class="btn" data-open-trip="${active.id}">Continue →</button></div>`:''}`;
 if(age){const update=()=>{const s=Math.max(0,Math.floor((Date.now()-new Date(db.profile.startDate+"T00:00:00").getTime())/1000));const hs=Math.floor(s/3600)%24,mi=Math.floor(s/60)%60,se=s%60;const eh=document.getElementById("liveHours"),em=document.getElementById("liveMinutes"),es=document.getElementById("liveSec");if(eh)eh.textContent=hs;if(em)em.textContent=mi;if(es)es.textContent=se};clearInterval(window.__homeTimer);update();window.__homeTimer=setInterval(update,1000)}
}
function nextOccurrence(date){
  if(!date)return null;
  const parts=String(date).split("-").map(Number); if(parts.length!==3)return null;
  const now=new Date(); let d=new Date(now.getFullYear(),parts[1]-1,parts[2]);
  if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d.setFullYear(now.getFullYear()+1);
  return d;
}
function daysUntil(d){
  if(!d)return 0;
  const a=new Date();a.setHours(0,0,0,0);
  const b=new Date(d);b.setHours(0,0,0,0);
  return Math.max(0,Math.ceil((b-a)/86400000));
}
function specialDayCard(x){
  const next=nextOccurrence(x.date);
  return `<article class="special-card card"><div class="special-icon">${x.type==="Birthday"?"🎂":x.type==="Anniversary"?"♡":x.type==="First Trip"?"✈":x.type==="First Date"?"☕":x.type==="First Meet"?"✨":"★"}</div><div class="special-main"><span class="badge">${esc(x.type)}</span><h3>${esc(x.title)}</h3><p>${esc(x.date)}${x.note?" · "+esc(x.note):""}</p></div><div class="special-count"><b>${daysUntil(next)}</b><small>days</small></div><button class="mini-btn danger-text" data-delete-special="${x.id}">Delete</button></article>`;
}
function calendar(a){
 const list=(db.specialDays||[]).slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));
 const upcoming=list.map(x=>({...x,next:nextOccurrence(x.date)})).sort((x,y)=>x.next-y.next);
 const next=upcoming[0];
 a.innerHTML=shellHead("Couple Calendar","Keep the important days of your story in one private timeline.")+
 `<div class="calendar-hero card"><div class="calendar-orb">♡</div><div><div class="eyebrow">SPECIAL DAYS</div><h2>${list.length} saved day${list.length===1?"":"s"}</h2><p class="muted">${next?`Next: <b>${esc(next.title)}</b> · ${daysUntil(next.next)} days`:"Add your first special day."}</p></div><button class="btn" id="addSpecial">+ Add Day</button></div>
 <div class="special-grid">${list.length?list.map(specialDayCard).join(""):`<div class="card empty"><div class="big">♡</div><b>No special days yet</b><p>Add anniversary, birthday, first date or any day you want to remember.</p></div>`}</div>`;
}
function anniversary(a){
 const p=db.profile;
 a.innerHTML=shellHead("Our Anniversary","Set your names and relationship date whenever you're ready.")+`<div class="card panel"><div class="form-grid"><div class="field"><label>First name</label><input id="n1" value="${esc(p.name1)}" placeholder="Enter name"></div><div class="field"><label>Second name</label><input id="n2" value="${esc(p.name2)}" placeholder="Enter name"></div><div class="field"><label>Relationship / Anniversary date</label><input id="date" type="date" value="${esc(p.startDate)}"></div></div><div class="actions"><button class="btn" id="saveProfile">Save</button></div></div>${p.startDate?renderAge(p.startDate):`<div class="card empty"><div class="big">♡</div>Add your anniversary date to start the live counter.</div>`}`;
 document.getElementById("saveProfile").onclick=()=>{db.profile.name1=document.getElementById("n1").value.trim();db.profile.name2=document.getElementById("n2").value.trim();db.profile.startDate=document.getElementById("date").value;save();toast("Anniversary saved");render()}
 if(p.startDate){updateAnniversaryLive(p.startDate);clearInterval(window.__anniversaryTimer);window.__anniversaryTimer=setInterval(()=>updateAnniversaryLive(db.profile.startDate),1000)}
}
function preciseAge(d){
 const start=new Date(d+"T00:00:00"), now=new Date();
 if(isNaN(start)||start>now)return null;
 let years=now.getFullYear()-start.getFullYear();
 let anchor=new Date(start);anchor.setFullYear(start.getFullYear()+years);
 if(anchor>now){years--;anchor=new Date(start);anchor.setFullYear(start.getFullYear()+years)}
 let months=now.getMonth()-anchor.getMonth();
 if(months<0)months+=12;
 let monthAnchor=new Date(anchor);monthAnchor.setMonth(anchor.getMonth()+months);
 if(monthAnchor>now){months--;monthAnchor=new Date(anchor);monthAnchor.setMonth(anchor.getMonth()+months)}
 const diff=now-monthAnchor;
 const days=Math.floor(diff/86400000);
 const hours=Math.floor((diff%86400000)/3600000);
 const minutes=Math.floor((diff%3600000)/60000);
 const seconds=Math.floor((diff%60000)/1000);
 return {years,months,days,hours,minutes,seconds};
}
function updateAnniversaryLive(d){
 const x=preciseAge(d);if(!x)return;
 ["annYears","annMonths","annDays","annHours","annMinutes","annSeconds"].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=[x.years,x.months,x.days,x.hours,x.minutes,x.seconds][i]});
}
function renderAge(d){
 const x=preciseAge(d)||{years:0,months:0,days:0,hours:0,minutes:0,seconds:0};
 return `<div class="card panel"><div class="eyebrow">TOGETHER FOR</div><div class="countdown"><div class="timebox"><b id="annYears">${x.years}</b><small>Years</small></div><div class="timebox"><b id="annMonths">${x.months}</b><small>Months</small></div><div class="timebox"><b id="annDays">${x.days}</b><small>Days</small></div><div class="timebox"><b id="annHours">${x.hours}</b><small>Hours</small></div><div class="timebox"><b id="annMinutes">${x.minutes}</b><small>Minutes</small></div><div class="timebox"><b id="annSeconds">${x.seconds}</b><small>Seconds</small></div></div><p class="muted" style="margin-top:18px">Started on ${new Date(d+"T00:00").toLocaleDateString()}</p></div>`;
}
function travel(a){
 const active=db.trips.find(t=>t.id===db.activeTripId);
 a.innerHTML=shellHead("Traveling","Plan routes, mark places as reached and keep every expense with the trip.")+
 (active?tripDetail(active):`<div class="card panel"><div class="form-grid"><div class="field"><label>Trip name</label><input id="tripName" placeholder="e.g. Weekend Escape"></div><div class="field"><label>Destination</label><input id="dest" placeholder="Where are you going?"></div><div class="field"><label>Start date</label><input id="sd" type="date"></div><div class="field"><label>End date</label><input id="ed" type="date"></div><div class="field"><label>Trip Budget (THB)</label><input id="tripBudget" type="number" min="0" step="0.01" placeholder="e.g. 10000"></div></div><div class="actions"><button class="btn" id="createTrip">Create Trip</button></div></div>${db.trips.filter(t=>!t.finished).length?'<div class="section-title"><h2>Saved Trips</h2></div>'+db.trips.filter(t=>!t.finished).slice().reverse().map(tripMini).join(""):''}`);
}
function tripMini(t){const spent=total(t),budget=Number(t.budget||0),left=budget-spent;return `<div class="card trip-card" style="margin-bottom:12px"><div><span class="badge">${t.finished?"Finished":"Saved"}</span><h3>${esc(t.name)}</h3><p>${esc(t.destination||"")} · ${t.stops.length} stops · ฿${money(spent)}${budget?` / ฿${money(budget)}`:""}</p>${budget?`<div class="budget-mini ${left<0?"over":""}"><span style="width:${Math.min(100,Math.max(0,spent/budget*100))}%"></span></div>`:""}</div><button class="btn secondary" data-open-trip="${t.id}">Open</button></div>`}
function routeTransportTotal(s){return (s.legs||[]).reduce((n,l)=>n+Number(l.price||0),0)}
function routeTransportAll(t){return t.stops.reduce((n,s)=>n+routeTransportTotal(s),0)}
function tripDetail(t){
 return `
<div class="card panel"><div class="trip-card" style="padding:0;background:none;border:0"><div><span class="badge">${t.finished?"Finished":"Active"}</span><h2 style="margin:10px 0 5px">${esc(t.name)}</h2><p>${esc(t.destination||"")} · ${t.startDate||""} ${t.endDate?"→ "+t.endDate:""}</p></div><div class="actions"><button class="btn secondary" id="backTrips">← Back</button>${!t.finished?`<button class="btn secondary" id="editTrip" type="button">Edit Trip</button><button class="btn danger" id="deleteTrip" type="button" data-delete-trip="${t.id}">Delete</button><button class="btn gold" id="finishTrip">Finish Traveling</button>`:''}</div></div>
 <div class="budget-card card"><div><small>TRIP BUDGET</small><strong>฿${money(t.budget||0)}</strong></div><div><small>SPENT</small><strong>฿${money(total(t))}</strong></div><div class="${Number(t.budget||0)-total(t)<0?"budget-over":""}"><small>${Number(t.budget||0)-total(t)<0?"OVER BUDGET":"REMAINING"}</small><strong>฿${money((Number(t.budget||0)-total(t)))}</strong></div></div>
 <div class="section-title"><h2>Route</h2><button class="btn secondary" id="addStop">+ Add Stop</button></div><div class="timeline">${t.stops.length?t.stops.map((s,i)=>`<div class="stop route-stop ${s.reached?"reached":""}"><div class="stop-dot"></div><div><div class="stop-top"><span class="stop-number">${i+1}</span><h4>${esc(s.name)}</h4><div class="stop-tools"><button class="mini-btn" data-move-stop="${s.id}" data-direction="up" ${i===0?"disabled":""}>↑</button><button class="mini-btn" data-move-stop="${s.id}" data-direction="down" ${i===t.stops.length-1?"disabled":""}>↓</button><button class="mini-btn" data-edit-stop="${s.id}">Edit</button><button class="mini-btn danger-text" data-delete-stop="${s.id}">Delete</button></div></div><small>${s.date||"No planned date"} ${s.time||""}${s.reached?" · Reached "+new Date(s.reachedAt).toLocaleString():""}</small>${s.note?`<p class="muted">${esc(s.note)}</p>`:''}${Number(s.price||0)?`<div class="stop-price">Place / Stop Price: <strong>฿${money(s.price)}</strong></div>`:""}<div class="route-legs">${(s.legs||[]).length?(s.legs||[]).map((l,j)=>`<div class="route-leg"><span class="leg-index">${j+1}</span><div class="leg-main"><b>${esc(l.from)} → ${esc(l.to)}</b><small> ${esc(l.vehicle||"Transport")} ${l.note?"· "+esc(l.note):""}</small></div><strong>฿${money(l.price)}</strong><button class="mini-btn danger-text" data-delete-leg="${s.id}" data-leg-id="${l.id}">×</button></div>`).join(""):`<div class="leg-empty">No transport steps yet</div>`}<div class="route-leg-actions"><button class="mini-btn route-add" data-add-leg="${s.id}">＋ Add transport step</button>${routeTransportTotal(s)?`<span class="route-total">Transport ฿${money(routeTransportTotal(s))}</span>`:""}</div></div></div><div>${!t.finished&&!s.reached?`<button class="btn secondary" data-reach="${s.id}">Reached</button>`:''}</div></div>`).join(""):`<div class="empty">No route stops yet. Add your first place.</div>`}</div>
 <div class="section-title"><h2>Expenses</h2><button class="btn secondary" id="addExpense">+ Add Expense</button></div><div class="split"><div class="card panel"><div class="muted">Trip Total</div><div class="total">฿${money(total(t))}</div></div><div class="card panel"><div class="muted">Categories</div><p class="muted" style="line-height:1.8">${categorySummary(t)}</p></div></div><div class="expense-list">${t.expenses.length?t.expenses.map(e=>`<div class="expense"><div><b>${esc(e.category)}</b><small>${e.date||""} · ${esc(e.note||"")}</small></div><strong>฿${money(e.amount)}</strong></div>`).join(""):`<div class="empty">No expenses recorded yet.</div>`}</div></div>`}
function total(t){return t.expenses.reduce((s,e)=>s+Number(e.amount||0),0)+t.stops.reduce((s,x)=>s+Number(x.price||0),0)+routeTransportAll(t)}
function categorySummary(t){const m={};t.expenses.forEach(e=>m[e.category]=(m[e.category]||0)+Number(e.amount||0));const route=routeTransportAll(t);if(route)m["Route Transport"]=(m["Route Transport"]||0)+route;return Object.keys(m).length?Object.entries(m).map(([k,v])=>`${esc(k)}: ฿${money(v)}`).join(" · "):"No expenses yet"}
function memories(a){
 const items=(db.memories||[]).slice().sort((x,y)=>new Date(y.date||0)-new Date(x.date||0));
 a.innerHTML=shellHead("Memories","Keep your favorite photos and little moments in one private album.")+`
 <div class="memory-hero card"><div class="memory-orb">✦</div><div><div class="eyebrow">OUR LITTLE MOMENTS</div><h2>${items.length} memories</h2><p class="muted">Photos are compressed and stored only in this browser.</p></div><button class="btn" id="addGlobalMemory">+ Add Photo</button></div>
 <div class="memory-toolbar"><div class="memory-filter active" data-memory-filter="all">All <b>${items.length}</b></div><div class="memory-filter" data-memory-filter="favorite">Favorites <b>${items.filter(x=>x.favorite).length}</b></div></div>
 <div id="memoryGrid" class="global-memory-grid">${items.length?items.map(memoryCard).join(""):`<div class="card empty"><div class="big">📸</div><b>No memories yet</b><p>Add your first photo and make this album yours.</p></div>`}</div>`;
 document.getElementById("addGlobalMemory")?.addEventListener("click",()=>chooseGlobalMemory());
}
function memoryCard(m){
 return `<article class="memory-card card" data-favorite-card="${m.favorite?"1":"0"}"><div class="memory-image"><img src="${m.data}" alt="${esc(m.caption||"Memory")}"><button class="memory-star ${m.favorite?"on":""}" data-memory-favorite="${m.id}">${m.favorite?"★":"☆"}</button></div><div class="memory-info"><b>${esc(m.caption||"Beautiful moment")}</b><small>${m.date?new Date(m.date+"T00:00:00").toLocaleDateString():"No date"} ${m.location?"· "+esc(m.location):""}</small><button class="mini-btn danger-text" data-delete-memory="${m.id}">Delete</button></div></article>`
}
async function chooseGlobalMemory(){
 const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;
 input.onchange=async()=>{const files=[...input.files];if(!files.length)return;let saved=0;
 for(const f of files){try{const data=await resizeImage(f,1400);const caption=prompt("Memory caption (optional)",f.name.replace(/\\.[^/.]+$/,""));const date=prompt("Memory date (YYYY-MM-DD)",today());db.memories.push({id:uid(),data,caption:caption||"",date:date||today(),favorite:false,createdAt:new Date().toISOString()});saved++}catch{}}
 save();toast(saved+" photo"+(saved===1?"":"s")+" saved");render()};input.click()
}
function history(a){
 const done=db.trips.filter(t=>t.finished);
 a.innerHTML=shellHead("Finished Journeys","Your completed trips stay here with routes, timestamps and expenses.")+(done.length?done.slice().reverse().map(tripMini).join(""):`<div class="card empty"><div class="big">◷</div>No finished journeys yet.</div>`);
}
function settings(a){
 const p=db.profile;
 a.innerHTML=shellHead("Settings","Private, simple and stored on this device.")+`<div class="card panel"><h2>Couple Profile</h2><div class="form-grid"><div class="field"><label>First name</label><input id="sn1" value="${esc(p.name1)}"></div><div class="field"><label>Second name</label><input id="sn2" value="${esc(p.name2)}"></div><div class="field"><label>Anniversary date</label><input id="sd2" type="date" value="${esc(p.startDate)}"></div></div><div class="actions"><button class="btn" id="saveSet">Save Changes</button></div></div>
 <div class="card panel"><h2>Data</h2><p class="muted">Your data is stored in this browser using local storage. No Gmail, account or server connection is required.</p><div class="actions"><button class="btn secondary" id="export">Export Backup</button><label class="btn secondary" style="display:inline-flex;align-items:center"><input id="import" type="file" accept=".json" hidden>Import Backup</label><button class="btn danger" id="clear">Clear All Data</button></div></div>`;
 document.getElementById("saveSet").onclick=()=>{db.profile.name1=document.getElementById("sn1").value.trim();db.profile.name2=document.getElementById("sn2").value.trim();db.profile.startDate=document.getElementById("sd2").value;save();toast("Settings saved")}
 document.getElementById("export").onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="our-love-journey-backup.json";a.click();URL.revokeObjectURL(u)}
 document.getElementById("import").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);save();toast("Backup imported");render()}catch{toast("Invalid backup")}};r.readAsText(f)}
 document.getElementById("clear").onclick=()=>{if(confirm("Clear all Love Journey data from this device?")){db=structuredClone(blank);save();render();toast("All data cleared")}}
}
function today(){return new Date().toISOString().slice(0,10)}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function resizeImage(file,max){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.78))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
function openFormModal(title,fields,onSave){document.getElementById("formModal")?.remove();const m=document.createElement("div");m.id="formModal";m.className="modal-backdrop";m.innerHTML=`<div class="modal-card"><button class="modal-close" id="modalClose">×</button><div class="eyebrow">QUICK ENTRY</div><h2>${title}</h2><div class="modal-fields">${fields.map(f=>f.type==="select"?`<div class="field"><label>${f.label}</label><select id="mf_${f.id}">${f.options.map(o=>`<option>${o}</option>`).join("")}</select></div>`:`<div class="field"><label>${f.label}</label><input id="mf_${f.id}" type="${f.type}" value="${esc(f.value||"")}" placeholder="${esc(f.placeholder||"")}"></div>`).join("")}</div><div class="actions"><button class="btn" id="modalSave">Save</button><button class="btn secondary" id="modalCancel">Cancel</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector("#modalClose").onclick=close;m.querySelector("#modalCancel").onclick=close;m.querySelector("#modalSave").onclick=()=>{const vals={};fields.forEach(f=>vals[f.id]=document.getElementById("mf_"+f.id).value);onSave(vals);if(document.body.contains(m))m.remove()}}
document.addEventListener("click",e=>{
 const mf=e.target.closest("[data-memory-filter]");if(mf){document.querySelectorAll("[data-memory-filter]").forEach(x=>x.classList.remove("active"));mf.classList.add("active");const type=mf.dataset.memoryFilter;document.querySelectorAll("[data-favorite-card]").forEach(x=>x.style.display=(type==="favorite"&&x.dataset.favoriteCard!=="1")?"none":"");return}
 const fav=e.target.closest("[data-memory-favorite]");if(fav){const m=db.memories.find(x=>x.id===fav.dataset.memoryFavorite);if(m){m.favorite=!m.favorite;save();render()};return}
 const delm=e.target.closest("[data-delete-memory]");if(delm){if(confirm("Delete this memory photo?")){const id=delm.dataset.deleteMemory;if(id){db.memories=db.memories.filter(x=>String(x.id)!==String(id));save();render();toast("Memory deleted")}}return}

 const delSpecial=e.target.closest("[data-delete-special]");
 if(delSpecial){if(confirm("Delete this special day?")){db.specialDays=db.specialDays.filter(x=>x.id!==delSpecial.dataset.deleteSpecial);save();render();toast("Special day deleted")}return}
 if(e.target.id==="addSpecial"){openFormModal("Add Special Day",[
  {id:"title",label:"Title",type:"text",placeholder:"e.g. Our First Date"},
  {id:"type",label:"Type",type:"select",options:["Anniversary","Birthday","First Meet","First Date","First Trip","Custom"]},
  {id:"date",label:"Date",type:"date",value:today()},
  {id:"note",label:"Note",type:"text",placeholder:"Optional note"}
 ],vals=>{if(!vals.title.trim())return toast("Title is required");db.specialDays.push({id:uid(),title:vals.title.trim(),type:vals.type,date:vals.date,note:vals.note.trim(),createdAt:new Date().toISOString()});save();render();toast("Special day saved")});return}

 const pg=e.target.closest("[data-page]");if(pg){go(pg.dataset.page);return}
 const open=e.target.closest("[data-open-trip]");if(open){db.activeTripId=open.dataset.openTrip;save();go("travel");return}
 const delLeg=e.target.closest("[data-delete-leg]");
 if(delLeg){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>x.id===delLeg.dataset.deleteLeg);if(s){s.legs=(s.legs||[]).filter(l=>String(l.id)!==String(delLeg.dataset.legId));save();render();toast("Transport step deleted")}return}
 const delStop=e.target.closest("[data-delete-stop]");
 if(delStop){const t=db.trips.find(x=>x.id===db.activeTripId);if(t&&confirm("Delete this route stop and all its transport steps?")){t.stops=t.stops.filter(s=>String(s.id)!==String(delStop.dataset.deleteStop));save();render();toast("Route stop deleted")}return}
 const editStop=e.target.closest("[data-edit-stop]");
 if(editStop){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>String(x.id)===String(editStop.dataset.editStop));if(!s)return;
 openFormModal("Edit Route Stop",[
  {id:"stopName",label:"Place / stop name",type:"text",value:s.name},
  {id:"stopDate",label:"Planned date",type:"date",value:s.date||""},
  {id:"stopTime",label:"Planned time",type:"time",value:s.time||""},
  {id:"stopNote",label:"Note",type:"text",value:s.note||"",placeholder:"Optional note"},
  {id:"stopPrice",label:"Place / Stop Price (THB)",type:"number",value:String(s.price||0),placeholder:"e.g. 50"}
 ],vals=>{if(!vals.stopName.trim())return toast("Place name is required");const price=Number(vals.stopPrice);if(price<0||Number.isNaN(price))return toast("Enter a valid price");s.name=vals.stopName.trim();s.date=vals.stopDate;s.time=vals.stopTime;s.note=vals.stopNote.trim();s.price=price;save();render();toast("Route stop updated")});return}
 const moveStop=e.target.closest("[data-move-stop]");
 if(moveStop){
  const t=db.trips.find(x=>x.id===db.activeTripId);if(!t)return;
  const idx=t.stops.findIndex(s=>String(s.id)===String(moveStop.dataset.moveStop));
  const dir=moveStop.dataset.direction==="up"?-1:1;
  const ni=idx+dir;
  if(idx<0||ni<0||ni>=t.stops.length)return;
  [t.stops[idx],t.stops[ni]]=[t.stops[ni],t.stops[idx]];
  save();render();return
 }
 const addLeg=e.target.closest("[data-add-leg]");
 if(addLeg){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>x.id===addLeg.dataset.addLeg);if(!s)return;
 openFormModal("Add Transport Step",[
  {id:"from",label:"From",type:"text",placeholder:"e.g. Pattaya Bus Station"},
  {id:"to",label:"To",type:"text",placeholder:"e.g. Bangkok Bus Station"},
  {id:"vehicle",label:"Transport",type:"select",options:["Bus","Minivan","Taxi","Grab","Motorbike Taxi","Train","BTS","MRT","Boat","Flight","Walk","Other"]},
  {id:"price",label:"Price (THB)",type:"number",placeholder:"e.g. 160"},
  {id:"note",label:"Note",type:"text",placeholder:"Optional"}
 ],vals=>{const price=Number(vals.price);if(!vals.from.trim()||!vals.to.trim())return toast("Enter From and To");if(price<0)return toast("Enter a valid price");s.legs=s.legs||[];s.legs.push({id:uid(),from:vals.from.trim(),to:vals.to.trim(),vehicle:vals.vehicle,price,note:vals.note.trim(),createdAt:new Date().toISOString()});save();render();toast("Transport step saved")});return}
 const reach=e.target.closest("[data-reach]");if(reach){const t=db.trips.find(x=>x.id===db.activeTripId),s=t.stops.find(x=>x.id===reach.dataset.reach);s.reached=true;s.reachedAt=new Date().toISOString();save();render();toast("Route reached and saved");return}
 if(e.target.id==="createTrip"){const n=document.getElementById("tripName").value.trim();if(!n)return toast("Enter a trip name");const t={id:crypto.randomUUID(),name:n,destination:document.getElementById("dest").value.trim(),startDate:document.getElementById("sd").value,endDate:document.getElementById("ed").value,budget:Math.max(0,Number(document.getElementById("tripBudget")?.value||0)),stops:[],expenses:[],memories:[],finished:false,createdAt:new Date().toISOString()};db.trips.push(t);db.activeTripId=t.id;save();render();toast("Trip created")}
 if(e.target.id==="backTrips"){db.activeTripId=null;save();render();return}
 if(e.target.id==="editTrip"){
  const t=db.trips.find(x=>x.id===db.activeTripId);if(!t)return;
  openFormModal("Edit Trip",[
   {id:"tripName",label:"Trip name",type:"text",value:t.name},
   {id:"dest",label:"Destination",type:"text",value:t.destination||""},
   {id:"sd",label:"Start date",type:"date",value:t.startDate||""},
   {id:"ed",label:"End date",type:"date",value:t.endDate||""},
   {id:"budget",label:"Trip Budget (THB)",type:"number",value:String(t.budget||0)}
  ],vals=>{
   if(!vals.tripName.trim())return toast("Enter a trip name");
   const budget=Number(vals.budget);if(budget<0||Number.isNaN(budget))return toast("Enter a valid budget");
   t.name=vals.tripName.trim();t.destination=vals.dest.trim();t.startDate=vals.sd;t.endDate=vals.ed;t.budget=budget;
   save();render();toast("Trip updated")
  });return
 }
 const deleteTripBtn=e.target.closest("[data-delete-trip]");
 if(deleteTripBtn){
  const tripId=deleteTripBtn.dataset.deleteTrip;
  const t=db.trips.find(x=>String(x.id)===String(tripId));
  if(!t)return;
  if(confirm("Delete this trip and all its routes, transport steps, expenses and memories?")){
   db.trips=db.trips.filter(x=>String(x.id)!==String(tripId));
   if(db.activeTripId===t.id)db.activeTripId=null;
   save();render();toast("Trip deleted");
  }
  return
 }
 if(e.target.id==="addStop"){openFormModal("Add Route Stop",[{id:"stopName",label:"Place / stop name",type:"text",placeholder:"e.g. Terminal 21"},{id:"stopDate",label:"Planned date",type:"date",value:""},{id:"stopTime",label:"Planned time",type:"time",value:""},{id:"stopNote",label:"Note",type:"text",placeholder:"Optional note"},{id:"stopPrice",label:"Place / Stop Price (THB)",type:"number",placeholder:"e.g. 50"}],vals=>{const t=db.trips.find(x=>x.id===db.activeTripId);if(!vals.stopName.trim())return toast("Place name is required");const price=Number(vals.stopPrice||0);if(price<0||Number.isNaN(price))return toast("Enter a valid price");t.stops.push({id:crypto.randomUUID(),name:vals.stopName.trim(),date:vals.stopDate,time:vals.stopTime,note:vals.stopNote.trim(),price,reached:false,legs:[]});save();render();toast("Route stop added")})}
 if(e.target.id==="addExpense"){openFormModal("Add Expense",[{id:"category",label:"Category",type:"select",options:["Transportation","Fuel","Food","Hotel","Tickets","Souvenir / Shopping","Other"]},{id:"amount",label:"Amount (THB)",type:"number",placeholder:"0"},{id:"date",label:"Date",type:"date",value:new Date().toISOString().slice(0,10)},{id:"note",label:"Note",type:"text",placeholder:"e.g. Lunch"}],vals=>{const t=db.trips.find(x=>x.id===db.activeTripId),amount=Number(vals.amount);if(!amount||amount<0)return toast("Enter a valid amount");t.expenses.push({id:crypto.randomUUID(),category:vals.category,amount,date:vals.date,note:vals.note.trim()});save();render();toast("Expense saved")})}
 if(e.target.id==="finishTrip"){const t=db.trips.find(x=>x.id===db.activeTripId);if(confirm("Finish this journey and archive it?")){t.finished=true;t.finishedAt=new Date().toISOString();db.activeTripId=null;save();go("history");toast("Journey archived")}}
});
window.addEventListener("hashchange",render);render();
