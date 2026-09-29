/* Our Love Journey hotfix: Next Stop + Open button */
(function(){
  function esc2(s){return String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  function icon2(mode){const m=String(mode||"").toLowerCase();return m==="car"?"🚗":m==="motorcycle"?"🏍️":m==="train"?"🚆":m==="boat"?"⛴️":m==="bus"?"🚌":m==="minivan"?"🚐":m==="taxi"?"🚕":m==="flight"?"✈️":m==="bts"||m==="mrt"?"🚇":m==="walk"?"🚶":"➜"}
  function maps2(from,to,mode){const f=encodeURIComponent(from||""),t=encodeURIComponent(to||"");const m=String(mode||"").toLowerCase();const travel=["train","bts","mrt","boat"].includes(m)?"transit":"driving";return "https://www.google.com/maps/dir/?api=1&origin="+f+"&destination="+t+"&travelmode="+travel}
  window.updateNextStopBar=function(){
    const el=document.getElementById("nextStopBar");if(!el)return;
    const t=(window.db&&db.trips||[]).find(x=>x.id===db.activeTripId&&!x.finished),stops=t?.stops||[];
    if(!t||!stops.length){el.innerHTML="";el.classList.remove("has-next-stop");return}
    const i=stops.findIndex(s=>!s.reached);
    if(i<0){el.innerHTML="";el.classList.remove("has-next-stop");return}
    const next=stops[i], previous=i>0?stops[i-1]:null;
    const from=previous?.name||t.destination||"Current location";
    const to=next.name||"Next Stop";
    const leg=(next.legs||[])[0]||(previous?.legs||[])[0]||null;
    const mode=String(leg?.vehicle||next.transportMode||"");
    const nodes=stops.map((s,n)=>'<span class="ns3-node '+(n<i?"done":n===i?"current":"pending")+'"><i></i><b>'+esc2(s.name||("Stop "+(n+1)))+'</b></span>').join("");
    const planned=(next.date||next.time)?((next.date?esc2(next.date):"")+(next.time?" · "+esc2(next.time):"")):"Next destination";
    el.classList.add("has-next-stop");
    el.innerHTML='<div class="next-stop-v3" data-page="travel">'+
      '<div class="ns3-main"><div class="ns3-kicker"><span class="ns3-pin">📍</span><span>NEXT STOP</span><b>STOP '+String(i+1).padStart(2,"0")+' / '+String(stops.length).padStart(2,"0")+'</b></div>'+
      '<div class="ns3-destination"><strong>'+esc2(to)+'</strong></div>'+
      '<div class="ns3-route"><span class="ns3-vehicle">'+icon2(mode)+' '+esc2(mode||"Route")+'</span><span class="ns3-state">'+planned+'</span></div>'+
      '<div class="ns3-track">'+nodes+'</div></div>'+
      '<div class="ns3-actions"><a class="ns3-map" href="'+maps2(from,to,mode)+'" target="_blank" rel="noopener noreferrer" aria-label="Open route">↗ <span>Open</span></a><button class="ns3-reach" type="button" data-reach="'+next.id+'" aria-label="Mark '+esc2(to)+' reached">✓ Reached</button></div>'+
      '<div class="ns3-progress"><em style="width:'+Math.round(((i+1)/stops.length)*100)+'%"></em></div></div>';
  };
  // The original document click handler sees data-page on the parent card and prevents the link.
  // Capture the map click first so Open always opens Google Maps.
  document.addEventListener("click",function(e){
    const a=e.target.closest?.(".ns3-map");if(!a)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const url=a.getAttribute("href");if(!url)return;
    try{const w=window.open(url,"_blank","noopener,noreferrer");if(!w)location.href=url}catch{location.href=url}
  },true);

  window.openFinishedJourney=function(id){
    const d=window.db;if(!d||!Array.isArray(d.trips))return;
    const trip=d.trips.find(t=>String(t.id)===String(id));if(!trip)return;
    d.activeTripId=trip.id;
    try{localStorage.setItem("our-love-journey-v2",JSON.stringify(d));}catch{}
    if(typeof window.render==="function"){window.render();return;}
    location.hash="history";
  };
  // History: open the finished journey detail immediately, even when the hash is already #history.
  document.addEventListener("click",function(e){
    const btn=e.target.closest?.("[data-open-history-trip]");
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=String(btn.dataset.openHistoryTrip||"");
    const d=window.db;
    const trip=d?.trips?.find(t=>String(t.id)===id);
    if(!trip)return;
    d.activeTripId=trip.id;
    try{localStorage.setItem("our-love-journey-v2",JSON.stringify(d));}catch{}
    if(typeof window.render==="function")window.render();
    else location.hash="history";
  },true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>window.updateNextStopBar(),{once:true});
  else window.updateNextStopBar();
})();
