const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const src=process.argv[2], out=process.argv[3], running=process.argv[4]||'';
  const body=fs.readFileSync(src,'utf8');
  const print=`<style>
  @page{size:A4;margin:20mm 18mm 18mm}
  body{background:#fff!important;font-size:10.5pt!important;line-height:1.45!important}
  .paper{max-width:none!important;padding:0!important}
  #tt{display:none!important}
  h1{font-size:23pt!important}
  section > h2{font-size:13pt!important;break-after:avoid}
  h3{font-size:11pt!important;break-after:avoid}
  .titleblock{break-after:avoid}
  .abstract{break-inside:avoid;background:#F4F4F2!important}
  nav.toc{break-after:page}
  nav.toc ol{columns:3!important;column-gap:22px!important}
  nav.toc li{font-size:9pt!important;margin-bottom:3px!important}
  .abstract{padding:14px 16px!important}
  .abstract p{font-size:9.8pt!important}
  dl.meta{gap:8px 20px!important}
  dl.meta dd{font-size:9.5pt!important}
  section{margin-bottom:16px!important}
  figure,.tbl{break-inside:avoid}
  figcaption,.tcap,.tnote{font-size:8.7pt!important}
  table{min-width:0!important;font-size:8.6pt!important}
  thead th{font-size:7.6pt!important;padding:0 5px 5px!important}
  tbody td{padding:5px!important}
  .smallmult{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}
  .sm{min-width:0!important}
  .sm svg{width:100%!important}
  .sm p{font-size:8pt!important}
  .sm h4{min-height:2.5em!important;align-items:flex-start!important}
  .legend{font-size:8.6pt!important}
  .cval{font-size:8.6pt!important}
  .bline{grid-template-columns:minmax(80px,120px) minmax(0,1fr) 76px!important}
  .lines text{font-size:7.6pt!important}
  ol.refs li,.files2 a{font-size:9pt!important}
  p,ul,ol{max-width:none!important}
  </style>`;
  const tmp=src.replace(/\.html$/,'_pdf.html');
  fs.writeFileSync(tmp,'<!doctype html><html data-theme="light"><head><meta charset="utf-8"><style>body{margin:0}img{max-width:100%}</style></head><body>'+body+print+'</body></html>');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({colorScheme:'light'})).newPage();
  await p.goto('file://'+process.cwd()+'/'+tmp);
  await p.waitForTimeout(2600);
  const head = `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#8A8A8A;padding:0 18mm;display:flex;justify-content:space-between;">
    <span>${running}</span><span>Illia Sharan (Wandor)</span></div>`;
  const foot = `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#8A8A8A;padding:0 18mm;display:flex;justify-content:space-between;">
    <span>September 2026</span><span class="pageNumber"></span></div>`;
  await p.pdf({ path: out, format:'A4', printBackground:true, displayHeaderFooter:true,
    headerTemplate:head, footerTemplate:foot,
    margin:{top:'20mm',bottom:'18mm',left:'18mm',right:'18mm'} });
  await b.close(); console.log('pdf ok', out);
})();
