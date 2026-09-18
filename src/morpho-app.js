<script id="BL" type="application/json">__BASELINE__</script>
<script>
(function(){
"use strict";
var D=DASH, $=D.$, usd=D.usd, f2=D.f2, pct=D.pct, esc=D.esc;
var BL=JSON.parse(document.getElementById('BL').textContent);
var BASE_CUR={}; BL.curators.forEach(function(c){BASE_CUR[c.c]=c});
var BLUE={WETH:1,wstETH:1,cbETH:1,rETH:1,weETH:1,ezETH:1,WBTC:1,cbBTC:1,tBTC:1,LBTC:1,USDC:1,USDT:1,DAI:1,USDS:1};
var API='https://blue-api.morpho.org/graphql';
var VQ='{ vaults(first:500, where:{ totalAssetsUsd_gte:1000000 }, orderBy:TotalAssetsUsd, orderDirection:Desc){'+
  ' items{ address symbol name listed chain{network} asset{symbol}'+
  ' state{ totalAssetsUsd netApy netApyExcludingRewards fee curator sharePriceNumber'+
  ' allocation{ supplyAssetsUsd market{ lltv collateralAsset{ symbol } } } } } } }';
var CQ='{ curators(first:300){ items{ name addresses{ address } } } }';

var VAULTS=[], BAD=[], CUR=[], TOTAL=0, live=false;

function classify(v){
  var st=v.state||{}, aum=+st.totalAssetsUsd||0;
  var apy=(+st.netApy||0)*100, fee=(+st.fee||0)*100;
  var blue=0,pt=0,oth=0,wl=0,at=0;
  (st.allocation||[]).forEach(function(a){
    var s=+a.supplyAssetsUsd||0; if(!s||!a.market)return;
    var sym=(a.market.collateralAsset&&a.market.collateralAsset.symbol)||'';
    at+=s; wl+=(Number(a.market.lltv)/1e18)*s;
    if(/^PT[-_]/i.test(sym))pt+=s; else if(BLUE[sym])blue+=s; else oth+=s;});
  return {name:v.name||v.symbol||'', sym:v.symbol||'', chain:(v.chain&&v.chain.network)||'',
    asset:(v.asset&&v.asset.symbol)||'', aum:aum, apy:apy, fee:fee,
    listed:!!v.listed, share:+st.sharePriceNumber||null,
    ex:(+st.netApyExcludingRewards||0)*100,
    blue:at?blue/at:null, pt:at?pt/at:null, oth:at?oth/at:null, lltv:at?wl/at:null,
    markets:(st.allocation||[]).filter(function(a){return +a.supplyAssetsUsd>0}).length,
    curAddr:String(st.curator||'').toLowerCase()};
}

function load(){
  return Promise.all([D.postJSON(API,{query:VQ},30000), D.postJSON(API,{query:CQ},20000)])
   .then(function(r){
    if(r[0].errors)throw new Error(r[0].errors[0].message);
    if(r[1].errors)throw new Error(r[1].errors[0].message);
    var a2n={};
    (r[1].data.curators.items||[]).forEach(function(c){
      (c.addresses||[]).forEach(function(a){a2n[String(a.address||a).toLowerCase()]=c.name});});
    var all=(r[0].data.vaults.items||[]).map(classify);
    all.forEach(function(v){v.cur=a2n[v.curAddr]||'No curator listed'});
    VAULTS=all.filter(function(v){return v.apy<=100 && v.fee<=35});
    BAD=all.filter(function(v){return v.apy>100 || v.fee>35});
    TOTAL=VAULTS.reduce(function(s,v){return s+v.aum},0);
    var by={};
    VAULTS.forEach(function(v){
      var o=by[v.cur]||(by[v.cur]={c:v.cur,n:0,aum:0,wapy:0,wfee:0,wlltv:0,blue:0,pt:0,al:0,wmk:0});
      o.n++;o.aum+=v.aum;o.wapy+=v.apy*v.aum;o.wfee+=v.fee*v.aum;o.wmk+=v.markets*v.aum;
      if(v.lltv!=null){o.wlltv+=v.lltv*v.aum;o.blue+=v.blue*v.aum;o.pt+=v.pt*v.aum;o.al+=v.aum}});
    CUR=Object.keys(by).map(function(k){var o=by[k];
      return {c:k,n:o.n,aum:o.aum,share:o.aum/TOTAL,apy:o.wapy/o.aum,fee:o.wfee/o.aum,
        lltv:o.al?o.wlltv/o.al:null,blue:o.al?o.blue/o.al:null,pt:o.al?o.pt/o.al:null,
        mk:o.wmk/o.aum};}).sort(function(a,b){return b.aum-a.aum});
    live=true;
  });
}

/* ---------- render ---------- */
function renderHero(){
  var med=null;
  if(live&&VAULTS.length){var a=VAULTS.map(function(v){return v.apy}).sort(function(x,y){return x-y});
    med=a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
  var top3=live?CUR.slice(0,3).reduce(function(s,c){return s+c.share},0):null;
  var hhi=live?CUR.reduce(function(s,c){return s+c.share*c.share},0):null;
  var bTop3=BL.curators.slice(0,3).reduce(function(s,c){return s+c.share},0);
  var bHhi=BL.curators.reduce(function(s,c){return s+c.share*c.share},0);
  var bMed=(function(){var a=BL.vh.map(function(v){return v.med}).sort(function(x,y){return x-y});
    return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;})();
  D.hero([
    ['Readable assets', live?usd(TOTAL):D.dash,
      live?('<b>'+VAULTS.length+'</b> vaults, published <b>'+usd(BL.total)+'</b> across '+BL.vh.length+'+ vaults')
          :'<span class="skel">waiting for live data</span>'],
    ['Held by the top three', live?pct(top3):D.dash, 'published <b>'+pct(bTop3)+'</b>'],
    ['Median vault rate', live?f2(med)+'%':D.dash, 'published median across the thirty largest <b>'+f2(bMed)+'%</b>'],
    ['Concentration, HHI', live?f2(hhi,3):D.dash,
      'published <b>'+f2(bHhi,3)+'</b>, one would mean a single curator holds everything']
  ]);
}

function renderDrift(){
  var names={};
  BL.curators.forEach(function(c){names[c.c]=1});
  if(live)CUR.forEach(function(c){names[c.c]=1});
  var liveBy={}; CUR.forEach(function(c){liveBy[c.c]=c});
  var rows=Object.keys(names).map(function(n){
    return {name:n, then:BASE_CUR[n]?BASE_CUR[n].share:0, now:live?(liveBy[n]?liveBy[n].share:0):null};})
    .filter(function(r){return r.then>0.002||(r.now!=null&&r.now>0.002)})
    .sort(function(a,b){return (b.now==null?b.then:b.now)-(a.now==null?a.then:a.now)});
  D.dumbbell('drift','drift-lg',rows,0,function(v){return pct(v)},
    'published, September 2026','live, this page load');
}

function renderCurators(){
  var t=D.Table('tlive',[
    ['c','Curator',function(r){return esc(r.c)},function(r){return r.c},''],
    ['n','Vaults',function(r){return r.n},function(r){return r.n},''],
    ['aum','Assets',function(r){return usd(r.aum)},function(r){return r.aum},''],
    ['share','Share',function(r){return pct(r.share)},function(r){return r.share},'mark'],
    ['was','Published',function(r){return BASE_CUR[r.c]?pct(BASE_CUR[r.c].share):D.dash},
      function(r){return BASE_CUR[r.c]?BASE_CUR[r.c].share:-1},''],
    ['apy','Rate',function(r){return f2(r.apy)+'%'},function(r){return r.apy},''],
    ['fee','Fee',function(r){return f2(r.fee,1)+'%'},function(r){return r.fee},
      function(r){return r.fee>=12?'neg':''}],
    ['blue','Blue chip',function(r){return r.blue==null?D.dash:pct(r.blue,0)},function(r){return r.blue==null?-1:r.blue},
      function(r){return (r.blue!=null&&r.blue<0.05)?'neg':''}],
    ['pt','PT Pendle',function(r){return r.pt==null?D.dash:pct(r.pt,0)},function(r){return r.pt==null?-1:r.pt},''],
    ['lltv','LLTV',function(r){return r.lltv==null?D.dash:f2(r.lltv,3)},function(r){return r.lltv==null?-1:r.lltv},''],
    ['mk','Markets',function(r){return f2(r.mk,1)},function(r){return r.mk},'']
  ],function(){return CUR},{sort:'aum',empty:'Waiting for live data.'});
  t.draw();
}

function renderWhisker(){
  var rows=BL.vh.slice(0,22).map(function(v){
    return {name:v.v.length>26?v.v.slice(0,25)+'…':v.v, med:v.med,
      lo:Math.max(0,v.med-v.iqr/2), hi:v.med+v.iqr/2, tag:f2(v.med)+'%'};});
  D.dotWhisker('whisker',rows,8,function(t){return f2(t,0)+'%'});
}

function renderFeeBars(){
  var box=$('feebars'); box.innerHTML='';
  var rows=(live?CUR:BL.curators.map(function(c){return {c:c.c,apy:c.apy,fee:c.fee,aum:c.aum}}))
    .slice().sort(function(a,b){return b.fee-a.fee});
  rows.forEach(function(r){
    box.appendChild(D.el('div','bline',
      '<span class="cname">'+esc(r.c)+'</span>'+
      '<span class="trk"><span class="base"></span>'+
        '<span class="seg" style="top:5px;height:3px;left:0;width:'+Math.min(100,r.apy/8*100).toFixed(1)+'%"></span>'+
        '<span class="seg" style="top:12px;height:3px;left:0;width:'+Math.min(100,r.fee/25*100).toFixed(1)+'%;background:var(--fg-3)"></span>'+
      '</span>'+
      '<span class="cval">'+f2(r.apy)+'% <span class="d">/ '+f2(r.fee,1)+'%</span></span>'));
  });
  $('feebars-lg').innerHTML='<span><i class="now"></i>rate delivered, scale to 8% a year</span>'+
    '<span><i style="background:var(--fg-3);border:0"></i>curator fee, scale to 25%</span>';
}

function renderBad(){
  var rows=live?BAD:BL.bad.map(function(b){
    return {name:b.v,chain:b.chain,asset:b.asset,aum:b.aum,apy:null,fee:null,share:null,listed:null};});
  var t=D.Table('tbad',[
    ['name','Vault',function(r){return esc(r.name)},function(r){return r.name},''],
    ['chain','Chain',function(r){return esc(r.chain)},function(r){return r.chain},''],
    ['asset','Asset',function(r){return esc(r.asset||'')},function(r){return r.asset||''},''],
    ['listed','Listed',function(r){return r.listed==null?D.dash:(r.listed?'yes':'no')},
      function(r){return r.listed==null?-1:(r.listed?1:0)},
      function(r){return r.listed===false?'neg':''}],
    ['aum','Assets',function(r){return usd(r.aum)},function(r){return r.aum},''],
    ['share','Share price',function(r){return r.share==null?D.dash:'$'+f2(r.share)},
      function(r){return r.share==null?-1:r.share},
      function(r){return (r.share!=null&&r.share>2)?'neg':''}],
    ['apy','Rate as returned',function(r){return r.apy==null?D.dash:f2(r.apy)+'%'},
      function(r){return r.apy==null?-1:r.apy},'neg'],
    ['fee','Fee',function(r){return r.fee==null?D.dash:f2(r.fee,1)+'%'},function(r){return r.fee==null?-1:r.fee},'']
  ],function(){return rows},{sort:'aum',empty:'No vault is currently quoting an unreadable rate.'});
  t.draw();
  var n=$('badnote');
  if(n){
    if(!live){ n.textContent=''; return; }
    var okListed=VAULTS.filter(function(v){return v.listed}).length;
    n.innerHTML='Of the '+(VAULTS.length+BAD.length)+' vaults above one million dollars, '+
      BAD.length+' quote a rate this page will not use, and not one of them is listed on Morpho\'s own '+
      'interface: all '+okListed+' listed vaults in the sample quote a plausible rate. '+
      'The share price column is the reason. A vault denominated in a dollar asset should price its share '+
      'near one dollar, as every included vault does. These price theirs in the hundreds, and the API derives '+
      'the rate from share price growth, so a share that climbed from about a dollar to several hundred '+
      'annualises into the figures on the right. The rate is an artefact of the share price, not yield anyone received.';
  }
}

/* ---------- vault explorer ---------- */
var q='', curPick='all', vt;
function vaultRows(){
  var s=q.toLowerCase();
  return VAULTS.filter(function(v){
    if(curPick!=='all'&&v.cur!==curPick)return false;
    if(!s)return true;
    return (v.name+' '+v.sym+' '+v.asset+' '+v.chain+' '+v.cur).toLowerCase().indexOf(s)>=0;});
}
function buildExplorer(){
  vt=D.Table('tvaults',[
    ['name','Vault',function(r){return esc(r.name)},function(r){return r.name},''],
    ['cur','Curator',function(r){return esc(r.cur)},function(r){return r.cur},''],
    ['chain','Chain',function(r){return esc(r.chain)},function(r){return r.chain},''],
    ['asset','Asset',function(r){return esc(r.asset)},function(r){return r.asset},''],
    ['aum','Assets',function(r){return usd(r.aum)},function(r){return r.aum},''],
    ['apy','Rate',function(r){return f2(r.apy)+'%'},function(r){return r.apy},'mark'],
    ['ex','Without rewards',function(r){return f2(r.ex)+'%'},function(r){return r.ex},''],
    ['fee','Fee',function(r){return f2(r.fee,1)+'%'},function(r){return r.fee},''],
    ['blue','Blue chip',function(r){return r.blue==null?D.dash:pct(r.blue,0)},function(r){return r.blue==null?-1:r.blue},''],
    ['lltv','LLTV',function(r){return r.lltv==null?D.dash:f2(r.lltv,3)},function(r){return r.lltv==null?-1:r.lltv},'']
  ],vaultRows,{sort:'aum',perPage:25,empty:VAULTS.length?'Nothing matches that filter.':'Waiting for live data.',
    onDraw:function(total,pages,page){
      $('cnt').textContent=total.toLocaleString('en-US')+(total===1?' vault':' vaults');
      $('pg').textContent=total?('page '+(page+1)+' of '+pages+', showing '+(page*25+1)+' to '+
        Math.min(total,(page+1)*25)):'';
      $('prev').disabled=page<=0; $('next').disabled=page>=pages-1;}});
  $('prev').addEventListener('click',function(){vt.state.page--;vt.draw();
    $('sec-vaults').scrollIntoView({behavior:'smooth',block:'start'})});
  $('next').addEventListener('click',function(){vt.state.page++;vt.draw();
    $('sec-vaults').scrollIntoView({behavior:'smooth',block:'start'})});
  $('q').addEventListener('input',function(){q=this.value;vt.reset();vt.draw()});
}
function refreshChips(){
  var opts=[['all','All']].concat(CUR.map(function(c){return [c.c,c.c]}));
  D.chips('chips',opts,curPick,function(v){curPick=v;vt.reset();vt.draw()});
}

/* ---------- boot ---------- */
renderWhisker(); renderHero(); renderDrift(); renderCurators(); renderFeeBars(); renderBad();
buildExplorer(); refreshChips(); vt.draw(); D.theme();

function refresh(){
  $('refresh').disabled=true; D.setStatus('','loading live data'); D.clearError();
  var t0=Date.now();
  load().then(function(){
    renderHero(); renderDrift(); renderCurators(); renderFeeBars(); renderBad();
    refreshChips(); vt.reset(); vt.draw();
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
