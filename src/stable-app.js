<script id="BL" type="application/json">__BASELINE__</script>
<script>
(function(){
"use strict";
var D=DASH, $=D.$, usd=D.usd, f2=D.f2, pct=D.pct, esc=D.esc;
var BL=JSON.parse(document.getElementById('BL').textContent);
var MONTHS=BL.months, NAME=BL.name, ORDER=BL.order, P=BL.proto, CR=BL.cr;
var SLUG=Object.keys(NAME);
var POOLS=[], AGG={}, live=false;

function load(){
  return D.getJSON('https://yields.llama.fi/pools',30000).then(function(j){
    POOLS=((j&&j.data)||[]).filter(function(p){
      return SLUG.indexOf(p.project)>=0 && p.apyBase!==null && p.apyBase!==undefined;})
      .map(function(p){return {project:p.project,sym:p.symbol||'',chain:p.chain||'',
        tvl:D.num(p.tvlUsd),base:D.num(p.apyBase),rew:D.num(p.apyReward)};});
    var by={};
    POOLS.forEach(function(p){
      var o=by[p.project]||(by[p.project]={n:0,tvl:0,wb:0,wr:0});
      o.n++;o.tvl+=p.tvl;o.wb+=p.base*p.tvl;o.wr+=p.rew*p.tvl;});
    AGG={};
    SLUG.forEach(function(s){var o=by[s]; if(!o||!o.tvl){AGG[s]=null;return}
      AGG[s]={pools:o.n,tvl:o.tvl,base:o.wb/o.tvl,rew:o.wr/o.tvl,
        org:(o.wb+o.wr)>0?o.wb/(o.wb+o.wr):1};});
    live=true;});
}
function r365(s){var c=CR[s]&&CR[s][365];return c?c.ratio:null}

function renderHero(){
  var tvl=0,w=0,n=0,issuers=0;
  SLUG.forEach(function(s){var a=AGG[s];if(!a)return;issuers++;tvl+=a.tvl;w+=a.base*a.tvl;n+=a.pools;});
  var rateNow=tvl?w/tvl:null;
  var bw=0,bt=0;
  ORDER.forEach(function(s){bw+=P[s].now_then*P[s].tvl_then;bt+=P[s].tvl_then;});
  var rateThen=bt?bw/bt:0;
  var ratios=ORDER.map(r365).filter(function(v){return v!=null}).sort(function(a,b){return a-b});
  var medR=ratios.length?(ratios.length%2?ratios[(ratios.length-1)/2]
    :(ratios[ratios.length/2-1]+ratios[ratios.length/2])/2):null;
  var peaks=ORDER.map(function(s){return P[s].peak});
  D.hero([
    ['Advertised rate, now', live?f2(rateNow)+'%':D.dash,
      live?('published <b>'+f2(rateThen)+'%</b>, weighted by size'):'<span class="skel">waiting for live data</span>'],
    ['Size covered', live?usd(tvl):D.dash,
      live?('<b>'+n.toLocaleString('en-US')+'</b> pools across <b>'+issuers+'</b> issuers')
        :'<span class="skel">waiting for live data</span>'],
    ['Realised over advertised, 1y', medR==null?D.dash:f2(medR,2),
      'median across issuers with enough history. One would mean the promise was met'],
    ['Highest rate ever offered', f2(Math.max.apply(null,peaks))+'%',
      'Ethena in March 2024, against <b>'+f2(P['ethena-usde'].now_then)+'%</b> by the end of the study']
  ]);
}

function renderDrift(){
  var rows=ORDER.map(function(s){var a=AGG[s];
    return {name:NAME[s],then:P[s].now_then,now:live?(a?a.base:null):null};})
    .sort(function(a,b){return (b.now==null?b.then:b.now)-(a.now==null?a.then:a.now)});
  D.dumbbell('drift','drift-lg',rows,0,function(v){return f2(v)+'%'},
    'published, final month','live, this page load');
}

function renderLive(){
  D.Table('tlive',[
    ['name','Issuer',function(r){return esc(NAME[r.s])},function(r){return NAME[r.s]},''],
    ['pools','Pools',function(r){return r.a?r.a.pools:D.dash},function(r){return r.a?r.a.pools:-1},''],
    ['tvl','Size',function(r){return r.a?usd(r.a.tvl):D.dash},function(r){return r.a?r.a.tvl:-1},''],
    ['base','Rate now',function(r){return r.a?f2(r.a.base)+'%':D.dash},function(r){return r.a?r.a.base:-1},'mark'],
    ['was','Published',function(r){return f2(P[r.s].now_then)+'%'},function(r){return P[r.s].now_then},''],
    ['peak','Peak',function(r){return f2(P[r.s].peak)+'% <span class="d">'+P[r.s].peak_m+'</span>'},
      function(r){return P[r.s].peak},''],
    ['from','Observed from',function(r){return P[r.s].first},function(r){return P[r.s].first},''],
    ['org','Asset funded',function(r){return r.a?f2(r.a.org):D.dash},function(r){return r.a?r.a.org:-1},
      function(r){return (r.a&&r.a.org<0.9)?'neg':''}],
    ['cr','Realised / advertised, 1y',function(r){var v=r365(r.s);return v==null?D.dash:f2(v,3)},
      function(r){var v=r365(r.s);return v==null?-1:v},
      function(r){var v=r365(r.s);return (v!=null&&v<0.9)?'neg':''}],
    ['szdrop','Size vs peak',function(r){var p=P[r.s];
      return p.tvl_peak?f2((p.tvl_then/p.tvl_peak-1)*100,0)+'%':D.dash},
      function(r){var p=P[r.s];return p.tvl_peak?(p.tvl_then/p.tvl_peak-1):-99},
      function(r){var p=P[r.s];return (p.tvl_peak&&p.tvl_then/p.tvl_peak-1<-0.5)?'neg':''}]
  ],function(){return ORDER.map(function(s){return {s:s,a:AGG[s]}})},
   {sort:'tvl',empty:'Waiting for live data.'}).draw();
}

function renderCR(){
  var box=$('crbars'); box.innerHTML='';
  var W=[30,90,180,365], lo=0.6, hi=1.05;
  var PW=230,PH=74,SP=8,padL=6,padR=6;
  var xs=function(i){return padL+(i/(W.length-1))*(PW-padL-padR)};
  var ys=function(v){return SP+(1-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo))*(PH-2*SP)};
  var grid=D.el('div','sm-grid');
  ORDER.forEach(function(s){
    var c=CR[s]; if(!c)return;
    var pts=[]; W.forEach(function(w,i){ if(c[w])pts.push([xs(i),ys(c[w].ratio),c[w].ratio,i]); });
    if(!pts.length)return;
    var g='<svg viewBox="0 0 '+PW+' '+PH+'" role="img" aria-label="'+esc(NAME[s])+'">';
    g+='<line class="gridline" x1="0" y1="'+ys(1).toFixed(1)+'" x2="'+PW+'" y2="'+ys(1).toFixed(1)+
       '" stroke-dasharray="2 3" opacity=".9"/>';
    if(pts.length>1)
      g+='<path d="M'+pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1)}).join('L')+
         '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function(q){
      g+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="3" fill="var(--accent)"><title>'+
         W[q[3]]+' days: '+f2(q[2],3)+'</title></circle>';});
    var last=pts[pts.length-1];
    var missing=W.length-pts.length;
    grid.appendChild(D.el('div','sm',
      '<h4><span class="smn">'+esc(NAME[s])+'</span><span class="smv">'+f2(last[2],2)+'</span></h4>'+
      '<div class="smc">'+g+'</svg></div>'+
      '<p class="smf">'+W.map(function(w){return c[w]?f2(c[w].ratio,2):'—'}).join('  ')+
      (missing?('  · '+missing+' horizon'+(missing>1?'s':'')+' too short'):'')+'</p>'));
  });
  box.appendChild(grid);
  box.appendChild(D.el('p','smaxis','<span>30 days</span><span>365 days</span>'));
  $('crbars-lg').innerHTML='<span>The dashed line marks a ratio of one, where the promise is exactly met.</span>'+
    '<span>Scale 0.60 to 1.05. A horizon with fewer than thirty windows is left out.</span>';
}

function renderHistory(){
  var mx=0; ORDER.forEach(function(s){P[s].base.forEach(function(v){if(v!=null&&v>mx)mx=v})});
  D.smallMultiples('hist',MONTHS,{lo:0,hi:mx*1.04,
    series:ORDER.map(function(s){return {n:NAME[s],v:P[s].base,tag:f2(P[s].now_then)+'%',
      foot:'peaked at '+f2(P[s].peak)+'% in '+P[s].peak_m};}),
    tip:function(v){return f2(v)+'%'}});
  $('hist-lg').innerHTML='<span>Every panel runs '+MONTHS[0]+' to '+MONTHS[MONTHS.length-1]+
    ' on one scale topping out at '+f2(mx)+'% a year.</span>';
  var tmx=0; ORDER.forEach(function(s){P[s].tvl.forEach(function(v){if(v!=null&&v>tmx)tmx=v})});
  D.smallMultiples('sizes-chart',MONTHS,{lo:0,hi:tmx*1.04,
    series:ORDER.map(function(s){return {n:NAME[s],v:P[s].tvl,tag:usd(P[s].tvl_then),
      foot:'peaked at '+usd(P[s].tvl_peak)};}),
    tip:function(v){return usd(v)}});
  $('sizes-lg').innerHTML='<span>All panels on one scale topping out at '+usd(tmx)+'.</span>';
}

/* explorer */
var q='',pick='all',minSize=0,pt;
var SZ=[[1e6,'$1M and up'],[1e5,'$100k and up'],[0,'Everything']];
function poolRows(){
  var s=q.toLowerCase();
  return POOLS.filter(function(p){
    if(p.tvl<minSize)return false;
    if(pick!=='all'&&p.project!==pick)return false;
    if(!s)return true;
    return (p.sym+' '+p.chain+' '+(NAME[p.project]||p.project)).toLowerCase().indexOf(s)>=0;});
}
function buildExplorer(){
  pt=D.Table('tpools',[
    ['sym','Pool',function(p){return esc(p.sym)},function(p){return p.sym},''],
    ['project','Issuer',function(p){return esc(NAME[p.project]||p.project)},function(p){return NAME[p.project]||p.project},''],
    ['chain','Chain',function(p){return esc(p.chain)},function(p){return p.chain},''],
    ['tvl','Size',function(p){return usd(p.tvl)},function(p){return p.tvl},''],
    ['base','Rate',function(p){return f2(p.base)+'%'},function(p){return p.base},'mark'],
    ['rew','Token top-up',function(p){return f2(p.rew)+'%'},function(p){return p.rew},
      function(p){return p.rew>1?'neg':''}],
    ['org','Asset funded',function(p){var d=p.base+p.rew;return d>0?f2(p.base/d):'1.00'},
      function(p){var d=p.base+p.rew;return d>0?p.base/d:1},'']
  ],poolRows,{sort:'tvl',perPage:25,empty:'Waiting for live data.',
    onDraw:function(total,pages,page){
      var hidden=POOLS.length-total;
      $('cnt').textContent=total.toLocaleString('en-US')+(total===1?' pool':' pools')+
        (hidden>0?(', '+hidden.toLocaleString('en-US')+' filtered out'):'');
      $('pg').textContent=total?('page '+(page+1)+' of '+pages+', showing '+(page*25+1)+' to '+
        Math.min(total,(page+1)*25)):'';
      $('prev').disabled=page<=0;$('next').disabled=page>=pages-1;}});
  D.chips('szs',SZ.map(function(o){return [String(o[0]),o[1]]}),String(minSize),
    function(v){minSize=+v;pt.reset();pt.draw()});
  D.chips('chips',[['all','All']].concat(ORDER.map(function(s){return [s,NAME[s]]})),'all',
    function(v){pick=v;pt.reset();pt.draw()});
  $('prev').addEventListener('click',function(){pt.state.page--;pt.draw();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'})});
  $('next').addEventListener('click',function(){pt.state.page++;pt.draw();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'})});
  $('q').addEventListener('input',function(){q=this.value;pt.reset();pt.draw()});
}

renderHistory(); renderCR(); renderHero(); renderDrift(); renderLive();
buildExplorer(); pt.draw(); D.theme();

function refresh(){
  $('refresh').disabled=true; D.setStatus('','loading live data'); D.clearError();
  var t0=Date.now();
  load().then(function(){
    renderHero(); renderDrift(); renderLive(); pt.reset(); pt.draw();
    D.setStatus('live','live');
    D.setStamp(new Date().toLocaleString('en-GB')+', '+((Date.now()-t0)/1000).toFixed(1)+'s');
    $('refresh').disabled=false;
  }).catch(function(e){
    live=false; D.setStatus('off','live data unavailable'); D.showError(e.message);
    $('refresh').disabled=false;});
}
$('refresh').addEventListener('click',refresh);
refresh();
})();
</script>
