const KEY="our-love-journey-v2";
const blank={profile:{name1:"",name2:"",startDate:""},trips:[],activeTripId:null,memories:[],specialDays:[]};

function normalizeData(raw){
  const d=raw&&typeof raw==="object"?raw:{};
  d.profile=d.profile&&typeof d.profile==="object"?d.profile:{};
  d.profile.name1=String(d.profile.name1||"").slice(0,120);
  d.profile.name2=String(d.profile.name2||"").slice(0,120);
  d.profile.startDate=/^\d{4}-\d{2}-\d{2}$/.test(String(d.profile.startDate||""))?String(d.profile.startDate):"";
  d.trips=Array.isArray(d.trips)?d.trips:[];
  d.trips=d.trips.map(t=>{
    const stops=Array.isArray(t?.stops)?t.stops.map(s=>({
      ...s,id:s?.id||uid(),name:String(s?.name||"Untitled Stop").slice(0,180),
      price:Number.isFinite(Number(s?.price))?Math.max(0,Number(s.price)):0,
      transportMode:String(s?.transportMode||""),completed:!!s?.completed,completedAt:s?.completedAt||null,
      lat:Number.isFinite(Number(s?.lat))?Number(s.lat):null,lng:Number.isFinite(Number(s?.lng))?Number(s.lng):null,
      reached:!!s?.reached,reachedAt:s?.reachedAt||null,
      legs:Array.isArray(s?.legs)?s.legs.map(l=>({...l,id:l?.id||uid(),from:String(l?.from||""),to:String(l?.to||""),vehicle:String(l?.vehicle||"Other"),price:Number.isFinite(Number(l?.price))?Math.max(0,Number(l.price)):0,note:String(l?.note||"").slice(0,500)})):[],
      memories:Array.isArray(s?.memories)?s.memories:[]
    })):[];

    const expenses=Array.isArray(t?.expenses)?t.expenses.map(e=>({
      ...e,id:e?.id||uid(),category:String(e?.category||"Other"),
      amount:Number.isFinite(Number(e?.amount))?Math.max(0,Number(e.amount)):0,
      date:/^\d{4}-\d{2}-\d{2}$/.test(String(e?.date||""))?String(e.date):"",
      note:String(e?.note||"").slice(0,500)
    })):[];
    return {
      id:t?.id||uid(),name:String(t?.name||"Untitled Trip").slice(0,180),destination:String(t?.destination||"").slice(0,180),
      startDate:/^\d{4}-\d{2}-\d{2}$/.test(String(t?.startDate||""))?String(t.startDate):"",
      endDate:/^\d{4}-\d{2}-\d{2}$/.test(String(t?.endDate||""))?String(t.endDate):"",
      budget:Number.isFinite(Number(t?.budget))?Math.max(0,Number(t.budget)):0,
      stops,expenses,memories:Array.isArray(t?.memories)?t.memories:[],cover:String(t?.cover||""),
      finished:!!t?.finished,createdAt:t?.createdAt||new Date().toISOString(),finishedAt:t?.finishedAt||null,
      updatedAt:t?.updatedAt||t?.createdAt||Date.now()
    };
  });
  d.activeTripId=d.trips.some(t=>t.id===d.activeTripId&&!t.finished)?d.activeTripId:null;
  d.memories=Array.isArray(d.memories)?d.memories:[];
  d.specialDays=Array.isArray(d.specialDays)?d.specialDays.map(x=>({...x,id:x?.id||uid(),tripId:x?.tripId||""})):[];
  return d;
}
function load(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem("our-love-journey-v1");
    if(!raw)return normalizeData(structuredClone(blank));
    const data=normalizeData(JSON.parse(raw));
    try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}
    return data;
  }catch(e){console.error("Love Journey data load error",e);return normalizeData(structuredClone(blank))}
}
let db=load();
function save(){
  const previous=localStorage.getItem(KEY);
  try{
    const next=normalizeData(db),json=JSON.stringify(next);
    localStorage.setItem(KEY,json);db=next;return true;
  }catch(e){
    try{if(previous)db=normalizeData(JSON.parse(previous))}catch{}
    const quota=e?.name==="QuotaExceededError"||/quota|storage/i.test(String(e?.message||""));
    console.error("Love Journey save error",e);
    toast(quota?"Storage is full. Export a backup or delete old photos first.":"Could not save your data.");
    return false;
  }
}
function formatBytes(bytes){const n=Number(bytes)||0;if(n<1024)return n+" B";if(n<1024*1024)return (n/1024).toFixed(1)+" KB";return (n/1024/1024).toFixed(2)+" MB"}
function appStorageBytes(){try{return new Blob([localStorage.getItem(KEY)||""]).size}catch{return 0}}
async function storageHealth(){
  let usage=null,quota=null,persistent=null;
  try{if(navigator.storage?.estimate){const x=await navigator.storage.estimate();usage=x.usage||0;quota=x.quota||0}if(navigator.storage?.persisted)persistent=await navigator.storage.persisted()}catch{}
  return {appBytes:appStorageBytes(),usage,quota,persistent};
}
async function requestPersistentStorage(){
  try{if(!navigator.storage?.persist){toast("ဒီ browser မှာ Storage Protection မရပါ");return}const ok=await navigator.storage.persist();toast(ok?"Data storage protection enabled ♡":"Browser က storage protection ကို ခွင့်မပြုသေးပါ");updateStorageHealth()}catch{toast("Storage protection could not be enabled")}
}
async function updateStorageHealth(){
  const el=document.getElementById("storageHealth");if(!el)return;
  const x=await storageHealth(),pct=x.quota?Math.round((x.usage||0)/x.quota*100):0,warn=x.appBytes>4*1024*1024||pct>=80;
  el.innerHTML='<div class="storage-health-row"><div><small>APP DATA</small><b>'+formatBytes(x.appBytes)+'</b></div><div><small>ORIGIN USAGE</small><b>'+formatBytes(x.usage||0)+(x.quota?' / '+formatBytes(x.quota):"")+'</b></div><div><small>STATUS</small><b class="'+(warn?"storage-warn":"storage-ok")+'">'+(warn?"⚠ Near limit":"✓ Healthy")+'</b></div></div><div class="storage-health-bar"><span style="width:'+Math.min(100,Math.max(2,pct))+'%"></span></div><p class="muted storage-health-note">'+(x.persistent?"Persistent storage protected.":"Storage is best-effort. Export a backup regularly.")+'</p>';
}
function exportBackup(){
  const payload={version:2,exportedAt:new Date().toISOString(),app:"Our Love Journey",schema:"local-v2",data:normalizeData(db)};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=u;a.download="our-love-journey-backup-"+today()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("Backup exported ♡")
}

function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(n){return new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(n)||0)}
function toast(t){const x=document.getElementById("toast");if(!x)return;x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2200)}
function ageParts(start){if(!start)return null;const a=new Date(start),b=new Date();if(isNaN(a))return null;let years=b.getFullYear()-a.getFullYear(),months=b.getMonth()-a.getMonth(),days=b.getDate()-a.getDate();if(days<0){months--;days+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(months<0){years--;months+=12}return {years,months,days}}
function reminderStatus(){return localStorage.getItem("our-love-journey-reminders")==="1"}
async function enableReminders(){if(!("Notification" in window)){toast("ဒီ browser မှာ notification မရပါ");return}const p=await Notification.requestPermission();if(p==="granted"){localStorage.setItem("our-love-journey-reminders","1");toast("Reminders enabled ♡");checkReminders(true)}else toast("Notification permission မပေးရသေးပါ")}
function checkReminders(force=false){if(!reminderStatus()||!("Notification" in window)||Notification.permission!=="granted")return;const now=new Date();const key=now.toISOString().slice(0,10);if(!force&&localStorage.getItem("our-love-journey-last-reminder")===key)return;const notes=[];const ann=db.profile.startDate?nextOccurrence(db.profile.startDate):null;if(ann){const d=Math.max(0,Math.ceil((ann-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000));if(d<=7)notes.push(d===0?"Anniversary is today ♡":"Anniversary in "+d+" day"+(d===1?"":"s")+" ♡")}const trips=(db.trips||[]).filter(t=>!t.finished&&t.startDate);trips.forEach(t=>{const d=Math.ceil((new Date(t.startDate+"T00:00:00")-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);if(d>=0&&d<=3)notes.push(d===0?t.name+" starts today ✈":t.name+" starts in "+d+" day"+(d===1?"":"s")+" ✈")});if(notes.length){new Notification("Our Love Journey",{body:notes.slice(0,3).join("\n"),icon:"icon-192.svg",badge:"icon-192.svg"});localStorage.setItem("our-love-journey-last-reminder",key)}}
function pageName(){return location.hash.slice(1)||"home"}
function go(p){location.hash=p}
function setup3D(){
 document.querySelectorAll(".card,.timebox,.btn").forEach(el=>{if(el.dataset.tilt)return;el.dataset.tilt="1";el.addEventListener("pointermove",e=>{if(e.pointerType==="touch")return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(700px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*5).toFixed(2)}deg) translateZ(2px)`});el.addEventListener("pointerleave",()=>{el.style.transform=""})})
}
function mapsDirectionsUrl(from,to,mode){
 const f=encodeURIComponent(from||""),t=encodeURIComponent(to||"");
 const travel=String(mode||"").toLowerCase()==="train"||String(mode||"").toLowerCase()==="bts"||String(mode||"").toLowerCase()==="mrt"||String(mode||"").toLowerCase()==="boat"?"transit":"driving";
 return "https://www.google.com/maps/dir/?api=1&origin="+f+"&destination="+t+"&travelmode="+travel;
}
function transportIcon(mode){
 const m=String(mode||"").toLowerCase();
 return m==="car"?"🚗":m==="motorcycle"?"🏍️":m==="train"?"🚆":m==="boat"?"⛴️":m==="bus"?"🚌":m==="minivan"?"🚐":m==="taxi"?"🚕":m==="flight"?"✈️":m==="bts"?"🚇":m==="mrt"?"🚇":m==="walk"?"🚶":"➜";
}
function transportLabel(mode){return mode||"Route";}
function updateNextStopBar(){
 const el=document.getElementById("nextStopBar"); if(!el)return;
 const t=db.trips.find(x=>x.id===db.activeTripId&&!x.finished);
 const stops=t?.stops||[];
 if(!t||!stops.length){el.innerHTML="";el.classList.remove("has-next-stop");return}
 const firstOpen=stops.findIndex(x=>!x.reached);
 if(firstOpen<0){el.innerHTML="";el.classList.remove("has-next-stop");return}
 el.classList.add("has-next-stop");

 // Treat the first saved stop as the starting point. The header shows
 // the current point -> the next destination, then advances after that
 // destination is marked reached.
 const fromStop=stops[firstOpen]||null;
 const toStop=stops[firstOpen+1]||null;
 const from=fromStop?.name||t.destination||"Current";
 const to=toStop?.name||fromStop?.name||t.destination||"Next Stop";
 const leg=(fromStop?.legs||[])[0]||(toStop?.legs||[])[0]||null;
 const mode=String(leg?.vehicle||toStop?.transportMode||fromStop?.transportMode||"");
 const icon=transportIcon(mode),label=transportLabel(mode);
 const segmentNo=Math.min(firstOpen+1,stops.length);
 const pct=stops.length?Math.round((segmentNo/stops.length)*100):100;
 const planned=(toStop?.date||toStop?.time)
   ? ((toStop?.date?esc(toStop.date):"")+(toStop?.time?" · "+esc(toStop.time):""))
   : "Next Destination";
 const nodes=stops.map((st,i)=>{
   const cls=i<firstOpen?"done":i===firstOpen?"current":i===firstOpen+1?"next":"pending";
   return '<span class="ns3-node '+cls+'"><i></i><b>'+esc(st.name||("Stop "+(i+1)))+'</b></span>';
 }).join("");
 el.innerHTML='<div class="next-stop-v3" data-page="travel">'+
   '<div class="ns3-main">'+
     '<div class="ns3-kicker"><span class="ns3-pin">📍</span><span>NEXT STOP</span><b>STOP '+String(segmentNo).padStart(2,"0")+' / '+String(stops.length).padStart(2,"0")+'</b></div>'+
     '<div class="ns3-destination"><strong>'+esc(from)+'</strong><span>➜</span><strong>'+esc(to)+'</strong></div>'+
     '<div class="ns3-route"><span class="ns3-vehicle">'+icon+' '+esc(label)+'</span><span class="ns3-state">'+esc(planned)+'</span></div>'+
     '<div class="ns3-track">'+nodes+'</div>'+
   '</div>'+
   '<a class="ns3-map" href="'+mapsDirectionsUrl(from,to,mode)+'" target="_blank" rel="noopener" aria-label="Open route">↗</a>'+
   '<div class="ns3-progress"><em style="width:'+pct+'%"></em></div>'+
 '</div>';
}
function render(){
 const p=pageName(),app=document.getElementById("app");
 if(!app)return;
 window.db=db;
 document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 try{
   db=normalizeData(db); window.db=db;
   if(p==="home")home(app); else if(p==="anniversary")anniversary(app); else if(p==="expense")expensePage(app); else if(p==="travel")travel(app); else if(p==="memories")memories(app); else if(p==="history")history(app); else settings(app);
   setup3D();
   updateNextStopBar();
   checkReminders();
 }catch(e){
   console.error("Love Journey render error",e);
   try{db=normalizeData(db);window.db=db}catch{}
   const n1=esc(db?.profile?.name1||"Your Name"),n2=esc(db?.profile?.name2||"Love"),trips=Array.isArray(db?.trips)?db.trips:[];
   app.innerHTML='<section class="hero"><div class="card hero-card"><div class="hero-heart">♥</div><h1>'+n1+' <span>∞</span> '+n2+'</h1><p class="muted">Your saved journey is safe. The page has been recovered automatically.</p><div class="actions"><button class="btn" data-page="anniversary">♡ Anniversary</button><button class="btn secondary" data-page="travel">✈ Start a Journey</button></div></div></section><div class="section-title"><h2>Your Journey</h2><span class="muted">'+trips.length+' trip(s)</span></div><div class="card empty"><div class="big">✈</div><b>Journey data is safe</b><p>Open Travel to continue your saved trips.</p></div>';
   try{setup3D();updateNextStopBar()}catch{}
 }
}
function shellHead(title,sub){return `<div class="page-head"><div class="eyebrow">OUR PRIVATE JOURNEY</div><h1>${title}</h1><div class="muted">${sub}</div></div>`}
function tripCountdown(t){
 if(!t?.startDate)return null;
 const start=new Date(t.startDate+"T00:00:00");
 if(isNaN(start))return null;
 const diff=start-Date.now();
 if(diff<=0)return {started:true,days:0,hours:0,minutes:0,seconds:0};
 const days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),minutes=Math.floor(diff%3600000/60000),seconds=Math.floor(diff%60000/1000);
 return {started:false,days,hours,minutes,seconds};
}
function homeUpcoming(){
 const active=db.trips.find(t=>t.id===db.activeTripId&&!t.finished);
 const nowDay=new Date();nowDay.setHours(0,0,0,0);
 const upcomingTrips=(db.trips||[]).filter(t=>!t.finished&&t.startDate).filter(t=>{
   const d=new Date(t.startDate+"T00:00:00");return !isNaN(d)&&d>=nowDay;
 }).sort((a,b)=>new Date(a.startDate+"T00:00:00")-new Date(b.startDate+"T00:00:00"));
 const nextTrip=upcomingTrips[0]||null;
 const ann=db.profile.startDate?nextOccurrence(db.profile.startDate):null;
 const nextStop=active?(active.stops||[]).find(s=>!s.reached):null;
 const memoryCount=(db.memories||[]).length+(db.trips||[]).reduce((s,t)=>s+(t.memories?.length||0),0);
 const spend=(db.trips||[]).reduce((s,t)=>s+total(t),0);
 return {active,nextTrip,ann,nextStop,memoryCount,spend};
}
function homeSmartCards(){
 const h=homeUpcoming(),progress=h.active?tripProgress(h.active):0,tc=tripCountdown(h.nextTrip);
 const tripSub=h.nextTrip?(tc?.started?"Starts today":tc?tc.days+"d "+tc.hours+"h "+tc.minutes+"m":"Planned"):"Plan your next journey";
 const budget=h.active?Number(h.active.budget||0):0,spent=h.active?total(h.active):0,left=budget-spent;
 return `<div class="smart-home-grid home-dashboard">
 <button class="smart-card card smart-feature anniversary" data-page="anniversary"><span>♡</span><div><small>UPCOMING ANNIVERSARY</small><b>${h.ann?daysUntil(h.ann)+" days":"Not set"}</b><p>${h.ann?esc(new Date(h.ann).toLocaleDateString()):"Add anniversary date"}</p></div><em>›</em></button>
 <button class="smart-card card smart-feature trip-countdown-card" data-page="travel"><span>✈</span><div><small>UPCOMING TRIP</small><b>${h.nextTrip?esc(h.nextTrip.name):"No trip yet"}</b><p id="homeTripCountdown">${tripSub}</p></div><em>›</em></button>
 <button class="smart-card card" data-page="travel"><span>📍</span><div><small>NEXT STOP</small><b>${h.nextStop?esc(h.nextStop.name):h.active?"All stops reached":"No active trip"}</b><p>${h.nextStop?(h.nextStop.date||"Planned stop"):h.active?"Journey complete":"Start a journey"}</p></div><em>›</em></button>
 <button class="smart-card card" data-page="memories"><span>📸</span><div><small>TOTAL MEMORIES</small><b>${h.memoryCount}</b><p>saved moments</p></div><em>›</em></button>
 <button class="smart-card card" data-page="expense"><span>฿</span><div><small>TOTAL TRAVEL SPENDING</small><b>฿${money(h.spend)}</b><p>all saved journeys</p></div><em>›</em></button>
 <button class="smart-card card" data-page="travel"><span>◈</span><div><small>CURRENT TRIP PROGRESS</small><b>${h.active?progress+"%":"No active trip"}</b><p>${h.active?(h.active.stops||[]).filter(s=>s.reached).length+" / "+(h.active.stops||[]).length+" stops reached":"Open Travel to start"}</p></div><em>›</em></button>
 </div>
 <div class="smart-dashboard-wide card"><div><div class="eyebrow">LIVE JOURNEY PULSE</div><h3>${h.active?esc(h.active.name):"Your Love Journey"}</h3><p>${h.active?(h.nextStop?"Next: "+esc(h.nextStop.name):"All planned stops reached"):"Set an active trip to see live progress here."}</p></div><div class="smart-pulse"><span style="width:${h.active?Math.max(4,progress):4}%"></span></div><div class="smart-pulse-meta"><b>${h.active?progress+"%":"—"}</b><small>${h.active?(budget?"฿"+money(Math.max(0,left))+" left":"฿"+money(spent)+" spent"):"No active trip"}</small></div></div>`;
}
function home(a){
 const n1=db.profile.name1||"Your Name",n2=db.profile.name2||"Love";
 const age=ageParts(db.profile.startDate),active=db.trips.find(t=>t.id===db.activeTripId&&!t.finished);
 const journeyTrips=(db.trips||[]).slice().sort((x,y)=>Number(y.updatedAt||0)-Number(x.updatedAt||0)).slice(0,4);
 const journeyCards=journeyTrips.map(t=>{
   const mem=(t.memories||[])[0], img=mem?.data;
   return `<article class="home-trip-card card" data-open-trip="${t.id}">
    <div class="home-trip-image" ${img?`style="background-image:url('${img}')"`:""}><span class="trip-more">⋮</span><span class="home-trip-badge">${t.finished?"Finished":"Journey"}</span></div>
    <div class="home-trip-info"><b>${esc(t.name)}</b><small>${esc(t.destination||"")} · ${t.stops.length} stops</small></div>
   </article>`;
 }).join("");
 a.innerHTML=`<section class="hero"><div class="card hero-card"><div class="hero-heart">♥</div><h1>${esc(n1)} <span>∞</span> ${esc(n2)}</h1>${age?`<div class="countdown"><div class="timebox"><b>${age.years}</b><small>Years</small></div><div class="timebox"><b>${age.months}</b><small>Months</small></div><div class="timebox"><b>${age.days}</b><small>Days</small></div><div class="timebox"><b id="liveHours">0</b><small>Hours</small></div><div class="timebox"><b id="liveMinutes">0</b><small>Minutes</small></div><div class="timebox"><b id="liveSec">0</b><small>Seconds</small></div></div>`:''}<div class="actions"><button class="btn" data-page="anniversary">♡ Anniversary</button><button class="btn secondary" data-page="travel">✈ Start a Journey</button></div></div></section>
 <div class="section-title"><h2>Smart Dashboard</h2><span class="muted">Your story at a glance</span></div>
 ${homeSmartCards()}
 <div class="section-title"><h2>Your Journey</h2><span class="muted">${db.trips.length} trip(s)</span></div>
 <div class="home-trip-grid">${journeyCards||`<div class="card empty"><div class="big">✈</div><b>No journeys yet</b><p>Start your first journey.</p></div>`}</div>`;
 if(age){const update=()=>{const s=Math.max(0,Math.floor((Date.now()-new Date(db.profile.startDate+"T00:00:00").getTime())/1000));const hs=Math.floor(s/3600)%24,mi=Math.floor(s/60)%60,se=s%60;const eh=document.getElementById("liveHours"),em=document.getElementById("liveMinutes"),es=document.getElementById("liveSec");if(eh)eh.textContent=hs;if(em)em.textContent=mi;if(es)es.textContent=se};clearInterval(window.__homeTimer);update();window.__homeTimer=setInterval(update,1000)}
 const refreshTripCountdown=()=>{const h=homeUpcoming(),el=document.getElementById("homeTripCountdown");if(!el)return;const tc=tripCountdown(h.nextTrip);el.textContent=!h.nextTrip?"Plan your next journey":tc?.started?"Starts today":tc?tc.days+"d "+tc.hours+"h "+tc.minutes+"m "+tc.seconds+"s":"Planned"};clearInterval(window.__homeTripTimer);refreshTripCountdown();window.__homeTripTimer=setInterval(refreshTripCountdown,1000);
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
  const next=nextOccurrence(x.date),trip=x.tripId?db.trips.find(t=>String(t.id)===String(x.tripId)):null;
  return `<article class="special-card card"><div class="special-icon">${x.type==="Birthday"?"🎂":x.type==="Anniversary"?"♡":x.type==="First Trip"?"✈":x.type==="First Date"?"☕":x.type==="First Meet"?"✨":"★"}</div><div class="special-main"><span class="badge">${esc(x.type)}</span><h3>${esc(x.title)}</h3><p>${esc(x.date)}${x.note?" · "+esc(x.note):""}</p>${trip?`<small class="calendar-trip-link">✈ ${esc(trip.name)}</small>`:""}</div><div class="special-count"><b>${daysUntil(next)}</b><small>days</small></div><div class="special-actions">${trip?`<button class="mini-btn" data-open-related-trip="${trip.id}">Trip</button>`:""}<button class="mini-btn" data-edit-special="${x.id}">Edit</button><button class="mini-btn danger-text" data-delete-special="${x.id}">Delete</button></div></article>`;
}
function calendar(a){
 const list=(db.specialDays||[]).slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));
 const upcoming=list.map(x=>({...x,next:nextOccurrence(x.date)})).sort((x,y)=>x.next-y.next);
 const next=upcoming[0];
 a.innerHTML=shellHead("Couple Calendar","Keep the important days of your story in one private timeline.")+
 `<div class="calendar-hero card"><div class="calendar-orb">♡</div><div><div class="eyebrow">SPECIAL DAYS</div><h2>${list.length} saved day${list.length===1?"":"s"}</h2><p class="muted">${next?`Next: <b>${esc(next.title)}</b> · ${daysUntil(next.next)} days`:"Add your first special day."}</p></div><button class="btn" id="addSpecial">+ Add Day</button></div>
 <div class="special-grid">${list.length?list.map(specialDayCard).join(""):`<div class="card empty"><div class="big">♡</div><b>No special days yet</b><p>Add anniversary, birthday, first date or any day you want to remember.</p></div>`}</div>`;
}
function expensePage(a){
 const now=new Date(), ym0=String(now.getFullYear())+"-"+String(now.getMonth()+1).padStart(2,"0");
 const months=[...new Set((db.trips||[]).flatMap(t=>[t.startDate,t.endDate,...(t.expenses||[]).map(e=>e.date),...(t.stops||[]).map(s=>s.date)]).filter(Boolean).map(x=>String(x).slice(0,7)))].sort().reverse();
 const savedYm=window.__expenseMonth, ym=savedYm&&months.includes(savedYm)?savedYm:(months.includes(ym0)?ym0:(months[0]||ym0));
 const [yy,mm]=ym.split("-").map(Number), monthStart=new Date(yy,mm-1,1), nextMonth=new Date(yy,mm,1);
 const inMonth=d=>{if(!d)return false;const x=new Date(String(d).slice(0,10)+"T00:00:00");return !isNaN(x)&&x>=monthStart&&x<nextMonth};
 const monthTrips=(db.trips||[]).filter(t=>{const st=t.startDate?new Date(t.startDate+"T00:00:00"):null,en=t.endDate?new Date(t.endDate+"T23:59:59"):st;return st&&en&&st<nextMonth&&en>=monthStart});
 const daily={},cats={};
 const add=(date,cat,amount)=>{const n=Number(amount||0);if(!date||n<=0)return;const day=String(date).slice(0,10);if(!inMonth(day))return;daily[day]=(daily[day]||0)+n;cats[cat]=(cats[cat]||0)+n};
 (db.trips||[]).forEach(t=>{(t.expenses||[]).forEach(e=>add(e.date||t.startDate,e.category||"Other",e.amount));(t.stops||[]).forEach(s=>{add(s.date||t.startDate,"Activities / Stops",s.price);(s.legs||[]).forEach(l=>add(s.date||t.startDate,"Transportation",l.price))})});
 const totalMonth=Object.values(daily).reduce((n,v)=>n+v,0),days=Object.entries(daily).sort((a,b)=>a[0].localeCompare(b[0])),catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]),maxCat=catRows[0]?.[1]||1;
 const monthLabel=monthStart.toLocaleDateString(undefined,{month:"long",year:"numeric"});
 const options=months.length?months.map(x=>{const q=x.split("-").map(Number),d=new Date(q[0],q[1]-1,1);return '<option value="'+x+'" '+(x===ym?"selected":"")+'>'+d.toLocaleDateString(undefined,{month:"long",year:"numeric"})+'</option>'}).join(""):'<option value="'+ym+'">'+monthLabel+'</option>';
 const dailyHtml=days.length?days.map(([day,v])=>{const d=new Date(day+"T00:00:00"),tripNames=monthTrips.filter(t=>{const st=t.startDate?new Date(t.startDate+"T00:00:00"):null,en=t.endDate?new Date(t.endDate+"T23:59:59"):st;return st&&en&&st<=new Date(day+"T23:59:59")&&en>=new Date(day+"T00:00:00")}).map(t=>esc(t.name)).join(" · ")||"Travel expense",pct=Math.max(4,Math.round(v/(Math.max(...Object.values(daily),1))*100));return '<article class="card daily-expense-row"><div class="daily-date"><b>'+d.toLocaleDateString(undefined,{day:"2-digit"})+'</b><small>'+d.toLocaleDateString(undefined,{weekday:"short",month:"short"})+'</small></div><div class="daily-main"><b>'+tripNames+'</b><div class="daily-track"><i style="width:'+pct+'%"></i></div></div><strong>฿'+money(v)+'</strong></article>'}).join(""):'<div class="card empty"><div class="big">฿</div><b>No expenses for '+monthLabel+'</b><p>Add expenses inside a trip and they will appear here by date.</p></div>';
 const catHtml=catRows.length?catRows.map(([k,v],i)=>'<div class="card expense-cat-row"><div><b>'+esc(k)+'</b><small>'+(totalMonth?Math.round(v/totalMonth*100):0)+'% of monthly spending</small></div><strong>฿'+money(v)+'</strong><div class="cat-track"><i class="cat-'+(i%7)+'" style="width:'+Math.max(3,Math.round(v/maxCat*100))+'%"></i></div></div>').join(""):'<div class="card empty">No category data yet.</div>';
 const budgetKey="our-love-journey-budget-"+ym;
 const monthlyBudget=Number(localStorage.getItem(budgetKey)||0);
 const budgetLeft=monthlyBudget-totalMonth;
 const budgetPct=monthlyBudget?Math.min(100,Math.max(0,totalMonth/monthlyBudget*100)):0;
 const tripMonthTotal=t=>{
   let n=0;
   (t.expenses||[]).forEach(e=>{if(inMonth(e.date||t.startDate))n+=Number(e.amount||0)});
   (t.stops||[]).forEach(s=>{const d=s.date||t.startDate;if(inMonth(d)){n+=Number(s.price||0);(s.legs||[]).forEach(l=>n+=Number(l.price||0))}});
   return n;
 };
 const tripRows=(db.trips||[]).map(t=>({name:t.name,total:tripMonthTotal(t)})).filter(x=>x.total>0).sort((x,y)=>y.total-x.total);
 const tripHtml=tripRows.length?tripRows.map(x=>'<div class="card expense-cat-row"><div><b>'+esc(x.name)+'</b><small>Trip spending</small></div><strong>฿'+money(x.total)+'</strong><div class="cat-track"><i style="width:'+Math.max(3,Math.round(x.total/(tripRows[0].total||1)*100))+'%"></i></div></div>').join(""):'<div class="card empty">No trip spending yet.</div>';
 a.innerHTML=shellHead("Expense Summary","See your travel spending by day, month, trip and category.")+
 '<div class="expense-month-picker card"><div><div class="eyebrow">TRAVEL MONTH</div><h2>'+monthLabel+'</h2><p class="muted">'+monthTrips.length+' trip'+(monthTrips.length===1?"":"s")+'</p></div><select id="expenseMonth">'+options+'</select></div>'+
 '<div class="card panel expense-budget-panel"><div class="section-title"><div><div class="eyebrow">MONTHLY BUDGET</div><h3>Set a spending limit</h3></div><button class="btn secondary" id="saveExpenseBudget">Save Budget</button></div><div class="form-grid"><div class="field"><label>Budget (THB)</label><input id="expenseBudget" type="number" min="0" step="0.01" value="'+(monthlyBudget||"")+'" placeholder="e.g. 20000"></div></div><div class="budget-mini '+(monthlyBudget&&budgetLeft<0?"over":"")+'"><span style="width:'+budgetPct+'%"></span></div><p class="muted">'+(monthlyBudget?(budgetLeft>=0?"฿"+money(budgetLeft)+" remaining":"฿"+money(Math.abs(budgetLeft))+" over budget"):"No monthly budget set")+'</p></div>'+
 '<div class="expense-finance-hero card"><div><div class="eyebrow">MONTHLY MONEY PULSE</div><h2>฿'+money(totalMonth)+'</h2><p>Travel spending in '+monthLabel+'</p></div><div class="finance-ring" style="--p:'+budgetPct+'%"><b>'+(monthlyBudget?(Math.round(budgetPct)+"%"):"—")+'</b><small>BUDGET</small></div></div>'+'<div class="expense-overview-grid"><div class="card expense-stat"><span>✈</span><small>TRIPS THIS MONTH</small><b>'+monthTrips.length+'</b><p>journeys counted</p></div><div class="card expense-stat"><span>฿</span><small>TOTAL SPENT</small><b>฿'+money(totalMonth)+'</b><p>'+days.length+' spending day'+(days.length===1?"":"s")+'</p></div><div class="card expense-stat"><span>📅</span><small>AVERAGE / SPENDING DAY</small><b>฿'+money(days.length?totalMonth/days.length:0)+'</b><p>this month</p></div></div>'+
 '<div class="section-title"><h2>Daily Expenses</h2><span class="muted">'+days.length+' day'+(days.length===1?"":"s")+'</span></div><div class="daily-expense-list">'+dailyHtml+'</div>'+
 '<div class="section-title"><h2>By Trip</h2><span class="muted">This month</span></div><div class="expense-category-list">'+tripHtml+'</div>'+
 '<div class="section-title"><h2>Category Summary</h2><span class="muted">This month</span></div><div class="expense-category-list">'+catHtml+'</div>';
 document.getElementById("expenseMonth")?.addEventListener("change",e=>{window.__expenseMonth=e.target.value;render()});
 document.getElementById("saveExpenseBudget")?.addEventListener("click",()=>{const v=Math.max(0,Number(document.getElementById("expenseBudget").value||0));localStorage.setItem(budgetKey,String(v));toast("Monthly budget saved ♡");render()});
}
function anniversary(a){
 const p=db.profile;
 a.innerHTML=shellHead("Our Anniversary","Your private live relationship timeline.")+
 `<div class="card anniversary-hero"><div class="eyebrow">∞ OUR LOVE JOURNEY</div><h2>${esc(p.name1||"You")} <span>♡</span> ${esc(p.name2||"Love")}</h2><div class="ann-sub">${p.startDate?"Together since "+new Date(p.startDate+"T00:00").toLocaleDateString():"Set your relationship date to begin"}</div>${p.startDate?renderAgePremium(p.startDate):""}</div><div class="card panel"><div class="form-grid"><div class="field"><label>First name</label><input id="n1" value="${esc(p.name1)}" placeholder="Enter name"></div><div class="field"><label>Second name</label><input id="n2" value="${esc(p.name2)}" placeholder="Enter name"></div><div class="field"><label>Relationship / Anniversary date</label><input id="date" type="date" value="${esc(p.startDate)}"></div></div><div class="actions"><button class="btn" id="saveProfile">Save Anniversary</button></div></div>${p.startDate?anniversaryNextCountdown(p.startDate)+relationshipMilestones(p.startDate):`<div class="card empty"><div class="big">♡</div>Add your anniversary date to start the live counter.</div>`}`;
 document.getElementById("saveProfile").onclick=()=>{db.profile.name1=document.getElementById("n1").value.trim();db.profile.name2=document.getElementById("n2").value.trim();db.profile.startDate=document.getElementById("date").value;save();toast("Anniversary saved");render()}
 if(p.startDate){updateAnniversaryLive(p.startDate);clearInterval(window.__anniversaryTimer);window.__anniversaryTimer=setInterval(()=>{updateAnniversaryLive(db.profile.startDate);updateAnniversaryNextLive(db.profile.startDate)},1000);updateAnniversaryNextLive(p.startDate)}
}
function renderAgePremium(d){
 const x=preciseAge(d)||{years:0,months:0,days:0,hours:0,minutes:0,seconds:0};
 return `<div class="ann-live-grid"><div class="ann-live-box"><b id="annYears">${x.years}</b><small>YEARS</small></div><div class="ann-live-box"><b id="annMonths">${x.months}</b><small>MONTHS</small></div><div class="ann-live-box"><b id="annDays">${x.days}</b><small>DAYS</small></div><div class="ann-live-box"><b id="annHours">${x.hours}</b><small>HOURS</small></div><div class="ann-live-box"><b id="annMinutes">${x.minutes}</b><small>MINUTES</small></div><div class="ann-live-box"><b id="annSeconds">${x.seconds}</b><small>SECONDS</small></div></div>`;
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
function anniversaryNextCountdown(d){
 const next=nextOccurrence(d); if(!next)return "";
 const diff=Math.max(0,next-Date.now()),days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),minutes=Math.floor(diff%3600000/60000),seconds=Math.floor(diff%60000/1000);
 const n=new Date(d+"T00:00:00"); const years=next.getFullYear()-n.getFullYear();
 return '<div class="card panel ann-next-card"><div><div class="eyebrow">NEXT ANNIVERSARY</div><h2>'+esc(years+' Year'+(years===1?'':'s'))+' ♡</h2><p class="muted">'+next.toLocaleDateString()+'</p></div><div class="countdown"><div class="timebox"><b id="annNextDays">'+days+'</b><small>Days</small></div><div class="timebox"><b id="annNextHours">'+hours+'</b><small>Hours</small></div><div class="timebox"><b id="annNextMinutes">'+minutes+'</b><small>Min</small></div><div class="timebox"><b id="annNextSeconds">'+seconds+'</b><small>Sec</small></div></div></div>';
}
function updateAnniversaryNextLive(d){
 const n=nextOccurrence(d);if(!n)return;
 const diff=Math.max(0,n-Date.now());
 ["annNextDays","annNextHours","annNextMinutes","annNextSeconds"].forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;el.textContent=[Math.floor(diff/86400000),Math.floor(diff%86400000/3600000),Math.floor(diff%3600000/60000),Math.floor(diff%60000/1000)][i]});
}
function relationshipMilestones(d){
 const start=new Date(d+"T00:00:00"); if(isNaN(start))return "";
 const targets=[["1 Month",()=>{const x=new Date(start);x.setMonth(x.getMonth()+1);return x}],["100 Days",()=>new Date(start.getTime()+100*86400000)],["6 Months",()=>{const x=new Date(start);x.setMonth(x.getMonth()+6);return x}],["1 Year",()=>{const x=new Date(start);x.setFullYear(x.getFullYear()+1);return x}],["1000 Days",()=>new Date(start.getTime()+1000*86400000)],["2 Years",()=>{const x=new Date(start);x.setFullYear(x.getFullYear()+2);return x}],["3 Years",()=>{const x=new Date(start);x.setFullYear(x.getFullYear()+3);return x}],["5 Years",()=>{const x=new Date(start);x.setFullYear(x.getFullYear()+5);return x}],["10 Years",()=>{const x=new Date(start);x.setFullYear(x.getFullYear()+10);return x}]];
 const now=new Date(); const items=targets.map(([label,fn])=>({label,date:fn()})).filter(x=>x.date>now).sort((a,b)=>a.date-b.date);
 const next=items[0];
 if(!next)return '<div class="milestone-card card"><div><div class="eyebrow">NEXT MILESTONE</div><h3>Every day together is a milestone ♡</h3><p class="muted">Keep making memories.</p></div></div>';
 const days=Math.max(0,Math.ceil((next.date-now)/86400000));
 return '<div class="milestone-card card"><div><div class="eyebrow">NEXT MILESTONE</div><h3>'+esc(next.label)+'</h3><p class="muted">'+next.date.toLocaleDateString()+' · '+days+' day'+(days===1?"":"s")+' to go</p></div><div class="milestone-number"><b>'+days+'</b><small>days</small></div></div>';
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
function tripMini(t){const spent=total(t),budget=Number(t.budget||0),left=budget-spent;return `<div class="card trip-card" style="margin-bottom:12px"><div><span class="badge">${t.finished?"Finished":"Saved"}</span><h3>${esc(t.name)}</h3><p>${esc(t.destination||"")} · ${t.stops.length} stops · ฿${money(spent)}${budget?` / ฿${money(budget)}`:""}</p>${budget?`<div class="budget-mini ${left<0?"over":""}"><span style="width:${Math.min(100,Math.max(0,spent/budget*100))}%"></span></div>`:""}</div><div class="actions history-trip-actions"><button class="btn secondary" data-open-history-trip="${t.id}" type="button">Open Journey</button>${t.finished?`<button class="btn secondary" data-edit-history-trip="${t.id}">Edit</button><button class="btn danger" data-delete-history-trip="${t.id}">Delete</button>`:""}</div></div>`}
function routeTransportTotal(s){return (s.legs||[]).reduce((n,l)=>n+Number(l.price||0),0)}
function routeTransportAll(t){return t.stops.reduce((n,s)=>n+routeTransportTotal(s),0)}
function mapsSearchUrl(q){if(q&&typeof q==="object"&&Number.isFinite(Number(q.lat))&&Number.isFinite(Number(q.lng)))return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(Number(q.lat)+","+Number(q.lng));return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||"")}
function tripMapsUrl(t){
 const stops=(t.stops||[]).filter(s=>s.name||Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));
 if(!stops.length)return mapsSearchUrl(t.destination||t.name);
 const point=s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))?Number(s.lat)+","+Number(s.lng):String(s.name||"").trim();
 const origin=point(stops[0]), destination=point(stops[stops.length-1]), waypoints=stops.slice(1,-1).map(point);
 let u="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints.length)u+="&waypoints="+encodeURIComponent(waypoints.join("|"));
 return u;
}
function tripProgress(t){const totalStops=(t.stops||[]).length,reached=(t.stops||[]).filter(s=>s.reached).length;return totalStops?Math.round(reached/totalStops*100):0}
function tripStatus(t){
 const now=new Date();const start=t.startDate?new Date(t.startDate+"T00:00:00"):null;const end=t.endDate?new Date(t.endDate+"T23:59:59"):null;const p=tripProgress(t);let label="Ready",text="Add your route stops and start planning.";if(start&&!isNaN(start)&&now<start){const d=Math.ceil((start-now)/86400000);label="Starts in "+d+" day"+(d===1?"":"s");text="Your journey is coming up.";}
 else if(end&&!isNaN(end)&&now>end){label="Past date";text="The planned end date has passed.";}
 else if(start&&!isNaN(start)){label="In progress";text=p+"% of planned stops reached.";}
 const budget=Number(t.budget||0),spent=total(t),left=budget-spent;return {label,text,p,budget,spent,left};
}
function tripInsight(t){const s=tripStatus(t),next=(t.stops||[]).find(x=>!x.reached);return `<div class="trip-insight card"><div class="insight-main"><span class="badge">${esc(s.label)}</span><strong>${s.text}</strong>${next?`<small>Next stop: <b>${esc(next.name)}</b>${next.date?" · "+esc(next.date):""}${next.time?" "+esc(next.time):""}</small>`:""}<div class="progress-line"><span style="width:${s.p}%"></span></div><small>${s.p}% route progress</small></div><div class="insight-budget"><small>${s.budget?"BUDGET LEFT":"SPENT"}</small><strong>${s.budget?"฿"+money(s.left):"฿"+money(s.spent)}</strong>${s.budget&&s.left<0?`<span class="budget-warning">Over budget</span>`:""}</div></div>`}
function itineraryMarkup(t){
 const groups={};
 (t.stops||[]).forEach(s=>{const key=s.date||"Unscheduled";(groups[key]||(groups[key]=[])).push(s)});
 const keys=Object.keys(groups).sort((a,b)=>{if(a==="Unscheduled")return 1;if(b==="Unscheduled")return -1;return a.localeCompare(b)});
 if(!keys.length)return '<div class="card empty"><b>No itinerary yet</b><p>Add route stops with planned dates and times.</p></div>';
 return `<div class="itinerary-list">${keys.map(k=>`<div class="itinerary-day card"><div class="itinerary-date"><span>${k==="Unscheduled"?"—":new Date(k+"T00:00:00").toLocaleDateString(undefined,{weekday:"short"})}</span><b>${esc(k)}</b></div><div class="itinerary-items">${groups[k].slice().sort((a,b)=>String(a.time||"99:99").localeCompare(String(b.time||"99:99"))).map(s=>`<div class="itinerary-item ${s.reached?"done":""}"><span class="itinerary-time">${esc(s.time||"—")}</span><div><b>${esc(s.name)}</b><small>${s.completed?"✓ Completed":s.reached?"● Reached":"○ Planned"}${s.note?" · "+esc(s.note):""}</small></div><a class="map-link" href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">Map</a></div>`).join("")}</div></div>`).join("")}</div>`;
}
function expenseBreakdown(t){
 const m={};
 const category=k=>{const x=String(k||"Other").trim().toLowerCase();if(/transport|taxi|grab|bus|train|bts|mrt|flight|motorbike|boat|walk/.test(x))return "Transportation";if(/food|meal|restaurant|drink|coffee/.test(x))return "Food";if(/hotel|room|stay|accommodation|resort|hostel/.test(x))return "Hotel";if(/shop|shopping|souvenir|gift/.test(x))return "Shopping";return String(k||"Other").trim()||"Other"};
 const add=(k,v)=>{const n=Number(v||0);if(n>0)m[k]=(m[k]||0)+n};
 (t.expenses||[]).forEach(e=>add(category(e.category),e.amount));
 add("Transportation",routeTransportAll(t));
 add("Activities / Stops",(t.stops||[]).reduce((n,s)=>n+Number(s.price||0),0));
 let rows=Object.entries(m).sort((x,y)=>y[1]-x[1]); const grand=rows.reduce((n,x)=>n+x[1],0); if(!rows.length){ rows=[["Transportation",0],["Food",0],["Hotel",0],["Shopping",0],["Activities / Stops",0],["Other",0]]; } const max=rows[0]?.[1]||1;
 if(!rows.length){ rows.push(["Transportation",0],["Food",0],["Hotel",0],["Shopping",0],["Activities / Stops",0],["Other",0]); }
 const colors=["cyan","violet","gold","pink","green","orange","blue"];
 let start=0;
 const segments=rows.map(([k,v],i)=>{const p=grand?v/grand*100:0;const x=start;start+=p;return "var(--chart-"+colors[i%colors.length]+") "+x+"% "+start+"%"}).join(",");
 return `<div class="expense-summary card"><div class="expense-summary-head"><div><div class="eyebrow">SPENDING MIX</div><h3>Where the money goes</h3><p class="muted">${grand?"Spending across "+rows.length+" categories":"Add an expense to start your spending chart"}</p></div><div class="expense-total"><small>TOTAL</small><b>฿${money(grand)}</b></div></div><div class="expense-chart-grid"><div class="expense-donut-wrap"><div class="expense-donut" style="background:conic-gradient(${segments})"><div class="expense-donut-hole"><small>SPENT</small><b>฿${money(grand)}</b></div></div></div><div class="expense-legend">${rows.map(([k,v],i)=>{const p=grand?Math.round(v/grand*100):0;return `<div class="expense-legend-row"><span class="expense-dot dot-${i%7}"></span><div><b>${esc(k)}</b><small>${p}% of trip spending</small></div><strong>฿${money(v)}</strong></div>`}).join("")}</div></div><div class="expense-bars-title"><span>Category comparison</span><small>Largest first</small></div><div class="expense-bars">${rows.map(([k,v],i)=>{const p=grand?Math.round(v/grand*100):0;return `<div class="expense-bar-modern"><div class="expense-bar-label"><span>${esc(k)}</span><strong>฿${money(v)} <small>${p}%</small></strong></div><div class="expense-bar-track"><i class="chart-bar-${i%7}" style="width:${Math.max(2,Math.round(v/max*100))}%"></i></div></div>`}).join("")}</div></div>`;
}
function stopStatus(s,finished=false){if(s?.completed)return {key:"completed",label:"Completed",icon:"✓"};if(s?.reached)return {key:"reached",label:"Reached",icon:"●"};return {key:"planned",label:"Planned",icon:"○"}}
function stopStatusSteps(s,finished=false){const st=stopStatus(s,finished);return `<div class="stop-status ${st.key}" aria-label="Stop status"><span class="status-step ${s.reached||s.completed?"done":st.key==="planned"?"current":""}"><i>○</i> Planned</span><span class="status-line ${s.reached||s.completed?"done":""}></span><span class="status-step ${s.reached||s.completed?"done":st.key==="reached"?"current":""}"><i>●</i> Reached</span><span class="status-line ${s.completed||finished?"done":""}></span><span class="status-step ${s.completed||finished?"done":st.key==="reached"?"current":""}"><i>✓</i> Completed</span></div>`}
function openStopDetail(t,s){
 const st=stopStatus(s,t.finished),photos=s.memories||[],spent=Number(s.price||0)+routeTransportTotal(s);
 const modal=document.getElementById("formModal");if(modal)modal.remove();
 const m=document.createElement("div");m.id="formModal";m.className="modal-backdrop";
 m.innerHTML=`<div class="modal-card stop-detail-modal">
  <button class="modal-close" id="modalClose">×</button>
  <div class="eyebrow">ROUTE STOP ${esc(String((t.stops||[]).findIndex(x=>x.id===s.id)+1).padStart(2,"0"))}</div>
  <div class="stop-detail-title"><div><h2>${esc(s.name)}</h2><span class="stop-status-badge ${st.key}">${st.icon} ${st.label}</span></div><a class="btn secondary map-btn" href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">🗺️ Map</a></div>
  ${stopStatusSteps(s,t.finished)}
  <div class="stop-detail-grid">
   <div><small>PLANNED</small><b>${esc(s.date||"Not set")}${s.time?" · "+esc(s.time):""}</b></div>
   <div><small>TRANSPORT</small><b>${s.transportMode?transportIcon(s.transportMode)+" "+esc(s.transportMode):"Not set"}</b></div>
   <div><small>REACHED</small><b>${s.reachedAt?new Date(s.reachedAt).toLocaleString():"Not reached"}</b></div>
   <div><small>COMPLETED</small><b>${s.completedAt?new Date(s.completedAt).toLocaleString():"Not completed"}</b></div>
  </div>
  ${s.note?`<div class="stop-detail-note"><small>NOTE</small><p>${esc(s.note)}</p></div>`:""}
  <div class="section-title"><h3>Transport Steps</h3><span>฿${money(routeTransportTotal(s))}</span></div>
  <div class="stop-detail-legs">${(s.legs||[]).length?(s.legs||[]).map((l,i)=>`<div class="stop-detail-leg"><span>${i+1}</span><div><b>${esc(l.from)} → ${esc(l.to)}</b><small>${esc(l.vehicle||"Transport")}${l.note?" · "+esc(l.note):""}</small></div><strong>฿${money(l.price)}</strong></div>`).join(""):`<div class="muted">No transport steps.</div>`}</div>
  <div class="section-title"><h3>Stop Cost</h3><strong>฿${money(spent)}</strong></div>
  <div class="section-title"><h3>Stop Photos</h3><button class="btn secondary" id="addStopPhoto">+ Add Photo</button></div>
  <div class="stop-detail-photos">${photos.length?photos.map(m=>`<div class="stop-photo"><img src="${m.data}" alt="${esc(m.caption||s.name)}"><button class="mini-btn danger-text" data-stop-photo-delete="${m.id}">Delete</button></div>`).join(""):`<div class="muted">No photos for this stop yet.</div>`}</div>
 </div>`;
 document.body.appendChild(m);
 const close=()=>m.remove();m.querySelector("#modalClose").onclick=close;
 m.querySelector("#addStopPhoto").onclick=async()=>{const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;input.onchange=async()=>{const files=[...(input.files||[])];for(const f of files){try{const data=await resizeImage(f,1200);s.memories=s.memories||[];s.memories.push({id:uid(),data,caption:"",date:today(),createdAt:new Date().toISOString()})}catch{}}save();close();openStopDetail(t,s);toast(files.length+" stop photo"+(files.length===1?"":"s")+" saved")};input.click()};
 m.addEventListener("click",ev=>{const d=ev.target.closest("[data-stop-photo-delete]");if(d){s.memories=s.memories||[];s.memories=s.memories.filter(x=>String(x.id)!==String(d.dataset.stopPhotoDelete));save();close();openStopDetail(t,s);toast("Stop photo deleted")}});
}
function tripDetail(t){
 return `
<div class="card panel trip-cover-card">${t.cover?`<img class="trip-cover-image" src="${t.cover}" alt="${esc(t.name)} cover">`:`<div class="trip-cover-placeholder">✈️</div>`}<div class="trip-cover-tools"><button class="btn secondary" data-trip-cover="${t.id}" type="button">📸 ${t.cover?"Change Cover":"Add Cover"}</button></div><div class="trip-card" style="padding:0;background:none;border:0"><div><span class="badge">${t.finished?"Finished":"Active"}</span><h2 style="margin:10px 0 5px">${esc(t.name)}</h2><p>${esc(t.destination||"")} · ${t.startDate||""} ${t.endDate?"→ "+t.endDate:""}</p></div><div class="actions"><a class="btn map-btn" href="${tripMapsUrl(t)}" target="_blank" rel="noopener">🗺️ Open Route</a><button class="btn secondary" id="backTrips">← Back</button>${!t.finished?`<button class="btn secondary" id="editTrip" type="button">Edit Trip</button><button class="btn danger" id="deleteTrip" type="button" data-delete-trip="${t.id}">Delete</button><button class="btn secondary" data-export-trip="${t.id}">Export Trip</button><button class="btn gold" id="finishTrip">Finish Traveling</button>`:''}</div></div>
 ${tripInsight(t)}<div class="trip-command-hero"><div><div class="eyebrow">TRIP CONTROL CENTER</div><h3>${esc(t.destination||t.name)}</h3><p>${t.finished?"Journey archived":"Your live travel dashboard"}</p></div><div class="trip-mini-stats"><div><b>${t.stops.length}</b><small>STOPS</small></div><div><b>${t.stops.filter(s=>s.reached).length}</b><small>REACHED</small></div><div><b>฿${money(total(t))}</b><small>SPENT</small></div></div></div><div class="journey-pulse-card card"><div class="journey-pulse-head"><div><div class="eyebrow">JOURNEY ROUTE</div><h3>Live Journey Timeline</h3><p class="muted">Follow every stop, transport leg and cost from one view.</p></div><span class="journey-live-dot">LIVE</span></div><div class="journey-progress"><span style="width:${tripProgress(t)}%"></span></div><div class="journey-progress-meta"><span>${tripProgress(t)}% route completed</span><span>${t.stops.filter(s=>s.reached).length}/${t.stops.length} reached</span></div><div class="journey-timeline">${t.stops.length?t.stops.map((s,i)=>{const st=stopStatus(s,t.finished),legs=s.legs||[];return `<div class="journey-node ${st.key}"><div class="journey-rail"><span>${st.icon}</span>${i<t.stops.length-1?`<i></i>`:""}</div><div class="journey-node-body"><div class="journey-node-top"><div><small>STOP ${String(i+1).padStart(2,"0")} ${s.date?`· ${esc(s.date)}`:""}</small><b>${esc(s.name)}</b><span>${st.label}${s.time?` · ${esc(s.time)}`:""}</span></div><a class="mini-btn map-link" href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">Map</a></div>${legs.length?`<div class="journey-legs">${legs.map(l=>`<div><span>↳</span><b>${esc(l.vehicle||"Transport")}</b><small>${esc(l.from)} → ${esc(l.to)}</small><strong>฿${money(l.price)}</strong></div>`).join("")}</div>`:""}${Number(s.price||0)?`<div class="journey-cost">Stop cost <strong>฿${money(s.price)}</strong></div>`:""}</div></div>`}).join(""):`<div class="empty">Add route stops to build your journey timeline.</div>`}</div></div>
 <div class="section-title"><h2>Daily Itinerary</h2></div>\n ${itineraryMarkup(t)}\n <div class="trip-command-grid"><a class="trip-command card" href="${tripMapsUrl(t)}" target="_blank" rel="noopener"><span>🗺️</span><div><b>Open Full Route</b><small>View all stops on Maps</small></div></a><button class="trip-command card" data-trip-map="true" type="button"><span>📍</span><div><b>Trip Map</b><small>See pins + route line</small></div></button><button class="trip-command card" data-page="expense"><span>฿</span><div><b>Expense Center</b><small>Review spending & budget</small></div></button><div class="trip-command card"><span>📍</span><div><b>${t.stops.length} Stops</b><small>${t.stops.filter(s=>s.reached).length} reached · ${t.stops.filter(s=>s.completed).length} completed</small></div></div></div><div class="budget-card card"><div><small>TRIP BUDGET</small><strong>฿${money(t.budget||0)}</strong></div><div><small>SPENT</small><strong>฿${money(total(t))}</strong></div><div class="${Number(t.budget||0)-total(t)<0?"budget-over":""}"><small>${Number(t.budget||0)-total(t)<0?"OVER BUDGET":"REMAINING"}</small><strong>฿${money((Number(t.budget||0)-total(t)))}</strong></div></div>
 <div class="section-title"><h2>Route</h2><button class="btn secondary" id="addStop">+ Add Stop</button></div><div class="timeline">${t.stops.length?t.stops.map((s,i)=>`<div class="stop route-stop stop-${stopStatus(s,t.finished).key}"><div class="stop-dot"></div><div><div class="stop-top"><span class="stop-number" data-stop-detail="${s.id}">${i+1}</span><h4 data-stop-detail="${s.id}">${esc(s.name)}</h4><span class="stop-status-badge ${stopStatus(s,t.finished).key}">${stopStatus(s,t.finished).icon} ${stopStatus(s,t.finished).label}</span><div class="stop-tools"><button class="mini-btn" data-move-stop="${s.id}" data-direction="up" ${i===0?"disabled":""}>↑</button><button class="mini-btn" data-move-stop="${s.id}" data-direction="down" ${i===t.stops.length-1?"disabled":""}>↓</button><button class="mini-btn" data-edit-stop="${s.id}">Edit</button><button class="mini-btn danger-text" data-delete-stop="${s.id}">Delete</button><a class="mini-btn map-link" href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">Map</a></div></div><small>${s.date||"No planned date"} ${s.time||""}${s.transportMode?" · "+transportIcon(s.transportMode)+" "+esc(s.transportMode):""}${s.reached?" · Reached "+new Date(s.reachedAt).toLocaleString():""}${s.completed?" · Completed "+new Date(s.completedAt).toLocaleString():""} · <a class="map-link" href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">Open Map</a></small>${stopStatusSteps(s,t.finished)}${s.note?`<p class="muted">${esc(s.note)}</p>`:''}${Number(s.price||0)?`<div class="stop-price">Place / Stop Price: <strong>฿${money(s.price)}</strong></div>`:""}<div class="route-legs">${(s.legs||[]).length?(s.legs||[]).map((l,j)=>`<div class="route-leg"><span class="leg-index">${j+1}</span><div class="leg-main"><b>${esc(l.from)} → ${esc(l.to)}</b><small> ${esc(l.vehicle||"Transport")} ${l.note?"· "+esc(l.note):""}</small></div><strong>฿${money(l.price)}</strong><button class="mini-btn" data-edit-leg="${s.id}" data-leg-id="${l.id}">Edit</button><button class="mini-btn danger-text" data-delete-leg="${s.id}" data-leg-id="${l.id}">×</button><a class="mini-btn map-link" href="${mapsSearchUrl(l.from+" to "+l.to)}" target="_blank" rel="noopener">Map</a></div>`).join(""):`<div class="leg-empty">No transport steps yet</div>`}<div class="route-leg-actions"><button class="mini-btn route-add" data-add-leg="${s.id}">＋ Add transport step</button>${routeTransportTotal(s)?`<span class="route-total">Transport ฿${money(routeTransportTotal(s))}</span>`:""}</div></div></div><div>${!t.finished&&!s.reached?`<button class="btn secondary" data-reach="${s.id}">✓ Mark Reached</button>`:''}${!t.finished&&s.reached&&!s.completed?`<button class="btn gold" data-complete-stop="${s.id}">✓ Complete Stop</button>`:''}${s.completed?`<span class="completed-note">✓ Stop completed</span>`:''}</div></div>`).join(""):`<div class="empty">No route stops yet. Add your first place.</div>`}</div>
 <div class="section-title"><h2>Expense Breakdown</h2></div>\n ${expenseBreakdown(t)}\n <div class="section-title"><h2>Expenses</h2><button class="btn secondary" id="addExpense">+ Add Expense</button></div><div class="split"><div class="card panel"><div class="muted">Trip Total</div><div class="total">฿${money(total(t))}</div></div><div class="card panel"><div class="muted">Categories</div><p class="muted" style="line-height:1.8">${categorySummary(t)}</p></div></div><div class="expense-list">${t.expenses.length?t.expenses.map(e=>`<div class="expense"><div><b>${esc(e.category)}</b><small>${e.date||""}${e.note?" · "+esc(e.note):""}</small></div><strong>฿${money(e.amount)}</strong><div class="expense-actions"><button class="mini-btn" data-edit-expense="${e.id}">Edit</button><button class="mini-btn danger-text" data-delete-expense="${e.id}">Delete</button></div></div>`).join(""):`<div class="empty">No expenses recorded yet.</div>`}</div><div class="section-title trip-memory-head"><h2>Trip Memories</h2><button class="btn secondary" data-add-trip-memory="${t.id}">+ Add Photo</button></div><div class="trip-memory-grid">${(t.memories||[]).length?(t.memories||[]).map(m=>tripMemoryCard(m,t.id)).join(""):`<div class="card empty"><div class="big">📸</div><b>No trip photos yet</b><p>Add photos to keep this journey together.</p></div>`}</div></div>`}
function total(t){return t.expenses.reduce((s,e)=>s+Number(e.amount||0),0)+t.stops.reduce((s,x)=>s+Number(x.price||0),0)+routeTransportAll(t)}
function categorySummary(t){const m={};t.expenses.forEach(e=>m[e.category]=(m[e.category]||0)+Number(e.amount||0));const route=routeTransportAll(t);if(route)m["Route Transport"]=(m["Route Transport"]||0)+route;return Object.keys(m).length?Object.entries(m).map(([k,v])=>`${esc(k)}: ฿${money(v)}`).join(" · "):"No expenses yet"}
function memories(a){
 const items=(db.memories||[]).slice().sort((x,y)=>new Date(y.date||0)-new Date(x.date||0));
 a.innerHTML=shellHead("Memories","Keep your favorite photos and little moments in one private album.")+
 `<div class="memory-hero card"><div class="memory-orb">✦</div><div class="memory-hero-copy"><div class="eyebrow">OUR LITTLE MOMENTS</div><h2>${items.length} memories</h2><p class="muted">A private photo vault for the moments worth keeping.</p><div class="memory-mini-stats"><span><b>${items.filter(x=>x.favorite).length}</b><small>Favorites</small></span><span><b>${items.filter(x=>x.date).length}</b><small>Dated</small></span><span><b>${new Set(items.map(x=>x.tripId).filter(Boolean)).size}</b><small>Journeys</small></span></div></div><button class="btn" id="addGlobalMemory">+ Add Photo</button></div>
 <div class="memory-toolbar"><div class="memory-filter active" data-memory-filter="all">All <b>${items.length}</b></div><div class="memory-filter" data-memory-filter="favorite">Favorites <b>${items.filter(x=>x.favorite).length}</b></div></div>
 <div id="memoryGrid" class="global-memory-grid">${items.length?items.map(memoryCard).join(""):`<div class="card empty"><div class="big">📸</div><b>No memories yet</b><p>Add your first photo and make this album yours.</p></div>`}</div>`;
 document.getElementById("addGlobalMemory")?.addEventListener("click",()=>chooseGlobalMemory());
}
function tripMemoryCard(m,tripId){return `<article class="memory-card card"><div class="memory-image" data-memory-open="${m.id}" data-memory-scope="trip" data-trip-id="${tripId}"><img src="${m.data}" alt="${esc(m.caption||"Trip memory")}"></div><div class="memory-info"><b>${esc(m.caption||"Beautiful moment")}</b><small>${m.date?new Date(m.date+"T00:00:00").toLocaleDateString():"No date"}</small><button class="mini-btn danger-text" data-delete-trip-memory="${tripId}" data-memory-id="${m.id}">Delete</button></div></article>`}
function memoryFindGlobal(id){return (db.memories||[]).find(x=>String(x.id)===String(id))||null}
function memoryFindTrip(tripId,id){const t=db.trips.find(x=>String(x.id)===String(tripId));return {t,m:t?.memories?.find(x=>String(x.id)===String(id))||null}}
function memoryViewer(id,scope="global",tripId=""){
 const info=scope==="trip"?memoryFindTrip(tripId,id):{t:null,m:memoryFindGlobal(id)};if(!info.m)return;
 const list=scope==="trip"?(info.t?.memories||[]):(db.memories||[]),index=Math.max(0,list.findIndex(x=>String(x.id)===String(id)));
 const m=document.createElement("div");m.className="memory-viewer";m.id="memoryViewer";
 m.innerHTML=`<div class="memory-viewer-backdrop"></div><div class="memory-viewer-head"><button class="icon-btn" id="memoryViewerClose">×</button><div><small>MEMORY ${index+1} / ${list.length}</small><b>${esc(info.m.caption||"Beautiful moment")}</b></div><button class="icon-btn" id="memoryViewerFav">${info.m.favorite?"★":"☆"}</button></div><div class="memory-viewer-stage"><button class="memory-viewer-arrow left" id="memoryPrev">‹</button><img id="memoryViewerImg" src="${info.m.data}" alt=""><button class="memory-viewer-arrow right" id="memoryNext">›</button></div><div class="memory-viewer-controls"><button class="mini-btn" id="memoryZoomOut">−</button><button class="mini-btn" id="memoryZoomReset">100%</button><button class="mini-btn" id="memoryZoomIn">＋</button><button class="btn secondary" id="memoryEdit">Edit Details</button></div><div class="memory-viewer-caption"><b id="memoryViewerCaption">${esc(info.m.caption||"Beautiful moment")}</b><span id="memoryViewerMeta">${info.m.date?esc(info.m.date):"No date"} · ${scope==="trip"?esc(info.t?.name||"Trip memory"):"Our Memories"}</span></div>`;
 document.body.appendChild(m);let current=index,scale=1,startX=0;
 const img=()=>m.querySelector("#memoryViewerImg"),cur=()=>list[current];
 const apply=()=>{const x=cur();img().src=x.data;img().style.transform=`scale(${scale})`;m.querySelector(".memory-viewer-head b").textContent=x.caption||"Beautiful moment";m.querySelector("#memoryViewerCaption").textContent=x.caption||"Beautiful moment";m.querySelector("#memoryViewerMeta").textContent=(x.date||"No date")+" · "+(scope==="trip"?(info.t?.name||"Trip memory"):"Our Memories");m.querySelector("#memoryViewerFav").textContent=x.favorite?"★":"☆";m.querySelector(".memory-viewer-head small").textContent=`MEMORY ${current+1} / ${list.length}`};
 const close=()=>{document.removeEventListener("keydown",keyHandler);m.remove()};const step=d=>{current=(current+d+list.length)%list.length;scale=1;apply()};const keyHandler=e=>{if(e.key==="Escape")close();if(e.key==="ArrowLeft")step(-1);if(e.key==="ArrowRight")step(1)};
 m.querySelector("#memoryViewerClose").onclick=close;m.querySelector(".memory-viewer-backdrop").onclick=close;m.querySelector("#memoryPrev").onclick=()=>step(-1);m.querySelector("#memoryNext").onclick=()=>step(1);
 m.querySelector("#memoryZoomIn").onclick=()=>{scale=Math.min(3,scale+.25);apply()};m.querySelector("#memoryZoomOut").onclick=()=>{scale=Math.max(.5,scale-.25);apply()};m.querySelector("#memoryZoomReset").onclick=()=>{scale=1;apply()};
 m.querySelector("#memoryViewerFav").onclick=()=>{cur().favorite=!cur().favorite;save();apply();toast(cur().favorite?"Added to favorites":"Removed from favorites")};
 m.querySelector("#memoryEdit").onclick=()=>editMemoryDetails(cur(),scope,info.t?.id||tripId,close);
 let down=0,downY=0,pinchStart=0,pinchScale=1;const stage=m.querySelector(".memory-viewer-stage");stage.addEventListener("pointerdown",e=>{down=e.clientX;downY=e.clientY;stage.setPointerCapture?.(e.pointerId)});stage.addEventListener("pointerup",e=>{const dx=e.clientX-down,dy=e.clientY-downY;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)&&scale===1)step(dx<0?1:-1)});stage.addEventListener("dblclick",()=>{scale=scale===1?2:1;apply()});stage.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)>0){e.preventDefault();scale=Math.max(.5,Math.min(3,scale+(e.deltaY<0?.15:-.15)));apply()}},{passive:false});
 document.addEventListener("keydown",keyHandler);
}
function editMemoryDetails(mem,scope="global",tripId="",closeViewer){
 const trips=db.trips||[],currentTrip=trips.find(t=>(t.memories||[]).some(x=>String(x.id)===String(mem.id))),tripOptions=[{value:"",label:"No linked trip"},...trips.map(t=>({value:String(t.id),label:t.name}))];
 openFormModal("Edit Memory Details",[
  {id:"caption",label:"Caption",type:"text",value:mem.caption||"",placeholder:"e.g. Our best day"},
  {id:"date",label:"Date",type:"date",value:mem.date||today()},
  {id:"tripId",label:"Trip",type:"select",options:tripOptions}
 ],vals=>{mem.caption=vals.caption.trim();mem.date=vals.date||today();if(scope==="global"&&vals.tripId&&vals.tripId!==String(currentTrip?.id||"")){const t=trips.find(x=>String(x.id)===String(vals.tripId));if(t){t.memories=t.memories||[];t.memories.push({...mem});db.memories=db.memories.filter(x=>String(x.id)!==String(mem.id))}}save();closeViewer?.();render();toast("Memory details updated ♡")});
 const sel=document.getElementById("mf_tripId");if(sel)sel.value=String(currentTrip?.id||"");
}
async function chooseTripMemory(tripId){const t=db.trips.find(x=>String(x.id)===String(tripId));if(!t)return;const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;input.onchange=async()=>{const files=[...(input.files||[])];if(!files.length)return;const caption=prompt("Caption for these photos (optional):","");try{for(const f of files){const data=await resizeImage(f,1400);t.memories=t.memories||[];t.memories.push({id:uid(),data,caption:(caption||"").trim(),date:today(),createdAt:new Date().toISOString()})}save();render();toast(files.length+" trip photo"+(files.length>1?"s":"")+" saved")}catch(e){console.error(e);toast("Photo could not be saved")}};input.click()}
function memoryCard(m){return `<article class="memory-card card" data-favorite-card="${m.favorite?"1":"0"}"><div class="memory-image" data-memory-open="${m.id}" data-memory-scope="global"><img src="${m.data}" alt="${esc(m.caption||"Memory")}"><button class="memory-star ${m.favorite?"on":""}" data-memory-favorite="${m.id}">${m.favorite?"★":"☆"}</button></div><div class="memory-info"><b>${esc(m.caption||"Beautiful moment")}</b><small>${m.date?new Date(m.date+"T00:00:00").toLocaleDateString():"No date"} ${m.location?"· "+esc(m.location):""}</small><button class="mini-btn danger-text" data-delete-memory="${m.id}">Delete</button></div></article>`}
async function chooseGlobalMemory(){
 const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;
 input.onchange=async()=>{const files=[...input.files];if(!files.length)return;let saved=0;
 for(const f of files){try{const data=await resizeImage(f,1400);const caption=prompt("Memory caption (optional)",f.name.replace(/\\.[^/.]+$/,""));const date=prompt("Memory date (YYYY-MM-DD)",today());db.memories.push({id:uid(),data,caption:caption||"",date:date||today(),favorite:false,createdAt:new Date().toISOString()});saved++}catch{}}
 save();toast(saved+" photo"+(saved===1?"":"s")+" saved");render()};input.click()
}
function history(a){
 const done=db.trips.filter(t=>t.finished);
 const detail=db.activeTripId?db.trips.find(t=>t.id===db.activeTripId&&t.finished):null;
 if(detail){a.innerHTML=shellHead("Journey Detail","Completed trip summary, route and spending.")+finishedTripDetail(detail);return}
 a.innerHTML=shellHead("Finished Journeys","Your completed trips stay here with routes, timestamps and expenses.")+(done.length?done.slice().reverse().map(tripMini).join(""):`<div class="card empty"><div class="big">◷</div>No finished journeys yet.</div>`);
 a.querySelectorAll("[data-open-history-trip]").forEach(btn=>btn.addEventListener("click",()=>{
  const trip=db.trips.find(t=>String(t.id)===String(btn.dataset.openHistoryTrip));
  if(!trip)return;
  db.activeTripId=trip.id;save();location.hash="history";
 }));
}
function finishedTripDetail(t){
 const cats=categorySummary(t), routeCount=t.stops.length, reached=t.stops.filter(s=>s.reached).length, spent=total(t);
 return `<div class="card panel">
  <div class="trip-detail-head"><div><span class="badge">Finished</span><h2>${esc(t.name)}</h2><p>${esc(t.destination||"")}${t.startDate?" · "+t.startDate:""}${t.endDate?" → "+t.endDate:""}</p></div><div class="actions"><a class="btn map-btn" href="${tripMapsUrl(t)}" target="_blank" rel="noopener">🗺️ Route</a><button class="btn secondary" id="backHistory">← History</button></div></div>
  <div class="history-hero-glow"></div><div class="history-summary">
   <div><small>STOPS</small><strong>${reached} / ${routeCount}</strong></div>
   <div><small>SPENT</small><strong>฿${money(spent)}</strong></div>
   <div><small>BUDGET</small><strong>฿${money(t.budget||0)}</strong></div>
   <div><small>REMAINING</small><strong>฿${money((Number(t.budget||0)-spent))}</strong></div>
  </div>
 </div>
 <div class="history-story-card card"><div class="history-story-cover">${t.cover?`<img src="${t.cover}" alt="${esc(t.name)}">`:`<div>✦</div>`}</div><div class="history-story-body"><div class="eyebrow">JOURNEY STORY</div><h3>${esc(t.destination||t.name)}</h3><p class="muted">Your completed route, memories and spending in one story.</p><div class="history-story-stats"><span><b>${(t.memories||[]).length}</b><small>PHOTOS</small></span><span><b>${routeCount}</b><small>STOPS</small></span><span><b>${reached}</b><small>REACHED</small></span><span><b>฿${money(spent)}</b><small>SPENT</small></span></div></div></div> </div>
 <div class="history-moments-card card"><div class="section-title"><div><div class="eyebrow">MEMORY VAULT</div><h2>Moments From This Journey</h2></div><span class="trip-story-count">${(t.memories||[]).length} photos</span></div><div class="history-moments-strip">${(t.memories||[]).length?(t.memories||[]).slice().reverse().map(m=>`<button class="history-moment" data-memory-open="${m.id}" data-memory-scope="trip" data-trip-id="${t.id}" type="button"><img src="${m.data}" alt=""><span>${esc(m.caption||"Journey moment")}</span></button>`).join(""):`<div class="empty">No photos saved for this journey yet.</div>`}</div></div>
 <div class="section-title"><h2>Route Timeline</h2></div>
 <div class="timeline history-timeline">${t.stops.length?t.stops.map((s,i)=>`<div class="stop route-stop stop-${stopStatus(s,true).key}"><div class="stop-dot"></div><div><div class="stop-top"><span class="stop-number">${i+1}</span><h4>${esc(s.name)}</h4><span class="stop-status-badge completed">✓ Completed</span></div><small>${s.date||"No planned date"} ${s.time||""}${s.reached?" · Reached "+new Date(s.reachedAt).toLocaleString():""}${s.completed?" · Completed "+new Date(s.completedAt).toLocaleString():""}</small>${stopStatusSteps(s,true)}${s.note?`<p class="muted">${esc(s.note)}</p>`:""}${Number(s.price||0)?`<div class="stop-price">Place / Stop Price: <strong>฿${money(s.price)}</strong></div>`:""}<div class="route-legs">${(s.legs||[]).map((l,j)=>`<div class="route-leg"><span class="leg-index">${j+1}</span><div class="leg-main"><b>${esc(l.from)} → ${esc(l.to)}</b><small>${esc(l.vehicle||"Transport")}${l.note?" · "+esc(l.note):""}</small></div><strong>฿${money(l.price)}</strong></div>`).join("")}</div></div></div>`).join(""):`<div class="empty">No route stops saved.</div>`}</div>
 <div class="section-title"><h2>Expenses</h2></div>
 <div class="split"><div class="card panel"><div class="muted">Total Spent</div><div class="total">฿${money(spent)}</div></div><div class="card panel"><div class="muted">Categories</div><p class="muted" style="line-height:1.8">${cats}</p></div></div>
 <div class="expense-list">${t.expenses.length?t.expenses.map(e=>`<div class="expense"><div><b>${esc(e.category)}</b><small>${e.date||""}${e.note?" · "+esc(e.note):""}</small></div><strong>฿${money(e.amount)}</strong></div>`).join(""):`<div class="empty">No expenses recorded.</div>`}</div>
 <div class="section-title trip-memory-head"><h2>Trip Memories</h2><button class="btn secondary" data-add-trip-memory="${t.id}">+ Add Photo</button></div><div class="trip-memory-grid">${(t.memories||[]).length?(t.memories||[]).map(m=>tripMemoryCard(m,t.id)).join(""):`<div class="card empty"><div class="big">📸</div><b>No trip photos yet</b><p>Add photos to keep this journey together.</p></div>`}</div>
 <div class="actions history-detail-actions"><button class="btn secondary" data-edit-history-trip="${t.id}">Edit Trip</button><button class="btn danger" data-delete-history-trip="${t.id}">Delete Trip</button></div>`;
}
function settings(a){
 const p=db.profile;
 a.innerHTML=shellHead("Settings","Private, simple and stored on this device.")+`<div class="settings-command-hero"><div><div class="eyebrow">PRIVATE CONTROL CENTER</div><h2>Our Love Journey</h2><p>Everything stays on this device.</p></div><div class="settings-orb">🔐</div></div>`+`<div class="card panel"><h2>Couple Profile</h2><div class="form-grid"><div class="field"><label>First name</label><input id="sn1" value="${esc(p.name1)}"></div><div class="field"><label>Second name</label><input id="sn2" value="${esc(p.name2)}"></div><div class="field"><label>Anniversary date</label><input id="sd2" type="date" value="${esc(p.startDate)}"></div></div><div class="actions"><button class="btn" id="saveSet">Save Changes</button></div></div>
 <div class="card panel"><h2>Reminders</h2><p class="muted">Anniversary နီးလာတာနဲ့ Trip စတော့မယ့်ရက်ကို app ဖွင့်ထားတဲ့အချိန်မှာ notification ပြပေးနိုင်ပါတယ်။</p><div class="actions"><button class="btn secondary" id="enableRemindersBtn" type="button">🔔 Enable Reminders</button></div></div>
 <div class="card panel"><h2>Install App</h2><p class="muted">Install Our Love Journey on your phone for a full-screen app experience.</p><div class="actions"><button class="btn install-app-btn" id="installAppBtn" type="button">⬇ Install Our Love Journey</button></div></div>
 <div class="card panel"><h2>Data Safety</h2><p class="muted">Your journey is stored only on this device. Keep a backup before changing phones or clearing browser data.</p><div id="storageHealth" class="storage-health"><div class="muted">Checking storage…</div></div><div class="actions"><button class="btn secondary" id="protectStorage" type="button">🛡 Protect Storage</button></div></div>
 <div class="card panel"><h2>Data</h2><p class="muted">Your data is stored in this browser using local storage. No Gmail, account or server connection is required.</p><div class="actions"><button class="btn secondary" id="export">Export Backup</button><label class="btn secondary" style="display:inline-flex;align-items:center"><input id="import" type="file" accept=".json" hidden>Import Backup</label><button class="btn danger" id="clear">Clear All Data</button></div></div>`;
 document.getElementById("saveSet").onclick=()=>{db.profile.name1=document.getElementById("sn1").value.trim();db.profile.name2=document.getElementById("sn2").value.trim();db.profile.startDate=document.getElementById("sd2").value;save();toast("Settings saved");render()}
document.getElementById("installAppBtn")?.addEventListener("click",installApp);document.getElementById("enableRemindersBtn")?.addEventListener("click",enableReminders);document.getElementById("protectStorage")?.addEventListener("click",requestPersistentStorage);updateStorageHealth();
 document.getElementById("export").onclick=exportBackup
 document.getElementById("import").onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>12*1024*1024){toast("Backup file is too large");e.target.value="";return}const r=new FileReader();r.onload=()=>{try{const raw=JSON.parse(r.result),incoming=raw?.data||raw;if(!incoming||typeof incoming!=="object"||Array.isArray(incoming))throw new Error("shape");if(raw?.app&&raw.app!=="Our Love Journey")throw new Error("app");if(raw?.version&&Number(raw.version)>2)throw new Error("version");const checked=normalizeData(incoming);const trips=checked.trips.length,photos=(checked.memories||[]).length+checked.trips.reduce((n,t)=>n+(t.memories||[]).length+(t.stops||[]).reduce((s,x)=>s+(x.memories?.length||0),0),0);if(!confirm("Import this backup and replace the current data?\\n\\n"+trips+" trip(s) · "+photos+" photo(s)"))return;db=checked;if(save()){toast("Backup imported ♡");render()}}catch(err){console.error(err);toast("Invalid or incompatible backup file")}finally{e.target.value=""}};r.readAsText(f)}
 document.getElementById("clear").onclick=()=>{if(!confirm("Clear ALL Love Journey data from this device?\\n\\nExport a backup first if you may need it later."))return;const old=localStorage.getItem(KEY);try{db=normalizeData(structuredClone(blank));localStorage.setItem(KEY,JSON.stringify(db));render();toast("All data cleared")}catch(err){if(old)try{db=normalizeData(JSON.parse(old))}catch{}toast("Could not clear data")}}
}
function today(){return new Date().toISOString().slice(0,10)}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function resizeImage(file,max){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.78))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
async function ensureLeaflet(){if(window.L){return true}if(!document.getElementById("leaflet-css")){const l=document.createElement("link");l.id="leaflet-css";l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l)}return await new Promise(resolve=>{const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s)})}
async function openTripMap(t){const ok=await ensureLeaflet();if(!ok){toast("Map library could not load");return}const stops=(t.stops||[]).filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));const m=document.createElement("div");m.id="tripMapModal";m.className="modal-backdrop";m.innerHTML=`<div class="modal-card trip-map-modal"><button class="modal-close" id="tripMapClose">×</button><div class="eyebrow">TRIP MAP</div><h2>${esc(t.name)}</h2><p class="muted">Saved locations, route order and stop numbers.</p><div class="trip-map-toolbar"><span>${stops.length}/${(t.stops||[]).length} stops pinned</span><button class="btn secondary" id="tripMapFit">Fit Route</button></div><div id="tripMapCanvas"></div><div class="trip-map-legend"><span>● Planned</span><span>● Reached</span><span>✓ Completed</span></div></div>`;document.body.appendChild(m);const close=()=>m.remove();document.getElementById("tripMapClose").onclick=close;const center=stops.length?[stops[0].lat,stops[0].lng]:[12.9236,100.8825];const map=L.map("tripMapCanvas").setView(center,stops.length?13:12);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);const pts=[];stops.forEach((s,i)=>{const st=stopStatus(s,t.finished);const icon=L.divIcon({className:"trip-map-marker-wrap",html:`<span class="trip-map-marker ${st.key}">${i+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]});const mk=L.marker([Number(s.lat),Number(s.lng)],{icon}).addTo(map);mk.bindPopup(`<div class="trip-map-popup"><b>${esc(s.name)}</b><small>Stop ${i+1} · ${esc(st.label)}</small>${s.date?`<small>${esc(s.date)}${s.time?" · "+esc(s.time):""}</small>`:""}<a href="${mapsSearchUrl(s)}" target="_blank" rel="noopener">Open in Google Maps</a></div>`);pts.push([Number(s.lat),Number(s.lng)])});if(pts.length>1)L.polyline(pts,{color:"#39eaff",weight:4,opacity:.8,dashArray:"8 7"}).addTo(map);const fit=()=>{if(pts.length)map.fitBounds(L.latLngBounds(pts),{padding:[28,28],maxZoom:16});else map.setView(center,12)};document.getElementById("tripMapFit").onclick=fit;map.on("click",()=>{});setTimeout(()=>{map.invalidateSize();fit()},80);const modalEl=document.getElementById("tripMapModal");if(modalEl){modalEl.addEventListener("click",e=>{if(e.target===modalEl)close()});}window.addEventListener("resize",()=>map.invalidateSize(),{passive:true})}
function nominatimJsonp(query,extra={}){
 return new Promise((resolve,reject)=>{
  const cb="oljn_"+Date.now()+"_"+Math.random().toString(36).slice(2);
  const s=document.createElement("script");
  const u=new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q",query);u.searchParams.set("format","jsonv2");u.searchParams.set("json_callback",cb);
  u.searchParams.set("limit","8");u.searchParams.set("countrycodes","th");u.searchParams.set("layer","address,poi");
  u.searchParams.set("addressdetails","1");u.searchParams.set("accept-language","en,th");
  Object.entries(extra).forEach(([k,v])=>{if(v!==undefined&&v!==null&&String(v)!=="")u.searchParams.set(k,v)});
  let done=false;
  const finish=(ok,val)=>{if(done)return;done=true;clearTimeout(timer);delete window[cb];s.remove();ok?resolve(val):reject(val)};
  const timer=setTimeout(()=>finish(false,new Error("timeout")),8000);
  window[cb]=data=>finish(true,Array.isArray(data)?data:[]);
  s.onerror=()=>finish(false,new Error("network"));
  s.src=u.toString();document.head.appendChild(s);
 });
}
async function openMapPicker(initialLat=null,initialLng=null,initialName=""){const ok=await ensureLeaflet();if(!ok){toast("Map library could not load");return null}return await new Promise(resolve=>{const m=document.createElement("div");m.id="mapPickerModal";m.className="modal-backdrop";m.innerHTML=`<div class="modal-card map-picker-modal"><button class="modal-close" id="mapPickerClose">×</button><div class="eyebrow">MAP LOCATION</div><h2>Choose a place on Map</h2><p class="muted">Search a place or tap the map. Your pin will be saved in this browser.</p><div class="map-picker-search"><input id="mapSearchInput" value="${esc(initialName)}" placeholder="Search Pattaya, Bangkok, hotel, station..."><button class="btn secondary" id="mapSearchBtn" type="button">Search</button></div><div class="map-quick"><button class="btn secondary" data-city="Pattaya">📍 Pattaya</button><button class="btn secondary" data-city="Bangkok">📍 Bangkok</button><button class="btn secondary" data-city="Chiang Mai">📍 Chiang Mai</button><button class="btn secondary" data-city="Phuket">📍 Phuket</button></div><div id="mapSearchResults" class="map-search-results"></div><div id="mapPickerMap"></div><div class="map-picker-selected" id="mapPickerSelected">No location selected</div><div class="actions"><button class="btn" id="mapPickerSave">Use This Location</button><button class="btn secondary" id="mapPickerCancel">Cancel</button></div></div>`;document.body.appendChild(m);let map,marker,selected=Number.isFinite(Number(initialLat))&&Number.isFinite(Number(initialLng))?{lat:Number(initialLat),lng:Number(initialLng)}:null;const THAILAND_CENTER=[12.9236,100.8825];map=L.map("mapPickerMap",{preferCanvas:true}).setView(selected?[selected.lat,selected.lng]:THAILAND_CENTER,selected?16:11);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,detectRetina:true,updateWhenIdle:false,keepBuffer:4,attribution:"© OpenStreetMap contributors"}).addTo(map);const show=()=>{const el=document.getElementById("mapPickerSelected");if(el)el.textContent=selected?"Selected: "+selected.lat.toFixed(6)+", "+selected.lng.toFixed(6):"No location selected"};const put=(latlng,name="")=>{selected={lat:Number(latlng.lat),lng:Number(latlng.lng)};if(marker)marker.setLatLng(latlng);else{marker=L.marker(latlng,{draggable:true}).addTo(map);marker.on("dragend",()=>{const p=marker.getLatLng();selected={lat:p.lat,lng:p.lng};show()})}if(name){const input=document.getElementById("mapSearchInput");if(input)input.value=name}show()};if(selected)put(selected);map.on("click",e=>put(e.latlng));const clearResults=()=>{const box=document.getElementById("mapSearchResults");if(box)box.innerHTML=""};const showResults=(results,q)=>{const box=document.getElementById("mapSearchResults");if(!box)return;box.innerHTML=results.slice(0,6).map((r,i)=>{const label=String(r.display_name||q);return `<button type="button" class="map-search-result" data-result="${i}"><b>${esc(label.split(",").slice(0,2).join(", "))}</b><small>${esc(label)}</small></button>`}).join("");box.querySelectorAll("[data-result]").forEach(btn=>btn.onclick=()=>{const r=results[Number(btn.dataset.result)],p={lat:Number(r.lat),lng:Number(r.lon)};if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;map.setView([p.lat,p.lng],17);put(p,r.display_name||q);clearResults()})};const search=async(customQuery=null)=>{
 const input=document.getElementById("mapSearchInput"),btn=document.getElementById("mapSearchBtn"),box=document.getElementById("mapSearchResults");
 const q=String(customQuery||input?.value||"").trim();if(!q){toast("နေရာအမည် ထည့်ပါ");return}
 if(input&&!customQuery)input.value=q;
 if(btn){btn.disabled=true;btn.textContent="Searching…";btn.setAttribute("aria-busy","true")}
 if(box)box.innerHTML='<div class="map-search-state">🔎 <b>Searching Thailand…</b><small>နေရာကိုရှာနေပါတယ်။ ခဏစောင့်ပါ။</small></div>';
 try{
   let results=[];
   const queries=[q,q+", Thailand"];
   for(const term of queries){
     try{
       results=await nominatimJsonp(term,{viewbox:"97,21.5,106,5",bounded:"0"});
       if(results.length)break;
     }catch(err){console.warn("Nominatim search",term,err)}
   }
   if(!results.length){
     if(box)box.innerHTML='<div class="map-search-state no-result"><b>နေရာမတွေ့ပါ</b><small>အမည်ကို English/Thai နဲ့ အနည်းငယ်တိုအောင် ပြန်ရှာပါ။</small><a class="btn secondary" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q+" Thailand")+'" target="_blank" rel="noopener">Open Google Maps Search</a></div>';
     return;
   }
   showResults(results,q);
   const p={lat:Number(results[0].lat),lng:Number(results[0].lon)};
   if(Number.isFinite(p.lat)&&Number.isFinite(p.lng)){map.setView([p.lat,p.lng],17);put(p,results[0].display_name||q)}
 }catch(err){
   console.error("Map search error",err);
   if(box)box.innerHTML='<div class="map-search-state no-result"><b>Search connection failed</b><small>Internet connection ကိုစစ်ပြီး Retry လုပ်ပါ။</small><button type="button" class="btn secondary" id="mapSearchRetry">Retry Search</button></div>';
   document.getElementById("mapSearchRetry")?.addEventListener("click",()=>search(q),{once:true});
 }finally{
   if(btn){btn.disabled=false;btn.textContent="Search";btn.removeAttribute("aria-busy")}
 }
};document.getElementById("mapSearchBtn").onclick=()=>search();document.querySelectorAll("[data-city]").forEach(b=>b.onclick=()=>search(b.dataset.city));const thailandBtn=document.createElement("button");thailandBtn.className="btn secondary";thailandBtn.type="button";thailandBtn.textContent="🇹🇭 Thailand";thailandBtn.onclick=()=>{selected=null;map.setView(THAILAND_CENTER,11);marker?.remove();marker=null;document.getElementById("mapSearchInput").value="";clearResults();show()};document.querySelector(".map-picker-search")?.appendChild(thailandBtn);const locateBtn=document.createElement("button");locateBtn.className="btn secondary";locateBtn.type="button";locateBtn.textContent="📍 My Location";locateBtn.onclick=()=>{if(!navigator.geolocation)return toast("Location is not available");navigator.geolocation.getCurrentPosition(p=>{const x={lat:p.coords.latitude,lng:p.coords.longitude};if(x.lat<5||x.lat>21.5||x.lng<97||x.lng>106){toast("📍 Location is outside Thailand.");map.setView(THAILAND_CENTER,11);return}map.setView([x.lat,x.lng],16);put(x,"My Location")},()=>toast("Location permission was not granted"),{enableHighAccuracy:true,timeout:10000,maximumAge:30000})};document.querySelector(".map-picker-search")?.appendChild(locateBtn);document.getElementById("mapSearchInput").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();search()}};const close=v=>{m.remove();resolve(v)};document.getElementById("mapPickerClose").onclick=()=>close(null);document.getElementById("mapPickerCancel").onclick=()=>close(null);document.getElementById("mapPickerSave").onclick=()=>selected?close(selected):toast("Choose a location first");setTimeout(()=>map.invalidateSize(),150)})}
function openFormModal(title,fields,onSave){document.getElementById("formModal")?.remove();const m=document.createElement("div");m.id="formModal";m.className="modal-backdrop";m.innerHTML=`<div class="modal-card"><button class="modal-close" id="modalClose">×</button><div class="eyebrow">QUICK ENTRY</div><h2>${title}</h2><div class="modal-fields">${fields.map(f=>f.type==="hidden"?`<input id="mf_${f.id}" type="hidden" value="${esc(f.value||"")}">`:f.type==="select"?`<div class="field"><label>${f.label}</label><select id="mf_${f.id}">${f.options.map(o=>{const v=typeof o==="object"?o.value:o;const l=typeof o==="object"?o.label:o;return `<option value="${esc(v)}">${esc(l)}</option>`}).join("")}</select></div>`:`<div class="field"><label>${f.label}</label><input id="mf_${f.id}" type="${f.type}" value="${esc(f.value||"")}" placeholder="${esc(f.placeholder||"")}"></div>`).join("")}</div><div class="actions"><button class="btn" id="modalSave">Save</button><button class="btn secondary" id="modalCancel">Cancel</button></div></div>`;document.body.appendChild(m);const close=()=>m.remove();m.querySelector("#modalClose").onclick=close;m.querySelector("#modalCancel").onclick=close;m.querySelector("#modalSave").onclick=()=>{const vals={};fields.forEach(f=>vals[f.id]=document.getElementById("mf_"+f.id).value);onSave(vals);if(document.body.contains(m))m.remove()}}
document.addEventListener("click",e=>{
 const tripMap=e.target.closest("[data-trip-map]");if(tripMap){const t=db.trips.find(x=>x.id===db.activeTripId);if(t)openTripMap(t);return}

 const stopDetail=e.target.closest("[data-stop-detail]");if(stopDetail){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>String(x.id)===String(stopDetail.dataset.stopDetail));if(t&&s)openStopDetail(t,s);return}
 const memOpen=e.target.closest("[data-memory-open]");if(memOpen){memoryViewer(memOpen.dataset.memoryOpen,memOpen.dataset.memoryScope||"global",memOpen.dataset.tripId||"");return}
 const mf=e.target.closest("[data-memory-filter]");if(mf){document.querySelectorAll("[data-memory-filter]").forEach(x=>x.classList.remove("active"));mf.classList.add("active");const type=mf.dataset.memoryFilter;document.querySelectorAll("[data-favorite-card]").forEach(x=>x.style.display=(type==="favorite"&&x.dataset.favoriteCard!=="1")?"none":"");return}
 const fav=e.target.closest("[data-memory-favorite]");if(fav){const m=db.memories.find(x=>x.id===fav.dataset.memoryFavorite);if(m){m.favorite=!m.favorite;save();render()};return}
 const delm=e.target.closest("[data-delete-memory]");if(delm){if(confirm("Delete this memory photo?")){const id=delm.dataset.deleteMemory;if(id){db.memories=db.memories.filter(x=>String(x.id)!==String(id));save();render();toast("Memory deleted")}}return}

 const delSpecial=e.target.closest("[data-delete-special]");
 if(delSpecial){if(confirm("Delete this special day?")){db.specialDays=db.specialDays.filter(x=>x.id!==delSpecial.dataset.deleteSpecial);save();render();toast("Special day deleted")}return}
 const editSpecial=e.target.closest("[data-edit-special]");
 if(editSpecial){const s=db.specialDays.find(x=>String(x.id)===String(editSpecial.dataset.editSpecial));if(!s)return;openFormModal("Edit Special Day",[
  {id:"title",label:"Title",type:"text",value:s.title},
  {id:"type",label:"Type",type:"select",options:["Anniversary","Birthday","First Meet","First Date","First Trip","Custom"]},
  {id:"date",label:"Date",type:"date",value:s.date||today()},
  {id:"tripId",label:"Related Trip",type:"select",options:[{value:"",label:"No related trip"},...db.trips.map(t=>({value:String(t.id),label:t.name}))]},
  {id:"note",label:"Note",type:"text",value:s.note||"",placeholder:"Optional note"}
 ],vals=>{if(!vals.title.trim())return toast("Title is required");s.title=vals.title.trim();s.type=vals.type;s.date=vals.date;s.tripId=vals.tripId;s.note=vals.note.trim();save();render();toast("Special day updated")});const sel=document.getElementById("mf_type");if(sel)sel.value=s.type||"Custom";const tripSel=document.getElementById("mf_tripId");if(tripSel)tripSel.value=s.tripId||"";return}
 if(e.target.id==="addSpecial"){openFormModal("Add Special Day",[
  {id:"title",label:"Title",type:"text",placeholder:"e.g. Our First Date"},
  {id:"type",label:"Type",type:"select",options:["Anniversary","Birthday","First Meet","First Date","First Trip","Custom"]},
  {id:"date",label:"Date",type:"date",value:today()},
  {id:"tripId",label:"Related Trip",type:"select",options:[{value:"",label:"No related trip"},...db.trips.map(t=>({value:String(t.id),label:t.name}))]},
  {id:"note",label:"Note",type:"text",placeholder:"Optional note"}
 ],vals=>{if(!vals.title.trim())return toast("Title is required");db.specialDays.push({id:uid(),title:vals.title.trim(),type:vals.type,date:vals.date,tripId:vals.tripId,note:vals.note.trim(),createdAt:new Date().toISOString()});save();render();toast("Special day saved")});return}

 const relatedTrip=e.target.closest("[data-open-related-trip]");if(relatedTrip){const trip=db.trips.find(t=>String(t.id)===String(relatedTrip.dataset.openRelatedTrip));if(!trip)return;db.activeTripId=trip.id;save();go(trip.finished?"history":"travel");return}
 const pg=e.target.closest("[data-page]");if(pg){go(pg.dataset.page);return}
 if(e.target.id==="backHistory"){db.activeTripId=null;save();render();return}
 const editHistory=e.target.closest("[data-edit-history-trip]");
 if(editHistory){
  const t=db.trips.find(x=>String(x.id)===String(editHistory.dataset.editHistoryTrip));if(!t)return;
  openFormModal("Edit Finished Trip",[
   {id:"tripName",label:"Trip name",type:"text",value:t.name},
   {id:"dest",label:"Destination",type:"text",value:t.destination||""},
   {id:"sd",label:"Start date",type:"date",value:t.startDate||""},
   {id:"ed",label:"End date",type:"date",value:t.endDate||""},
   {id:"budget",label:"Trip Budget (THB)",type:"number",value:t.budget>0?String(t.budget):""}
  ],vals=>{
   if(!vals.tripName.trim())return toast("Trip name is required");
   const budget=Number(vals.budget);if(budget<0||Number.isNaN(budget))return toast("Enter a valid budget");
   t.name=vals.tripName.trim();t.destination=vals.dest.trim();t.startDate=vals.sd;t.endDate=vals.ed;t.budget=budget;
   save();render();toast("Finished trip updated");
  });
  return;
 }
 const deleteHistory=e.target.closest("[data-delete-history-trip]");
 if(deleteHistory){
  const tripId=deleteHistory.dataset.deleteHistoryTrip;
  const t=db.trips.find(x=>String(x.id)===String(tripId));if(!t)return;
  if(confirm("Delete this finished trip and all its routes, transport steps, expenses and memories?")){
   db.trips=db.trips.filter(x=>String(x.id)!==String(tripId));
   save();render();toast("Finished trip deleted");
  }
  return;
 }
 const openHistory=e.target.closest("[data-open-history-trip]");if(openHistory){const trip=db.trips.find(t=>String(t.id)===String(openHistory.dataset.openHistoryTrip));if(!trip)return;db.activeTripId=trip.id;save();go("history");return}
 const open=e.target.closest("[data-open-trip]");if(open){const trip=db.trips.find(t=>String(t.id)===String(open.dataset.openTrip));if(!trip)return;db.activeTripId=trip.id;save();const target=trip.finished?"history":"travel";if(pageName()===target){render()}else{go(target)}return}
 const exportTrip=e.target.closest("[data-export-trip]");if(exportTrip){const t=db.trips.find(x=>String(x.id)===String(exportTrip.dataset.exportTrip));if(t){const blob=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=(t.name||"trip").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"")+".json";a.click();setTimeout(()=>URL.revokeObjectURL(u),500);toast("Trip backup exported")}return}
 const tripCover=e.target.closest("[data-trip-cover]");
 if(tripCover){const t=db.trips.find(x=>String(x.id)===String(tripCover.dataset.tripCover));if(!t)return;const input=document.createElement("input");input.type="file";input.accept="image/*";input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{t.cover=await resizeImage(f,1600);save();render();toast("Trip cover saved ♡")}catch{toast("Cover photo could not be saved")}};input.click();return}
 const addTripMemory=e.target.closest("[data-add-trip-memory]");if(addTripMemory){chooseTripMemory(addTripMemory.dataset.addTripMemory);return}
 const delTripMemory=e.target.closest("[data-delete-trip-memory]");if(delTripMemory){const t=db.trips.find(x=>String(x.id)===String(delTripMemory.dataset.deleteTripMemory));if(t&&confirm("Delete this trip photo?")){t.memories=(t.memories||[]).filter(m=>String(m.id)!==String(delTripMemory.dataset.memoryId));save();render();toast("Trip photo deleted")}return}
 const editLeg=e.target.closest("[data-edit-leg]");
 if(editLeg){
  const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>String(x.id)===String(editLeg.dataset.editLeg)),leg=s?.legs?.find(x=>String(x.id)===String(editLeg.dataset.legId));if(!leg)return;
  openFormModal("Edit Transport Step",[
   {id:"from",label:"From",type:"text",value:leg.from||"",placeholder:"e.g. Pattaya Bus Station"},
   {id:"to",label:"To",type:"text",value:leg.to||"",placeholder:"e.g. Bangkok Bus Station"},
   {id:"vehicle",label:"Transport",type:"select",options:["Bus","Minivan","Taxi","Grab","Motorbike Taxi","Train","BTS","MRT","Boat","Flight","Walk","Other"]},
   {id:"price",label:"Price (THB)",type:"number",value:leg.price>0?String(leg.price):"",placeholder:"e.g. 160"},
   {id:"note",label:"Note",type:"text",value:leg.note||"",placeholder:"Optional"}
  ],vals=>{
   const price=Number(vals.price);if(!vals.from.trim()||!vals.to.trim())return toast("Enter From and To");if(!Number.isFinite(price)||price<0)return toast("Enter a valid price");
   leg.from=vals.from.trim();leg.to=vals.to.trim();leg.vehicle=vals.vehicle;leg.price=price;leg.note=vals.note.trim();
   save();render();toast("Transport step updated");
  });
  const sel=document.getElementById("mf_vehicle");if(sel)sel.value=leg.vehicle||"Other";
  return;
 }
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
  {id:"transportMode",label:"How will you travel?",type:"select",options:["","Car","Motorcycle","Bus","Minivan","Taxi","Train","Boat","BTS","MRT","Flight","Walk","Other"]},
  {id:"stopNote",label:"Note",type:"text",value:s.note||"",placeholder:"Optional note"},
  {id:"stopPrice",label:"Place / Stop Price (THB)",type:"number",value:s.price>0?String(s.price):"",placeholder:"e.g. 50"},
  {id:"mapLat",type:"hidden",value:s.lat??""},{id:"mapLng",type:"hidden",value:s.lng??""}
 ],vals=>{if(!vals.stopName.trim())return toast("Place name is required");const price=Number(vals.stopPrice);if(price<0||Number.isNaN(price))return toast("Enter a valid price");s.name=vals.stopName.trim();s.date=vals.stopDate;s.time=vals.stopTime;s.transportMode=vals.transportMode;s.note=vals.stopNote.trim();s.price=price;s.lat=vals.mapLat?Number(vals.mapLat):null;s.lng=vals.mapLng?Number(vals.mapLng):null;save();render();toast("Route stop updated")});
 const tm=document.getElementById("mf_transportMode");if(tm)tm.value=s.transportMode||"";const mapBox=document.querySelector("#formModal .actions");if(mapBox){const b=document.createElement("button");b.className="btn secondary map-picker-trigger";b.type="button";b.textContent=s.lat!=null&&s.lng!=null?"📍 Change Map Location":"📍 Pick Location on Map";b.onclick=async()=>{const p=await openMapPicker(s.lat,s.lng,s.name);if(p){document.getElementById("mf_mapLat").value=p.lat;document.getElementById("mf_mapLng").value=p.lng;b.textContent="📍 Location Selected";toast("Map location selected")}};mapBox.insertBefore(b,mapBox.firstChild)}return}
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
 const editExpense=e.target.closest("[data-edit-expense]");
 if(editExpense){
  const t=db.trips.find(x=>x.id===db.activeTripId),ex=t?.expenses.find(x=>String(x.id)===String(editExpense.dataset.editExpense));if(!ex)return;
  openFormModal("Edit Expense",[
   {id:"category",label:"Category",type:"select",options:["Transportation","Fuel","Food","Hotel","Tickets","Souvenir / Shopping","Other"]},
   {id:"amount",label:"Amount (THB)",type:"number",value:ex.amount>0?String(ex.amount):"",placeholder:"e.g. 250"},
   {id:"date",label:"Date",type:"date",value:ex.date||today()},
   {id:"note",label:"Note",type:"text",value:ex.note||"",placeholder:"Optional note"}
  ],vals=>{
   const amount=Number(vals.amount);if(!Number.isFinite(amount)||amount<=0)return toast("Enter a valid amount");
   ex.category=vals.category;ex.amount=amount;ex.date=vals.date;ex.note=vals.note.trim();
   save();render();toast("Expense updated");
  });
  const sel=document.getElementById("mf_category");if(sel)sel.value=ex.category;
  return;
 }
 const deleteExpense=e.target.closest("[data-delete-expense]");
 if(deleteExpense){
  const t=db.trips.find(x=>x.id===db.activeTripId),ex=t?.expenses.find(x=>String(x.id)===String(deleteExpense.dataset.deleteExpense));if(!ex)return;
  if(confirm("Delete this expense?")){t.expenses=t.expenses.filter(x=>String(x.id)!==String(ex.id));save();render();toast("Expense deleted")}
  return;
 }
 const reach=e.target.closest("[data-reach]");if(reach){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>x.id===reach.dataset.reach);if(!s)return;s.reached=true;s.reachedAt=new Date().toISOString();s.completed=false;s.completedAt=null;save();render();toast("Stop marked Reached");return}
 const completeStop=e.target.closest("[data-complete-stop]");if(completeStop){const t=db.trips.find(x=>x.id===db.activeTripId),s=t?.stops.find(x=>x.id===completeStop.dataset.completeStop);if(!s||!s.reached)return;s.completed=true;s.completedAt=new Date().toISOString();save();render();toast("Stop completed");return}
 if(e.target.id==="createTrip"){const n=document.getElementById("tripName").value.trim();if(!n)return toast("Enter a trip name");const t={id:crypto.randomUUID(),name:n,cover:"",destination:document.getElementById("dest").value.trim(),startDate:document.getElementById("sd").value,endDate:document.getElementById("ed").value,budget:Math.max(0,Number(document.getElementById("tripBudget")?.value||0)),stops:[],expenses:[],memories:[],finished:false,createdAt:new Date().toISOString()};db.trips.push(t);db.activeTripId=t.id;save();render();toast("Trip created")}
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
 if(e.target.id==="addStop"){openFormModal("Add Route Stop",[
 {id:"stopName",label:"Place / stop name",type:"text",placeholder:"e.g. Terminal 21"},
 {id:"stopDate",label:"Planned date",type:"date",value:""},
 {id:"stopTime",label:"Planned time",type:"time",value:""},
 {id:"transportMode",label:"How will you travel?",type:"select",options:["","Car","Motorcycle","Bus","Minivan","Taxi","Train","Boat","BTS","MRT","Flight","Walk","Other"]},
 {id:"stopNote",label:"Note",type:"text",placeholder:"Optional note"},
 {id:"stopPrice",label:"Place / Stop Price (THB)",type:"number",placeholder:"e.g. 50"},
 {id:"mapLat",type:"hidden",value:""},{id:"mapLng",type:"hidden",value:""}
 ],vals=>{const t=db.trips.find(x=>x.id===db.activeTripId);if(!vals.stopName.trim())return toast("Place name is required");const price=Number(vals.stopPrice||0);if(price<0||Number.isNaN(price))return toast("Enter a valid price");t.stops.push({id:crypto.randomUUID(),name:vals.stopName.trim(),date:vals.stopDate,time:vals.stopTime,transportMode:vals.transportMode,note:vals.stopNote.trim(),price,lat:vals.mapLat?Number(vals.mapLat):null,lng:vals.mapLng?Number(vals.mapLng):null,reached:false,reachedAt:null,completed:false,completedAt:null,legs:[]});save();render();toast("Route stop added")});
 const mapBox=document.querySelector("#formModal .actions");if(mapBox){const btn=document.createElement("button");btn.className="btn secondary map-picker-trigger";btn.type="button";btn.textContent="📍 Pick Location on Map";btn.onclick=async()=>{const p=await openMapPicker(document.getElementById("mf_mapLat").value,document.getElementById("mf_mapLng").value,document.getElementById("mf_stopName").value);if(p){document.getElementById("mf_mapLat").value=p.lat;document.getElementById("mf_mapLng").value=p.lng;btn.textContent="📍 Location Selected";toast("Map location selected")}};mapBox.insertBefore(btn,mapBox.firstChild)}return}
 if(e.target.id==="addExpense"){openFormModal("Add Expense",[{id:"category",label:"Category",type:"select",options:["Transportation","Fuel","Food","Hotel","Tickets","Souvenir / Shopping","Other"]},{id:"amount",label:"Amount (THB)",type:"number",placeholder:"0"},{id:"date",label:"Date",type:"date",value:new Date().toISOString().slice(0,10)},{id:"note",label:"Note",type:"text",placeholder:"e.g. Lunch"}],vals=>{const t=db.trips.find(x=>x.id===db.activeTripId),amount=Number(vals.amount);if(!amount||amount<0)return toast("Enter a valid amount");t.expenses.push({id:crypto.randomUUID(),category:vals.category,amount,date:vals.date,note:vals.note.trim()});save();render();toast("Expense saved")})}
 if(e.target.id==="finishTrip"){const t=db.trips.find(x=>x.id===db.activeTripId);if(confirm("Finish this journey and archive it?")){t.finished=true;t.finishedAt=new Date().toISOString();db.activeTripId=null;save();go("history");toast("Journey archived")}}
});
window.addEventListener("hashchange",render);render();
// PWA install helper
let deferredInstallPrompt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e});window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;toast("Installed ♡")});async function installApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null}else toast("Chrome ⋮ → Add to Home screen")}
