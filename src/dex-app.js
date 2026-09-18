<script id="BL" type="application/json">__BASELINE__</script>
<script>
(function(){
"use strict";
var D=DASH, $=D.$, usd=D.usd, f2=D.f2, pct=D.pct, esc=D.esc;
var BL=JSON.parse(document.getElementById('BL').textContent);
var MONTHS=BL.months, NAME=BL.name, ORDER=BL.order, P=BL.proto;
var SLUG=Object.keys(NAME);
var FLOOR=1e5;
var POOLS=[], AGG={}, live=false;

function load(){
  return D.getJSON('https://yields.llama.fi/pools',30000).then(function(j){
    POOLS=((j&&j.data)||[]).filter(function(p){
      return SLUG.indexOf(p.project)>=0 && p.apyBase!==null && p.apyBase!==undefined;})
      .map(function(p){return {project:p.project,sym:p.symbol||'',chain:p.chain||'',
        tvl:D.num(p.tvlUsd),base:D.num(p.apyBase),rew:D.num(p.apyReward)};});
    var by={};
    POOLS.forEach(function(p){ if(p.tvl<FLOOR)return;
      var o=by[p.project]||(by[p.project]={n:0,tvl:0,wb:0,wr:0});
      o.n++;o.tvl+=p.tvl;o.wb+=p.base*p.tvl;o.wr+=p.rew*p.tvl;});
    var wild={};
    POOLS.forEach(function(p){ if(p.tvl<FLOOR)return;
      if(p.rew>1000)wild[p.project]=(wild[p.project]||0)+1;});
    AGG={};
    SLUG.forEach(function(s){var o=by[s]; if(!o||!o.tvl){AGG[s]=null;return}
      var den=o.wb+o.wr;
      AGG[s]={pools:o.n,tvl:o.tvl,fee:den>0?o.wb/den:1,base:o.wb/o.tvl,rew:o.wr/o.tvl,
        wild:wild[s]||0};});
    live=true;});
}

function renderHero(){
  var tvl=0,np=0,shares=[],venues=0,wild=0,maxRew=0;
  SLUG.forEach(function(s){var a=AGG[s];if(!a)return;
    venues++;tvl+=a.tvl;np+=a.pools;shares.push(a.fee);wild+=a.wild;
    if(a.rew>maxRew)maxRew=a.rew;});
  function median(a){if(!a.length)return null;var b=a.slice().sort(function(x,y){return x-y});
    return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2;}
  var medNow=median(shares);
  var medThen=median(ORDER.map(function(s){return P[s].base_org}));
  var binc=0; ORDER.forEach(function(s){binc+=P[s].inc_usd});
  var lo=shares.length?Math.min.apply(null,shares):null, hi=shares.length?Math.max.apply(null,shares):null;
  D.hero([
    ['Median venue fee share', live&&medNow!=null?f2(medNow):D.dash,
      live?('published <b>'+f2(medThen)+'</b>. A pooled average is not shown: one venue emitting hard would decide it')
          :'<span class="skel">waiting for live data</span>'],
    ['Spread across venues', live&&lo!=null?(f2(lo)+' to '+f2(hi)):D.dash,
      live?('<b>'+venues+'</b> venues publishing a fee rate, <b>'+np.toLocaleString('en-US')+'</b> pools above '+usd(FLOOR))
          :'<span class="skel">waiting for live data</span>'],
    ['Liquidity covered', live?usd(tvl):D.dash,
      live?('highest reward rate on a venue, <b>'+f2(maxRew,0)+'%</b> a year')
          :'<span class="skel">waiting for live data</span>'],
    ['Emissions in the study', usd(binc),
      'paid out across '+MONTHS.length+' months, against $73.0M from eight lending protocols']
  ]);
}

function renderDrift(){
  var rows=ORDER.map(function(s){var a=AGG[s];
    return {name:NAME[s],then:P[s].base_org,now:live?(a?a.fee:null):null};})
    .sort(function(a,b){return (b.now==null?b.then:b.now)-(a.now==null?a.then:a.now)});
  D.dumbbell('drift','drift-lg',rows,0,function(v){return f2(v)},
    'published, September 2026','live, this page load');
}

function renderLive(){
  D.Table('tlive',[
    ['name','Venue',function(r){return esc(NAME[r.s])},function(r){return NAME[r.s]},''],
    ['pools','Pools',function(r){return r.a?r.a.pools.toLocaleString('en-US'):D.dash},function(r){return r.a?r.a.pools:-1},''],
    ['tvl','Liquidity',function(r){return r.a?usd(r.a.tvl):D.dash},function(r){return r.a?r.a.tvl:-1},''],
    ['base','Fee rate',function(r){return r.a?f2(r.a.base)+'%':D.dash},function(r){return r.a?r.a.base:-1},''],
    ['rew','Reward rate',function(r){return r.a?f2(r.a.rew)+'%':D.dash},function(r){return r.a?r.a.rew:-1},
      function(r){return (r.a&&r.a.rew>50)?'neg':''}],
    ['wild','Pools over 1000%',function(r){return r.a?(r.a.wild||0):D.dash},function(r){return r.a?r.a.wild:-1},
      function(r){return (r.a&&r.a.wild>0)?'neg':''}],
    ['fee','Fee share',function(r){return r.a?f2(r.a.fee):D.dash},function(r){return r.a?r.a.fee:-1},'mark'],
    ['was','Published',function(r){return f2(P[r.s].base_org)},function(r){return P[r.s].base_org},''],
    ['pw','Pools then',function(r){return P[r.s].pools},function(r){return P[r.s].pools},''],
    ['inc','Emissions, study',function(r){return usd(P[r.s].inc_usd)},function(r){return P[r.s].inc_usd},'']
  ],function(){return ORDER.map(function(s){return {s:s,a:AGG[s]}})},
   {sort:'fee',empty:'Waiting for live data.'}).draw();
}

function renderHistory(){
  D.smallMultiples('hist',MONTHS,{lo:0,hi:1.02,ref:0.5,
    series:ORDER.map(function(s){return {n:NAME[s],v:P[s].org,tag:f2(P[s].base_org),
      foot:'paid out '+usd(P[s].inc_usd)+' over the period'};}),
    tip:function(v){return v.toFixed(3)}});
  $('hist-lg').innerHTML='<span>Every panel runs '+MONTHS[0]+' to '+MONTHS[MONTHS.length-1]+
    ' on the same scale, 0 to 1. The dashed line marks 0.5.</span>';
  var cum={},mx=0;
  ORDER.forEach(function(s){var run=0;
    cum[s]=P[s].inc.map(function(v,i){run+=v||0;return (P[s].org[i]===null&&run===0)?null:run;});
    var last=cum[s][cum[s].length-1]||0; if(last>mx)mx=last;});
  D.smallMultiples('subs',MONTHS,{lo:0,hi:mx*1.04,
    series:ORDER.map(function(s){var arr=cum[s],last=arr[arr.length-1]||0;
      return {n:NAME[s],v:arr,tag:usd(last),
        foot:last>0?(pct(last/(mx||1),0)+' of the largest spender'):'never paid an emission'};}),
    tip:function(v){return usd(v)}});
  $('subs-lg').innerHTML='<span>Cumulative, all panels on one scale topping out at '+usd(mx)+'.</span>';
}

function renderEvents(){
  var rows=BL.ev.map(function(e){
    var parts=e.group.split('|'), ty=parts[0], pr=parts[1];
    var all=pr==='all';
    return {name:all?(ty==='stop'?'All switch-offs':'All switch-ons')
                    :((ty==='stop'?'switch-off, ':'switch-on, ')+(NAME[pr]||pr)),
      bold:all, n:+e.n, rb:D.num(e.med_reward_before), ra:D.num(e.med_reward_after),
      pool:D.num(e.med_pool_d90), ven:D.num(e.med_protocol_d90),
      e30:D.num(e.med_excess_d30), e90:D.num(e.med_excess_d90),
      neg:D.num(e.share_excess_neg_90)*100};});
  rows.push({name:'Lending, switch-ons',bold:true,n:50,rb:0,ra:1.09,pool:19.5,ven:6.6,e30:5.8,e90:-0.6,neg:52});
  rows.push({name:'Lending, switch-offs',bold:true,n:41,rb:1.89,ra:0.41,pool:-12.5,ven:1.1,e30:-6.0,e90:-7.4,neg:56});
  D.Table('tev',[
    ['name','Group',function(r){return r.bold?('<b>'+esc(r.name)+'</b>'):esc(r.name)},function(r){return r.name},''],
    ['n','Events',function(r){return r.n},function(r){return r.n},''],
    ['rb','Reward before',function(r){return f2(r.rb)+'%'},function(r){return r.rb},''],
    ['ra','Reward after',function(r){return f2(r.ra)+'%'},function(r){return r.ra},''],
    ['pool','Pool TVL, 90d',function(r){return f2(r.pool,1)+'%'},function(r){return r.pool},''],
    ['ven','Venue, 90d',function(r){return f2(r.ven,1)+'%'},function(r){return r.ven},''],
    ['e30','Excess, 30d',function(r){return f2(r.e30,1)+'%'},function(r){return r.e30},
      function(r){return r.e30<-5?'neg':''}],
    ['e90','Excess, 90d',function(r){return f2(r.e90,1)+'%'},function(r){return r.e90},
      function(r){return r.e90<-5?'neg':(r.e90>15?'mark':'')}],
    ['neg','Share negative',function(r){return f2(r.neg,0)+'%'},function(r){return r.neg},'']
  ],function(){return rows},{sort:'n'}).draw();
}

/* explorer */
var q='',pick='all',minSize=1e5,pt;
var SIZES=[[1e6,'$1M and up'],[1e5,'$100k and up'],[1e4,'$10k and up'],[0,'Everything']];
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
    ['project','Venue',function(p){return esc(NAME[p.project]||p.project)},function(p){return NAME[p.project]||p.project},''],
    ['chain','Chain',function(p){return esc(p.chain)},function(p){return p.chain},''],
    ['tvl','Size',function(p){return usd(p.tvl)},function(p){return p.tvl},''],
    ['base','Fee rate',function(p){return f2(p.base)+'%'},function(p){return p.base},''],
    ['rew','Reward rate',function(p){return f2(p.rew)+'%'},function(p){return p.rew},
      function(p){return p.rew>100?'neg':''}],
    ['fee','Fee share',function(p){var d=p.base+p.rew;return d>0?f2(p.base/d):'1.00'},
      function(p){var d=p.base+p.rew;return d>0?p.base/d:1},'mark']
  ],poolRows,{sort:'tvl',perPage:25,empty:'Waiting for live data.',
    onDraw:function(total,pages,page){
      var hidden=POOLS.length-total;
      $('cnt').textContent=total.toLocaleString('en-US')+(total===1?' pool':' pools')+
        (hidden>0?(', '+hidden.toLocaleString('en-US')+' filtered out'):'');
      $('pg').textContent=total?('page '+(page+1)+' of '+pages+', showing '+(page*25+1)+' to '+
        Math.min(total,(page+1)*25)):'';
      $('prev').disabled=page<=0;$('next').disabled=page>=pages-1;}});
  D.chips('sizes',SIZES.map(function(o){return [String(o[0]),o[1]]}),String(minSize),
    function(v){minSize=+v;pt.reset();pt.draw()});
  D.chips('chips',[['all','All']].concat(ORDER.map(function(s){return [s,NAME[s]]})),'all',
    function(v){pick=v;pt.reset();pt.draw()});
  $('prev').addEventListener('click',function(){pt.state.page--;pt.draw();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'})});
  $('next').addEventListener('click',function(){pt.state.page++;pt.draw();
    $('sec-pools').scrollIntoView({behavior:'smooth',block:'start'})});
  $('q').addEventListener('input',function(){q=this.value;pt.reset();pt.draw()});
}

renderHistory(); renderEvents(); renderHero(); renderDrift(); renderLive();
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
