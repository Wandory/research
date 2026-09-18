<script>
/* Shared core for the four live panels. Formatting, fetch, charts, sortable
   and paginated tables. Panels supply only their data and their columns. */
var DASH=(function(){
"use strict";
var $=function(id){return document.getElementById(id)};
var el=function(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e};
var num=function(v){var n=parseFloat(v);return isFinite(n)?n:0};
var f2=function(v,d){return (+v).toFixed(d===undefined?2:d)};
var pct=function(v,d){return (v*100).toFixed(d===undefined?1:d)+'%'};
var usd=function(v){var a=Math.abs(v);
  if(a>=1e9)return '$'+(v/1e9).toFixed(2)+'B';
  if(a>=1e6)return '$'+(v/1e6).toFixed(a>=1e8?0:1)+'M';
  if(a>=1e3)return '$'+(v/1e3).toFixed(0)+'k';
  return '$'+(+v).toFixed(0);};
var esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
var dash='&mdash;';

function timeout(ms){return new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'))},ms)})}
function getJSON(u,ms){return Promise.race([fetch(u,{cache:'no-store'}).then(function(r){
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}),timeout(ms||25000)]);}
function postJSON(u,body,ms){return Promise.race([fetch(u,{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}),timeout(ms||25000)]);}

function setStatus(kind,msg){var s=$('stat');if(s)s.innerHTML='<i class="'+kind+'"></i> '+msg}
function setStamp(t){var s=$('stamp');if(s)s.textContent=t}
function showError(msg){var b=$('errbox');if(b)b.innerHTML='<p class="err"><b>This page could not reach the API</b> ('+
  esc(msg)+'), so the live figures are empty and only the published baseline is shown. That normally means the page '+
  'is running somewhere outbound requests are blocked, or the source is down. Open the file directly in a browser, '+
  'or serve it over http, and it will fill in.</p>';}
function clearError(){var b=$('errbox');if(b)b.innerHTML=''}

/* hero: [label, value, sub] */
function hero(cells){
  $('hero').innerHTML=cells.map(function(c){
    return '<div class="num"><span class="lb">'+c[0]+'</span><b>'+c[1]+'</b><span class="sub">'+c[2]+'</span></div>';
  }).join('');
}

/* dumbbell: rows [{name, then, now}], lo = scale floor, fmt */
function dumbbell(host,legend,rows,lo,fmt,thenLabel,nowLabel){
  var box=$(host); box.innerHTML='';
  var hi=1; rows.forEach(function(r){hi=Math.max(hi,r.then,(r.now==null?0:r.now))});
  var px=function(v){return Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100))};
  rows.forEach(function(r){
    var a=px(r.then), b=r.now==null?a:px(r.now);
    var d=r.now==null?null:(r.now-r.then);
    box.appendChild(el('div','bline',
      '<span class="cname">'+esc(r.name)+'</span>'+
      '<span class="trk"><span class="base"></span>'+
        (r.now==null?'':'<span class="seg" style="left:'+Math.min(a,b)+'%;width:'+Math.abs(b-a)+'%"></span>')+
        '<span class="pt then" style="left:'+a+'%"></span>'+
        (r.now==null?'':'<span class="pt now" style="left:'+b+'%"></span>')+'</span>'+
      '<span class="cval">'+(r.now==null?dash:fmt(r.now))+
        ' <span class="d">was '+fmt(r.then)+'</span><br>'+
        (d==null?'<span class="d">'+dash+'</span>'
               :'<span class="'+(d<0?'dn':'d')+'">'+(d>=0?'+':'')+fmt(d)+'</span>')+'</span>'));
  });
  if(legend)$(legend).innerHTML='<span><i class="then"></i>'+esc(thenLabel)+'</span>'+
    '<span><i class="now"></i>'+esc(nowLabel)+'</span>'+
    '<span>scale starts at '+fmt(lo)+'</span>';
}

/* small multiples: one series per panel, no categorical colour needed */
function smallMultiples(host,months,opts){
  var box=$(host); box.innerHTML='';
  var W=230,H=74,SP=3,lo=opts.lo,hi=opts.hi;
  var xs=function(i){return (i/(months.length-1))*W};
  var ys=function(v){return SP+(1-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo))*(H-2*SP)};
  var grid=el('div','sm-grid');
  opts.series.forEach(function(sr){
    var segs=[],cur=[];
    for(var i=0;i<months.length;i++){var v=sr.v[i];
      if(v===null||v===undefined){if(cur.length){segs.push(cur);cur=[]}continue}
      cur.push([xs(i),ys(v)]);}
    if(cur.length)segs.push(cur);
    var g='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="'+esc(sr.n)+'">';
    if(opts.ref!==undefined)
      g+='<line class="gridline" x1="0" y1="'+ys(opts.ref).toFixed(1)+'" x2="'+W+'" y2="'+
         ys(opts.ref).toFixed(1)+'" stroke-dasharray="2 3" opacity=".8"/>';
    segs.forEach(function(sg){
      if(sg.length<2){g+='<circle cx="'+sg[0][0].toFixed(1)+'" cy="'+sg[0][1].toFixed(1)+'" r="2" fill="var(--accent)"/>';return}
      var d='M'+sg.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1)}).join('L');
      g+='<path d="'+d+'L'+sg[sg.length-1][0].toFixed(1)+','+H+'L'+sg[0][0].toFixed(1)+','+H+'Z" fill="var(--accent)" opacity=".13"/>';
      g+='<path d="'+d+'" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>';
    });
    g+='<rect class="smhit" x="0" y="0" width="'+W+'" height="'+H+'" fill="transparent"/></svg>';
    var cell=el('div','sm','<h4><span class="smn">'+esc(sr.n)+'</span><span class="smv">'+esc(sr.tag)+'</span></h4>'+
      '<div class="smc">'+g+'</div><p class="smf">'+esc(sr.foot)+'</p>');
    var cb=cell.querySelector('.smc'), tip=el('div','tip'); cb.appendChild(tip);
    var svg=cb.querySelector('svg');
    svg.addEventListener('mousemove',function(ev){
      var r=svg.getBoundingClientRect();
      var i=Math.max(0,Math.min(months.length-1,Math.round((ev.clientX-r.left)/r.width*(months.length-1))));
      var v=sr.v[i];
      tip.innerHTML='<div class="tt">'+months[i]+'</div><div class="tv">'+
        (v===null||v===undefined?'no data':opts.tip(v))+'</div>';
      tip.classList.add('on');
      var tw=tip.offsetWidth;
      tip.style.left=Math.max(0,Math.min(r.width-tw,(i/(months.length-1))*r.width-tw/2))+'px';
      tip.style.top='-8px';
    });
    svg.addEventListener('mouseleave',function(){tip.classList.remove('on')});
    grid.appendChild(cell);
  });
  box.appendChild(grid);
  box.appendChild(el('p','smaxis','<span>'+months[0]+'</span><span>'+months[months.length-1]+'</span>'));
}

/* dot and whisker: rows [{name, med, lo, hi, tag}] on a shared scale */
function dotWhisker(host,rows,maxX,fmt){
  var box=$(host);
  var rowH=21,padL=176,padR=64,padB=28,W=920,H=rows.length*rowH+padB+10;
  var xs=function(v){return padL+(Math.min(v,maxX)/maxX)*(W-padL-padR)};
  var g='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="rate and its spread by vault">';
  for(var t=0;t<=maxX;t+=maxX/4){
    g+='<line class="gridline" x1="'+xs(t).toFixed(1)+'" y1="4" x2="'+xs(t).toFixed(1)+'" y2="'+(H-padB+4)+'" opacity=".7"/>'+
       '<text x="'+xs(t).toFixed(1)+'" y="'+(H-padB+20)+'" text-anchor="middle">'+fmt(t)+'</text>';
  }
  rows.forEach(function(r,i){
    var y=14+i*rowH;
    g+='<text x="'+(padL-12)+'" y="'+(y+3.5)+'" text-anchor="end" class="dl">'+esc(r.name)+'</text>';
    g+='<line x1="'+xs(r.lo).toFixed(1)+'" y1="'+y+'" x2="'+xs(r.hi).toFixed(1)+'" y2="'+y+
       '" stroke="var(--fg-3)" stroke-width="1.5"/>';
    g+='<circle cx="'+xs(r.med).toFixed(1)+'" cy="'+y+'" r="3.4" fill="var(--accent)"/>';
    g+='<text x="'+(W-padR+10)+'" y="'+(y+3.5)+'" class="dl">'+esc(r.tag)+'</text>';
  });
  box.innerHTML=g+'</svg>';
}

/* sortable table. cols: [key, head, render(row), sortValue(row), className] */
function Table(id,cols,getRows,opts){
  opts=opts||{};
  var state={k:opts.sort||cols[0][0],dir:1,page:0};
  var perPage=opts.perPage||0;
  function draw(){
    var rows=getRows().slice();
    var sc=cols.filter(function(c){return c[0]===state.k})[0]||cols[0];
    rows.sort(function(x,y){var a=sc[3](x),b=sc[3](y);
      return typeof a==='string'?state.dir*String(a).localeCompare(String(b)):state.dir*(b-a);});
    var total=rows.length,pages=1;
    if(perPage){
      pages=Math.max(1,Math.ceil(total/perPage));
      if(state.page>=pages)state.page=pages-1;
      if(state.page<0)state.page=0;
      rows=rows.slice(state.page*perPage,state.page*perPage+perPage);
    }
    var t=$(id);
    t.innerHTML='<thead><tr>'+cols.map(function(c){
      return '<th data-k="'+c[0]+'"'+(c[0]===state.k?(' aria-sort="'+(state.dir===1?'descending':'ascending')+'"'):'')+
        '>'+c[1]+'</th>';}).join('')+'</tr></thead><tbody>'+
      (rows.length?rows.map(function(r){return '<tr>'+cols.map(function(c){
        var cl=typeof c[4]==='function'?c[4](r):(c[4]||'');
        return '<td'+(cl?' class="'+cl+'"':'')+'>'+c[2](r)+'</td>';}).join('')+'</tr>';}).join('')
       :'<tr><td class="empty" colspan="'+cols.length+'">'+(opts.empty||'Nothing to show.')+'</td></tr>')+
      '</tbody>';
    Array.prototype.forEach.call(t.querySelectorAll('th'),function(th){
      th.addEventListener('click',function(){
        if(state.k===th.dataset.k)state.dir*=-1; else {state.k=th.dataset.k;state.dir=1}
        state.page=0; draw();});});
    if(opts.onDraw)opts.onDraw(total,pages,state.page);
  }
  return {draw:draw,reset:function(){state.page=0},state:state};
}

/* plain-text chip row */
function chips(host,options,current,onPick){
  var h=$(host);
  h.innerHTML=options.map(function(o){
    return '<button class="plain'+(o[0]===current?' on':'')+'" type="button" data-v="'+esc(o[0])+'">'+esc(o[1])+'</button>';
  }).join('');
  Array.prototype.forEach.call(h.querySelectorAll('button'),function(b){
    b.addEventListener('click',function(){
      Array.prototype.forEach.call(h.querySelectorAll('button'),function(x){x.classList.toggle('on',x===b)});
      onPick(b.dataset.v);});});
}

function theme(){
  var b=$('theme'); if(!b)return;
  b.addEventListener('click',function(){
    var c=document.documentElement.getAttribute('data-theme');
    if(!c)c=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    document.documentElement.setAttribute('data-theme',c==='dark'?'light':'dark');});
}

return {$:$,el:el,num:num,f2:f2,pct:pct,usd:usd,esc:esc,dash:dash,
  getJSON:getJSON,postJSON:postJSON,setStatus:setStatus,setStamp:setStamp,
  showError:showError,clearError:clearError,hero:hero,dumbbell:dumbbell,
  smallMultiples:smallMultiples,dotWhisker:dotWhisker,Table:Table,chips:chips,theme:theme};
})();
</script>
