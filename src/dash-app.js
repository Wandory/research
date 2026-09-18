<script id="BL" type="application/json">__BASELINE__</script>
<script>
(function(){
"use strict";
var BL=JSON.parse(document.getElementById('BL').textContent);
var ORDER=BL.order, NAME=BL.name, MONTHS=BL.months, P=BL.proto, SLUG=ORDER.slice();
var $=function(id){return document.getElementById(id)};
var el=function(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e};
var num=function(v){var n=parseFloat(v);return isFinite(n)?n:0};
var f2=function(v,d){return v.toFixed(d===undefined?2:d)};
var pct=function(v,d){return (v*100).toFixed(d===undefined?1:d)+'%'};
var usd=function(v){var a=Math.abs(v);
  if(a>=1e9)return '$'+(v/1e9).toFixed(2)+'B';
  if(a>=1e6)return '$'+(v/1e6).toFixed(a>=1e8?0:1)+'M';
  if(a>=1e3)return '$'+(v/1e3).toFixed(0)+'k';
  return '$'+v.toFixed(0);};
var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};

var LIVE=null, POOLS=[], FEES={};

/* ---------- fetch ---------- */
function timeout(ms){return new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'))},ms)})}
function getJSON(u,ms){return Promise.race([fetch(u,{cache:'no-store'}).then(function(r){
  if(!r.ok)throw new Error('HTTP '+r.status); return r.json();}), timeout(ms||25000)]);}
function loadPools(){
  return getJSON('https://yields.llama.fi/pools',30000).then(function(j){
    POOLS=((j&&j.data)||[]).filter(function(p){
      return SLUG.indexOf(p.project)>=0 && p.apyBase!==null && p.apyBase!==undefined;})
      .map(function(p){return {project:p.project, sym:p.symbol||'', chain:p.chain||'',
        tvl:num(p.tvlUsd), base:num(p.apyBase), rew:num(p.apyReward)};});
    return POOLS;});
}
function loadFees(){
  var jobs=[];
  SLUG.forEach(function(s){['dailyFees','dailyRevenue'].forEach(function(dt){
    jobs.push(getJSON('https://api.llama.fi/summary/fees/'+s+'?dataType='+dt+
      '&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',20000)
      .then(function(j){(FEES[s]=FEES[s]||{})[dt]={d30:num(j.total30d)};})
      .catch(function(){(FEES[s]=FEES[s]||{})[dt]=null;}));
  });});
  return Promise.all(jobs);
}
function aggregate(){
  var by={};
  POOLS.forEach(function(p){
    var o=by[p.project]||(by[p.project]={n:0,tvl:0,wb:0,wr:0,sub:0});
    o.n++;o.tvl+=p.tvl;o.wb+=p.base*p.tvl;o.wr+=p.rew*p.tvl;o.sub+=(p.rew/100)*p.tvl;});
  var agg={};
  SLUG.forEach(function(s){var o=by[s]; if(!o||!o.tvl){agg[s]=null;return}
    var den=o.wb+o.wr;
    agg[s]={pools:o.n,tvl:o.tvl,org:den>0?o.wb/den:1,base:o.wb/o.tvl,rew:o.wr/o.tvl,sub:o.sub};});
  return agg;
}

/* ---------- hero ---------- */
function renderHero(agg){
  var tvl=0,wb=0,wr=0,sub=0,np=0;
  SLUG.forEach(function(s){var a=agg&&agg[s];if(!a)return;
    tvl+=a.tvl;wb+=a.base*a.tvl;wr+=a.rew*a.tvl;sub+=a.sub;np+=a.pools;});
  var orgNow=(wb+wr)>0?wb/(wb+wr):null;
  var bw=0,bt=0,incThen=0;
  SLUG.forEach(function(s){bw+=P[s].base_org*P[s].tvl_then;bt+=P[s].tvl_then;incThen+=P[s].inc_musd;});
  var orgThen=bt?bw/bt:0;
  var f30=0,r30=0,haveFees=false;
  SLUG.forEach(function(s){var f=FEES[s];if(!f)return;
    if(f.dailyFees){f30+=f.dailyFees.d30;haveFees=true}
    if(f.dailyRevenue){r30+=f.dailyRevenue.d30}});
  function drift(now,then){
    if(now==null)return '<span class="skel">waiting for live data</span>';
    var d=now-then;
    return 'published <b>'+f2(then)+'</b>, now '+(d>=0?'+':'')+f2(d);
  }
  var cells=[
    ['Paid by borrowers, now', orgNow==null?'&mdash;':f2(orgNow),
      orgNow==null?'<span class="skel">waiting for live data</span>':('published <b>'+f2(orgThen)+'</b>')],
    ['Deposits covered', orgNow==null?'&mdash;':usd(tvl),
      np?('<b>'+np.toLocaleString('en-US')+'</b> pools with a readable base rate')
        :'<span class="skel">waiting for live data</span>'],
    ['Subsidy run rate, annual', orgNow==null?'&mdash;':usd(sub),
      'study measured <b>'+usd(incThen*1e6)+'</b> realised over 32 months'],
    ['Protocol revenue, 30d', haveFees?usd(r30):'&mdash;',
      haveFees?('fees <b>'+usd(f30)+'</b>, take rate <b>'+(f30>0?pct(r30/f30):'n/a')+'</b>')
              :'<span class="skel">waiting for the fees endpoint</span>']
  ];
  $('hero').innerHTML=cells.map(function(c){
    return '<div class="num"><span class="lb">'+c[0]+'</span><b>'+c[1]+'</b><span class="sub">'+c[2]+'</span></div>';
  }).join('');
}

/* ---------- figure 1 ---------- */
function renderDrift(agg){
  var box=$('drift'); box.innerHTML='';
  var rows=SLUG.map(function(s){var a=agg&&agg[s];
    return {s:s,then:P[s].base_org,now:a?a.org:null};})
    .sort(function(x,y){return (y.now==null?y.then:y.now)-(x.now==null?x.then:x.now)});
  var lo=0.3;
  var px=function(v){return Math.max(0,Math.min(100,(v-lo)/(1-lo)*100))};
  rows.forEach(function(r){
    var a=px(r.then), b=r.now==null?a:px(r.now);
    var d=r.now==null?null:(r.now-r.then);
    box.appendChild(el('div','bline',
      '<span class="cname">'+esc(NAME[r.s])+'</span>'+
      '<span class="trk"><span class="base"></span>'+
        (r.now==null?'':'<span class="seg" style="left:'+Math.min(a,b)+'%;width:'+Math.abs(b-a)+'%"></span>')+
        '<span class="pt then" style="left:'+a+'%"></span>'+
        (r.now==null?'':'<span class="pt now" style="left:'+b+'%"></span>')+'</span>'+
      '<span class="cval">'+(r.now==null?'&mdash;':f2(r.now))+
        ' <span class="d">was '+f2(r.then)+'</span><br>'+
        (d==null?'<span class="d">&mdash;</span>'
               :'<span class="'+(d<-0.005?'dn':'d')+'">'+(d>=0?'+':'')+f2(d)+'</span>')+'</span>'));
  });
  $('drift-lg').innerHTML='<span><i class="then"></i>published, September 2026</span>'+
    '<span><i class="now"></i>live, this page load</span>'+
    '<span>scale starts at 0.30</span>';
}

/* ---------- figures 2 and 3 ---------- */
function smallMultiples(host,opts){
  host.innerHTML='';
  var W=230,H=74,SP=3,lo=opts.lo,hi=opts.hi;
  var xs=function(i){return (i/(MONTHS.length-1))*W};
  var ys=function(v){return SP+(1-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo))*(H-2*SP)};
  var grid=el('div','sm-grid');
  opts.series.forEach(function(sr){
    var segs=[],cur=[];
    for(var i=0;i<MONTHS.length;i++){var v=sr.v[i];
      if(v===null||v===undefined){if(cur.length){segs.push(cur);cur=[]}continue}
      cur.push([xs(i),ys(v)]);}
    if(cur.length)segs.push(cur);
    var g='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="'+esc(sr.n)+'">';
    if(opts.ref!==undefined)
      g+='<line class="gridline" x1="0" y1="'+ys(opts.ref).toFixed(1)+'" x2="'+W+'" y2="'+ys(opts.ref).toFixed(1)+'" stroke-dasharray="2 3" opacity=".8"/>';
    segs.forEach(function(sg){
      if(sg.length<2){g+='<circle cx="'+sg[0][0].toFixed(1)+'" cy="'+sg[0][1].toFixed(1)+'" r="2" fill="var(--accent)"/>';return}
      var d='M'+sg.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1)}).join('L');
      g+='<path d="'+d+'L'+sg[sg.length-1][0].toFixed(1)+','+H+'L'+sg[0][0].toFixed(1)+','+H+'Z" fill="var(--accent)" opacity=".13"/>';
      g+='<path d="'+d+'" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    g+='<rect class="smhit" x="0" y="0" width="'+W+'" height="'+H+'" fill="transparent"/></svg>';
    var cell=el('div','sm',
      '<h4><span class="smn">'+esc(sr.n)+'</span><span class="smv">'+esc(sr.tag)+'</span></h4>'+
      '<div class="smc">'+g+'</div><p class="smf">'+esc(sr.foot)+'</p>');
    var cb=cell.querySelector('.smc'), tip=el('div','tip'); cb.appendChild(tip);
    var svg=cb.querySelector('svg');
    svg.addEventListener('mousemove',function(ev){
      var r=svg.getBoundingClientRect();
      var i=Math.max(0,Math.min(MONTHS.length-1,Math.round((ev.clientX-r.left)/r.width*(MONTHS.length-1))));
      var v=sr.v[i];
      tip.innerHTML='<div class="tt">'+MONTHS[i]+'</div><div class="tv">'+
        (v===null||v===undefined?'no data':opts.tip(v))+'</div>';
      tip.classList.add('on');
      var bw=r.width, tw=tip.offsetWidth;
      tip.style.left=Math.max(0,Math.min(bw-tw,(i/(MONTHS.length-1))*bw-tw/2))+'px';
      tip.style.top='-8px';
    });
    svg.addEventListener('mouseleave',function(){tip.classList.remove('on')});
    grid.appendChild(cell);
  });
  host.appendChild(grid);
  host.appendChild(el('p','smaxis','<span>'+MONTHS[0]+'</span><span>'+MONTHS[MONTHS.length-1]+'</span>'));
}

function renderHistory(){
  smallMultiples($('hist'),{lo:0,hi:1.02,ref:0.5,
    series:SLUG.map(function(s){return {n:NAME[s],v:P[s].org,tag:f2(P[s].base_org),
      foot:'paid out '+usd(P[s].inc_musd*1e6)+' over the period'};}),
    tip:function(v){return v.toFixed(3)}});
  $('hist-lg').innerHTML='<span>Every panel runs '+MONTHS[0]+' to '+MONTHS[MONTHS.length-1]+' on the same scale, 0 to 1. The dashed line marks 0.5. The figure beside each name is the whole period result.</span>';

  var cum={},mx=0;
  SLUG.forEach(function(s){var run=0;
    cum[s]=P[s].inc.map(function(v,i){run+=v||0;return (P[s].org[i]===null&&run===0)?null:run;});
    var last=cum[s][cum[s].length-1]||0; if(last>mx)mx=last;});
  smallMultiples($('subs'),{lo:0,hi:mx*1.04,
    series:SLUG.map(function(s){var arr=cum[s],last=arr[arr.length-1]||0;
      return {n:NAME[s],v:arr,tag:usd(last),
        foot:last>0?(pct(last/(mx||1),0)+' of the largest spender'):'never paid a reward'};}),
    tip:function(v){return usd(v)}});
  $('subs-lg').innerHTML='<span>Cumulative, all eight panels on one scale topping out at '+usd(mx)+', so the filled areas are directly comparable.</span>';
}

/* ---------- live table ---------- */
var liveSort={k:'org',dir:1};
function liveCols(){return [
  ['name','Protocol',function(r){return esc(NAME[r.s])},function(r){return NAME[r.s]},''],
  ['tvl','Deposits',function(r){return r.a?usd(r.a.tvl):'&mdash;'},function(r){return r.a?r.a.tvl:-1},''],
  ['pools','Pools',function(r){return r.a?r.a.pools.toLocaleString('en-US'):'&mdash;'},function(r){return r.a?r.a.pools:-1},''],
  ['base','Base APY',function(r){return r.a?f2(r.a.base)+'%':'&mdash;'},function(r){return r.a?r.a.base:-1},''],
  ['rew','Reward APY',function(r){return r.a?f2(r.a.rew)+'%':'&mdash;'},function(r){return r.a?r.a.rew:-1},''],
  ['org','Paid by borrowers',function(r){return r.a?f2(r.a.org):'&mdash;'},function(r){return r.a?r.a.org:-1},
    function(r){return r.a?'mark':''}],
  ['was','Published',function(r){return f2(P[r.s].base_org)},function(r){return P[r.s].base_org},''],
  ['sub','Subsidy run rate',function(r){return r.a?usd(r.a.sub):'&mdash;'},function(r){return r.a?r.a.sub:-1},''],
  ['r30','Revenue 30d',function(r){var f=FEES[r.s]&&FEES[r.s].dailyRevenue;return f?usd(f.d30):'&mdash;'},
    function(r){var f=FEES[r.s]&&FEES[r.s].dailyRevenue;return f?f.d30:-1},''],
  ['dep','Dependency',function(r){var b=FEES[r.s]&&FEES[r.s].dailyRevenue;
      if(!r.a||!b)return '&mdash;';
      var an=b.d30*365/30; if(an<=0)return 'no revenue';
      return f2(r.a.sub/an);},
    function(r){var b=FEES[r.s]&&FEES[r.s].dailyRevenue;if(!r.a||!b)return -1;
      var an=b.d30*365/30;return an>0?r.a.sub/an:1e9;},
    function(r){var b=FEES[r.s]&&FEES[r.s].dailyRevenue;if(!r.a||!b)return '';
      var an=b.d30*365/30;return (an<=0||r.a.sub/an>1)?'neg':'';}]
];}
function renderLive(agg){
  var cols=liveCols();
  var rows=SLUG.map(function(s){return {s:s,a:agg?agg[s]:null}});
  var sc=cols.filter(function(c){return c[0]===liveSort.k})[0]||cols[5];
  rows.sort(function(x,y){var a=sc[3](x),b=sc[3](y);
    return typeof a==='string'?liveSort.dir*a.localeCompare(b):liveSort.dir*(b-a);});
  var t=$('tlive');
  t.innerHTML='<thead><tr>'+cols.map(function(c){
    return '<th data-k="'+c[0]+'"'+(c[0]===liveSort.k?(' aria-sort="'+(liveSort.dir===1?'descending':'ascending')+'"'):'')+'>'+c[1]+'</th>';
  }).join('')+'</tr></thead><tbody>'+rows.map(function(r){
    return '<tr>'+cols.map(function(c){
      var cl=typeof c[4]==='function'?c[4](r):c[4];
      return '<td'+(cl?' class="'+cl+'"':'')+'>'+c[2](r)+'</td>';}).join('')+'</tr>';
  }).join('')+'</tbody>';
  Array.prototype.forEach.call(t.querySelectorAll('th'),function(th){
    th.addEventListener('click',function(){
      if(liveSort.k===th.dataset.k)liveSort.dir*=-1; else {liveSort.k=th.dataset.k;liveSort.dir=1}
      renderLive(agg);});});
}

/* ---------- pool explorer ---------- */
var PAGE=25;
var poolSort={k:'tvl',dir:1}, poolFilter='', poolProj='all', poolMin=1e6, poolPage=0;
var SIZES=[[1e7,'$10M and up'],[1e6,'$1M and up'],[1e5,'$100k and up'],[0,'Everything']];
function poolCols(){return [
  ['sym','Pool',function(p){return esc(p.sym)},function(p){return p.sym},''],
  ['project','Protocol',function(p){return esc(NAME[p.project]||p.project)},function(p){return NAME[p.project]||p.project},''],
  ['chain','Chain',function(p){return esc(p.chain)},function(p){return p.chain},''],
  ['tvl','Size',function(p){return usd(p.tvl)},function(p){return p.tvl},''],
  ['base','Base APY',function(p){return f2(p.base)+'%'},function(p){return p.base},''],
  ['rew','Reward APY',function(p){return f2(p.rew)+'%'},function(p){return p.rew},''],
  ['org','Paid by borrowers',function(p){var d=p.base+p.rew;return d>0?f2(p.base/d):'1.00'},
    function(p){var d=p.base+p.rew;return d>0?p.base/d:1},'mark'],
  ['sub','Subsidy run rate',function(p){return usd(p.rew/100*p.tvl)},function(p){return p.rew/100*p.tvl},'']
];}
function filteredPools(){
  var q=poolFilter.toLowerCase();
  return POOLS.filter(function(p){
    if(p.tvl<poolMin)return false;
    if(poolProj!=='all'&&p.project!==poolProj)return false;
    if(!q)return true;
    return (p.sym+' '+p.chain+' '+(NAME[p.project]||p.project)).toLowerCase().indexOf(q)>=0;});
}
function renderPools(){
  var cols=poolCols(), rows=filteredPools();
  var sc=cols.filter(function(c){return c[0]===poolSort.k})[0]||cols[3];
  rows.sort(function(x,y){var a=sc[3](x),b=sc[3](y);
    return typeof a==='string'?poolSort.dir*String(a).localeCompare(String(b)):poolSort.dir*(b-a);});
  var total=rows.length, pages=Math.max(1,Math.ceil(total/PAGE));
  if(poolPage>=pages)poolPage=pages-1;
  if(poolPage<0)poolPage=0;
  var slice=rows.slice(poolPage*PAGE,poolPage*PAGE+PAGE);
  var hidden=POOLS.length-rows.length;
  $('cnt').textContent=total.toLocaleString('en-US')+(total===1?' pool':' pools')+
    (hidden>0?(', '+hidden.toLocaleString('en-US')+' filtered out'):'');
  var t=$('tpools');
  t.innerHTML='<thead><tr>'+cols.map(function(c){
    return '<th data-k="'+c[0]+'"'+(c[0]===poolSort.k?(' aria-sort="'+(poolSort.dir===1?'descending':'ascending')+'"'):'')+'>'+c[1]+'</th>';
  }).join('')+'</tr></thead><tbody>'+
    (slice.length?slice.map(function(p){return '<tr>'+cols.map(function(c){
      return '<td'+(c[4]?' class="'+c[4]+'"':'')+'>'+c[2](p)+'</td>';}).join('')+'</tr>';}).join('')
     :'<tr><td class="empty" colspan="8">'+(POOLS.length?'Nothing matches that filter.':'Waiting for live data.')+'</td></tr>')+
    '</tbody>';
  Array.prototype.forEach.call(t.querySelectorAll('th'),function(th){
    th.addEventListener('click',function(){
      if(poolSort.k===th.dataset.k)poolSort.dir*=-1; else {poolSort.k=th.dataset.k;poolSort.dir=1}
      poolPage=0; renderPools();});});
  $('pg').textContent=total?('page '+(poolPage+1)+' of '+pages+', showing '+
    (poolPage*PAGE+1)+' to '+Math.min(total,(poolPage+1)*PAGE)):'';
  $('prev').disabled=poolPage<=0;
  $('next').disabled=poolPage>=pages-1;
}
function buildControls(){
  $('sizes').innerHTML=SIZES.map(function(o){
    return '<button class="plain'+(o[0]===poolMin?' on':'')+'" type="button" data-v="'+o[0]+'">'+esc(o[1])+'</button>';}).join('');
  Array.prototype.forEach.call($('sizes').querySelectorAll('button'),function(b){
    b.addEventListener('click',function(){
      poolMin=+b.dataset.v; poolPage=0;
      Array.prototype.forEach.call($('sizes').querySelectorAll('button'),function(x){x.classList.toggle('on',x===b)});
      renderPools();});});
  var opts=[['all','All']].concat(SLUG.map(function(s){return [s,NAME[s]]}));
  $('chips').innerHTML=opts.map(function(o){
    return '<button class="plain'+(o[0]===poolProj?' on':'')+'" type="button" data-p="'+o[0]+'">'+esc(o[1])+'</button>';}).join('');
  Array.prototype.forEach.call($('chips').querySelectorAll('button'),function(b){
    b.addEventListener('click',function(){
      poolProj=b.dataset.p; poolPage=0;
      Array.prototype.forEach.call($('chips').querySelectorAll('button'),function(x){x.classList.toggle('on',x===b)});
      renderPools();});});
  $('prev').addEventListener('click',function(){poolPage--;renderPools();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'});});
  $('next').addEventListener('click',function(){poolPage++;renderPools();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'});});
  $('q').addEventListener('input',function(){poolFilter=this.value;poolPage=0;renderPools()});
}

/* ---------- status ---------- */
function setStatus(kind,msg){$('stat').innerHTML='<i class="'+kind+'"></i> '+msg}

/* ---------- boot ---------- */
renderHistory();
buildControls();
renderHero(null); renderDrift(null); renderLive(null); renderPools();

function refresh(){
  $('refresh').disabled=true; setStatus('','loading live data'); $('errbox').innerHTML=''; FEES={};
  var t0=Date.now();
  loadPools().then(function(){
    var agg=aggregate();
    renderHero(agg); renderDrift(agg); renderLive(agg); renderPools();
    setStatus('live','pools loaded, fetching fees');
    return loadFees().then(function(){
      var ok=SLUG.filter(function(s){return FEES[s]&&FEES[s].dailyFees}).length;
      renderHero(agg); renderLive(agg);
      setStatus('live','live');
      $('stamp').textContent=new Date().toLocaleString('en-GB')+', '+((Date.now()-t0)/1000).toFixed(1)+'s'+
        (ok<SLUG.length?(', fees '+ok+' of '+SLUG.length):'');
      $('refresh').disabled=false;});
  }).catch(function(e){
    setStatus('off','live data unavailable'); $('refresh').disabled=false;
    $('errbox').innerHTML='<p class="err"><b>This page could not reach the DefiLlama API</b> ('+esc(e.message)+
      '), so the live figures are empty and only the published baseline is shown. That normally means the page is running somewhere outbound requests are blocked, or the API is down. Open the file directly in a browser, or serve it over http, and it will fill in.</p>';
  });
}
$('refresh').addEventListener('click',refresh);
refresh();

$('theme').addEventListener('click',function(){
  var c=document.documentElement.getAttribute('data-theme');
  if(!c)c=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.setAttribute('data-theme',c==='dark'?'light':'dark');});
})();
</script>
