const $=id=>document.getElementById(id);
let chart,china,provinces=[],regions=new Map(),allCities=[],selected=new Set(),current='',mode='province';
function readPreference(key,fallback){try{return localStorage.getItem(key)??fallback}catch{return fallback}}
function savePreference(key,value){try{localStorage.setItem(key,value)}catch{}}
let theme=readPreference('atlas-theme','light')==='light'?'light':'dark';
let showBoundary=readPreference('atlas-boundary','true')!=='false';
let showLabels=readPreference('atlas-city-labels','true')!=='false';
const MIN_ZOOM=.7,MAX_ZOOM=20;
function applyTheme(){document.documentElement.dataset.theme=theme;$('theme-toggle').textContent=theme==='dark'?'切换浅色':'切换深色';$('theme-toggle').setAttribute('aria-pressed',String(theme==='light'))}
function updateZoom(){drawBoundary();const zoom=chart.getOption().series[0].zoom||1;$('zoom-level').textContent=zoom.toFixed(1)+'×';$('zoom-out').disabled=zoom<=MIN_ZOOM+.001;$('zoom-in').disabled=zoom>=MAX_ZOOM-.001}
function changeZoom(factor){const old=chart.getOption().series[0].zoom||1;const next=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,old*factor));chart.dispatchAction({type:'geoRoam',seriesIndex:0,zoom:next/old,originX:chart.getWidth()/2,originY:chart.getHeight()/2});updateZoom()}
const special=new Set([110000,120000,310000,500000,710000,810000,820000]);
const collection=features=>({type:'FeatureCollection',features});
const code=f=>String(f.properties.adcode);
const name=f=>f.properties.name;
function cities(){return current?regions.get(current):allCities}
function toggle(id){selected.has(id)?selected.delete(id):selected.add(id);persistFootprints();render(false);if(selected.has(id))openNote(id);else if(focusedCity===id)updateNoteToggle();}
function switchRegion(id){current=id;mode=id?'city':mode;$('province').value=id;render(true)}
function render(reset){
  const detailed=mode==='city';
  const colors=theme==='light'?{land:'#d7dfe8',border:'#a4b1c1',lit:'#e5a647',litBorder:'#996619',label:'#526277',litLabel:'#35290e',tooltip:'#ffffff',tooltipText:'#2b3747',hover:'#bdcee3',hoverLabel:'#294567'}:{land:'#404d5e',border:'#6b7a8e',lit:'#2dd4bf',litBorder:'#99f6e4',label:'#b8c2d0',litLabel:'#103e38',tooltip:'#292f39',tooltipText:'#dce2eb',hover:'#627793',hoverLabel:'#eef2f7'};
  const foreground=current?regions.get(current):detailed?allCities:china.features;
  const key=current||mode; const context=current?[provinces.find(f=>code(f)===current)]:china.features; let minX=180,minY=90,maxX=-180,maxY=-90; function bounds(a){if(typeof a[0]==='number'){minX=Math.min(minX,a[0]);maxX=Math.max(maxX,a[0]);minY=Math.min(minY,a[1]);maxY=Math.max(maxY,a[1]);}else a.forEach(bounds)} context.forEach(f=>bounds(f.geometry.coordinates)); const boundingCoords=[[minX,maxY],[maxX,minY]];
  const background=detailed?context.map((f,i)=>({...f,properties:{...f.properties,name:'__background_'+i,background:true}})):[];
  const features=[...background,...foreground];
  if(reset){echarts.registerMap(key,collection(features));chart.clear()}
  const data=features.map(f=>{
    if(f.properties.background)return {name:name(f),value:0,tooltip:{show:false},label:{show:false},emphasis:{disabled:true,label:{show:false}},itemStyle:{areaColor:colors.land,borderColor:colors.border,borderWidth:.7}};
    const active=detailed?selected.has(code(f)):(regions.get(code(f))||[]).some(c=>selected.has(code(c)));
    return {name:name(f),value:active?1:0,itemStyle:{areaColor:active?colors.lit:colors.land,borderColor:active?colors.litBorder:colors.border},label:{color:active?colors.litLabel:colors.label}};
  });
  chart.setOption({animation:false,animationDurationUpdate:180,tooltip:{trigger:'item',backgroundColor:colors.tooltip,borderColor:colors.border,textStyle:{color:colors.tooltipText},formatter:p=>p.name&&!p.name.startsWith('__background_')? p.name+'<br/>'+(detailed?(p.value?'点击取消点亮':'点击点亮'):'点击查看城市'):''},series:[{type:'map',map:key,boundingCoords,roam:true,scaleLimit:{min:MIN_ZOOM,max:MAX_ZOOM},selectedMode:false,layoutCenter:['50%','49%'],layoutSize:current?'86%':'97%',label:{show:!detailed||showLabels,fontSize:detailed?12:10},labelLayout:{hideOverlap:true},itemStyle:{borderWidth:.7},emphasis:{label:{show:!detailed||showLabels,color:colors.hoverLabel},itemStyle:{areaColor:colors.hover,borderColor:colors.litBorder,borderWidth:1.3}},data}]});
  $('label-control').hidden=!detailed;$('show-labels').checked=showLabels;updateZoom();
  $('map-title').textContent=current?name(provinces.find(f=>code(f)===current)):'中国地图';
  $('instruction').textContent=detailed?'点击城市区域或列表，点亮 / 取消点亮':'点击省份，探索并点亮城市';
  $('back').hidden=!current;
  $('province-mode').classList.toggle('active',!detailed);$('city-mode').classList.toggle('active',detailed);
  $('province-mode').setAttribute('aria-pressed',String(!detailed));$('city-mode').setAttribute('aria-pressed',String(detailed));
  $('total').textContent=selected.size;$('clear').disabled=!selected.size;
  $('list-title').textContent=detailed?'点亮城市':'选择一个省份';
  $('list-hint').textContent=current&&[710000,810000,820000].includes(Number(current))?'此地区暂按整体点亮，未细分城市。':detailed?'再次点击已点亮的城市，即可取消。':'进入省份后，点击地图或下方城市名称即可点亮。';
  const list=detailed?cities():provinces;
  $('region-count').textContent=detailed?list.filter(f=>selected.has(code(f))).length+' / '+list.length:list.length+' 个地区';
  $('city-list').replaceChildren(...list.map(f=>{const b=document.createElement('button');b.className='city'+(detailed&&selected.has(code(f))?' on':'');b.textContent=name(f);if(detailed)b.setAttribute('aria-pressed',selected.has(code(f)));b.onclick=()=>detailed?toggle(code(f)):switchRegion(code(f));return b}));
  renderSaved();renderSearch();if(focusedCity)updateNoteToggle();
}
async function init(){
try{
  applyTheme();
  $('theme-toggle').onclick=()=>{theme=theme==='dark'?'light':'dark';applyTheme();savePreference('atlas-theme',theme);if(chart)render(false)};
  const res=await fetch('data/china.json');if(!res.ok)throw Error();china=await res.json();
  provinces=china.features.filter(f=>f.properties.level==='province');
  await Promise.all(provinces.map(async p=>{
    let features;
    if(special.has(Number(code(p))))features=[p];
    else{const r=await fetch('data/'+code(p)+'.json');if(!r.ok)throw Error(name(p));const d=await r.json();features=d.features.filter(f=>f.properties.level==='city' && Number(f.properties.adcode)%100===0);}
    regions.set(code(p),features);
  }));
  allCities=provinces.flatMap(p=>regions.get(code(p)));
  provinces.forEach(p=>regions.get(code(p)).forEach(f=>cityProvince.set(code(f),code(p))));
  restoreFootprints();
  provinces.forEach(f=>{const o=document.createElement('option');o.value=code(f);o.textContent=name(f);$('province').append(o)});
  chart=echarts.init($('map'));
  chart.on('georoam',updateZoom);
  $('show-boundary').onchange=e=>{showBoundary=e.target.checked;savePreference('atlas-boundary',String(showBoundary));drawBoundary()};
  $('show-labels').onchange=e=>{showLabels=e.target.checked;savePreference('atlas-city-labels',String(showLabels));render(false)};
  $('zoom-in').onclick=()=>changeZoom(1.5);$('zoom-out').onclick=()=>changeZoom(1/1.5);
  chart.on('click',p=>{if(!p.name)return;if(mode==='province'){const f=provinces.find(f=>name(f)===p.name);if(f)switchRegion(code(f))}else{const f=cities().find(f=>name(f)===p.name);if(f)toggle(code(f))}});
  $('province').onchange=e=>switchRegion(e.target.value);
  $('province-mode').onclick=()=>{mode='province';current='';$('province').value='';render(true)};
  $('city-mode').onclick=()=>{mode='city';render(true)};
  $('back').onclick=()=>{current='';$('province').value='';render(true)};
  $('reset-view').onclick=()=>render(true);
  $('clear').onclick=()=>{selected.clear();persistFootprints();render(false);notify('已清空点亮，城市手记仍保留')};
  $('city-search').oninput=renderSearch;
  $('visit-date').oninput=saveNote;$('city-note').oninput=saveNote;
  $('close-note').onclick=()=>{$('note-editor').hidden=true;focusedCity=''};
  $('note-toggle').onclick=()=>toggle(focusedCity);
  $('export-map').disabled=false;$('export-map').onclick=exportMap;
  new ResizeObserver(()=>{chart.resize();drawBoundary()}).observe($('map'));
  $('loading').hidden=true;render(true);
}catch(e){$('loading').textContent='地图加载失败，请刷新页面重试。';console.error(e)}
}


const FOOTPRINT_KEY='atlas-footprints-v1';
let notes={},focusedCity='',toastTimer;
const cityProvince=new Map();
function notify(message){$('status').textContent=message;$('status').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('status').hidden=true},3200)}
function persistFootprints(){
  try{localStorage.setItem(FOOTPRINT_KEY,JSON.stringify({version:1,selected:[...selected],notes}));$('save-status').textContent='已自动保存到当前浏览器';return true}
  catch{$('save-status').textContent='保存失败：浏览器存储不可用';notify('无法保存记录，请检查浏览器存储空间或权限');return false}
}
function restoreFootprints(){
  try{
    const raw=localStorage.getItem(FOOTPRINT_KEY);if(!raw)return;
    const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.selected)||!data.notes||typeof data.notes!=='object')throw Error('invalid');
    const valid=new Set(allCities.map(code));
    selected=new Set(data.selected.filter(id=>typeof id==='string'&&valid.has(id)));
    for(const [id,n] of Object.entries(data.notes)){if(valid.has(id)&&n&&typeof n==='object')notes[id]={date:typeof n.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(n.date)?n.date:'',text:typeof n.text==='string'?n.text.slice(0,2000):''}}
    $('save-status').textContent='已恢复本地足迹';
  }catch{$('save-status').textContent='未能读取本地记录';notify('本地记录无法读取，请检查浏览器存储')}
}
function cityById(id){return allCities.find(f=>code(f)===id)}
function openNote(id){
  const f=cityById(id);if(!f)return;focusedCity=id;
  $('note-editor').hidden=false;$('note-title').textContent=name(f)+' · 城市手记';
  $('visit-date').value=notes[id]?.date||'';$('city-note').value=notes[id]?.text||'';
  $('note-length').textContent=$('city-note').value.length+' / 2000';updateNoteToggle();
}
function updateNoteToggle(){$('note-toggle').textContent=selected.has(focusedCity)?'已点亮 · 点击取消':'点亮这座城市';$('note-toggle').setAttribute('aria-pressed',String(selected.has(focusedCity)))}
function saveNote(){
  if(!focusedCity||!$('visit-date').validity.valid)return;
  const text=$('city-note').value.slice(0,2000),date=$('visit-date').value;
  if(text||date)notes[focusedCity]={text,date};else delete notes[focusedCity];
  $('note-length').textContent=text.length+' / 2000';persistFootprints();renderSaved();
}
function renderSaved(){
  const lit=allCities.filter(f=>selected.has(code(f)));
  $('selected-list').replaceChildren(...lit.map(f=>{
    const row=document.createElement('div');row.className='saved-row';
    const b=document.createElement('button');b.className='saved-city';b.textContent=name(f);
    const meta=document.createElement('small');const n=notes[code(f)];
    meta.textContent=n?.date|| (n?.text?'已有旅行感想':'添加日期与手记');b.append(meta);b.onclick=()=>locateCity(code(f),false);
    const remove=document.createElement('button');remove.className='remove-city';remove.textContent='×';remove.setAttribute('aria-label','取消点亮'+name(f));remove.onclick=()=>toggle(code(f));
    row.append(b,remove);return row;
  }));
  if(!lit.length){const p=document.createElement('span');p.className='empty';p.textContent='从一座去过的城市开始。';$('selected-list').append(p)}
}
function searchCities(query){
  const q=query.trim().toLowerCase();if(!q)return [];
  return allCities.filter(f=>name(f).toLowerCase().includes(q)).sort((a,b)=>(name(a)===q?-1:name(b)===q?1:0));
}
function renderSearch(){
  const q=$('city-search').value||'',matches=searchCities(q);
  $('search-results').hidden=!q.trim();
  $('search-results').replaceChildren(...matches.map(f=>{
    const row=document.createElement('div');row.className='search-row';
    const location=document.createElement('button');location.className='search-location';location.textContent=name(f);
    const sub=document.createElement('small');sub.textContent=name(provinces.find(p=>code(p)===cityProvince.get(code(f))));location.append(sub);
    location.setAttribute('aria-label','定位'+name(f));location.onclick=()=>locateCity(code(f),false);
    const light=document.createElement('button');light.className='search-light';light.textContent=selected.has(code(f))?'已点亮':'点亮';light.setAttribute('aria-label','点亮并定位'+name(f));light.onclick=()=>locateCity(code(f),true);
    row.append(location,light);return row;
  }));
  if(q.trim()&&!matches.length){const p=document.createElement('p');p.className='empty';p.textContent='没有找到城市，请输入地级市中文名称。';$('search-results').append(p)}
}
function locateCity(id,light){
  const f=cityById(id);if(!f)return;
  if(light){selected.add(id);persistFootprints()}
  switchRegion(cityProvince.get(id));openNote(id);
  const point=f.properties.centroid||f.properties.center;
  if(point)chart.setOption({series:[{center:point,zoom:2.2}]});
  chart.dispatchAction({type:'downplay',seriesIndex:0});chart.dispatchAction({type:'highlight',seriesIndex:0,name:name(f)});updateZoom();
  $('note-editor').scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function exportMap(){
  const button=$('export-map');button.disabled=true;button.textContent='正在生成高清全国地图…';
  let exportChart,host;
  try{
    const light=theme==='light',background=light?'#edf1f5':'#252c35',ink=light?'#2b3747':'#dce2eb';
    const land=light?'#d7dfe8':'#404d5e',border=light?'#a4b1c1':'#6b7a8e',lit=light?'#e5a647':'#2dd4bf';
    // Fit the full source extent, including offshore islands, to a dedicated canvas.
    let west=180,east=-180,south=90,north=-90;
    function bounds(coords){if(typeof coords[0]==='number'){west=Math.min(west,coords[0]);east=Math.max(east,coords[0]);south=Math.min(south,coords[1]);north=Math.max(north,coords[1]);}else coords.forEach(bounds)}
    china.features.forEach(f=>bounds(f.geometry.coordinates));
    const width=4096,padding=64,top=136,bottom=100;
    const ratio=(east-west)*.75/(north-south);
    const mapHeight=Math.ceil((width-padding*2)/ratio),height=mapHeight+top+bottom;
    const base=china.features.map((f,i)=>({...f,properties:{...f.properties,name:'__export_background_'+i,background:true}}));
    const features=[...base,...allCities];
    const mapName='atlas-full-country-export';echarts.registerMap(mapName,collection(features));
    host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none;';host.setAttribute('aria-hidden','true');document.body.append(host);
    exportChart=echarts.init(host,null,{renderer:'canvas',width,height,devicePixelRatio:1});
    exportChart.setOption({
      animation:false,backgroundColor:background,
      series:[{type:'map',map:mapName,boundingCoords:[[west,north],[east,south]],aspectScale:.75,
        left:padding,right:padding,top,bottom,zoom:1,roam:false,silent:true,
        label:{show:showLabels,fontSize:24,color:light?'#526277':'#b8c2d0'},labelLayout:{hideOverlap:true},
        emphasis:{disabled:true},itemStyle:{areaColor:land,borderColor:border,borderWidth:1.3},
        data:features.map(f=>f.properties.background?{name:name(f),label:{show:false}}:{
          name:name(f),itemStyle:{areaColor:selected.has(code(f))?lit:land,borderColor:selected.has(code(f))?(light?'#996619':'#99f6e4'):border},
          label:{color:selected.has(code(f))?(light?'#35290e':'#103e38'):(light?'#526277':'#b8c2d0')}
        })
      }]
    });
    const zr=exportChart.getZr();
    function addText(text,x,y,font=28,color=ink){zr.add(new echarts.graphic.Text({silent:true,z:110,x,y,style:{text,fill:color,font:font+'px "Microsoft YaHei",sans-serif'}}))}
    addText('山河足迹 · 中国全图',padding,42,42);
    addText('已点亮 '+selected.size+' 座城市',width-470,50,30);
    if(showBoundary){
      const lineColor=light?'#b36932':'#e0ac7f';
      const points=QINLING_HUAIHE.map(p=>exportChart.convertToPixel({seriesIndex:0},p));
      zr.add(new echarts.graphic.Polyline({silent:true,z:100,shape:{points},style:{stroke:background,lineWidth:9,fill:null}}));
      zr.add(new echarts.graphic.Polyline({silent:true,z:101,shape:{points},style:{stroke:lineColor,lineWidth:5,lineDash:[16,10],fill:null}}));
      for(const [text,coord] of [['秦岭',[108,34.55]],['淮河',[116.5,33.45]],['北方',[112.8,35.4]],['南方',[112.8,30.9]]]){
        const p=exportChart.convertToPixel({seriesIndex:0},coord);addText(text,p[0],p[1],28,lineColor);
      }
    }
    addText('边界数据：阿里云 DataV · 示意地图'+(showBoundary?' · 秦岭—淮河线为大致示意':''),padding,height-62,25);
    zr.flush();
    const canvas=exportChart.getRenderedCanvas({pixelRatio:1,backgroundColor:background});
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG failed');
    const downloadUrl=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=downloadUrl;link.download='山河足迹-中国全图-4096px.png';document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(downloadUrl),10000);
    notify('已导出高清中国全图（'+width+' × '+height+'）');
  }catch(e){console.error(e);notify('图片导出失败，请重试')}
  finally{exportChart?.dispose();host?.remove();button.disabled=false;button.textContent='导出高清全图'}
}


/* Hand-authored geographic approximation, not surveyed river/ridge geometry.
   Reference: https://www.csgpc.org/detail/24448.html
   East of Hongze Lake the line is an approximate geographical continuation. */
const QINLING_HUAIHE=[
 [103.7,34.55],[104.5,34.4],[105.3,34.3],[106.2,34.15],
 [107.0,33.95],[107.8,33.95],[108.6,33.85],[109.4,33.85],
 [110.2,33.7],[111.0,33.65],[111.8,33.5],[112.45,33.15],
 [113.0,32.65],[113.3,32.4],[113.9,32.42],[114.5,32.48],
 [115.0,32.43],[115.5,32.45],[116.0,32.55],[116.35,32.7],
 [116.8,32.65],[117.35,32.93],[117.9,33.08],[118.35,33.3],
 [118.8,33.45],[119.1,33.6],[119.65,33.75],[120.25,34.0]
];
let boundaryGraphic;
function drawBoundary(){
 $('show-boundary').checked=showBoundary;document.querySelector('.boundary-key').hidden=!showBoundary;document.querySelector('.boundary-note').hidden=!showBoundary;
 if(!showBoundary){if(chart&&boundaryGraphic)chart.getZr().remove(boundaryGraphic);boundaryGraphic=null;return}
 if(!chart||!chart.getOption().series?.length)return;
 const points=QINLING_HUAIHE.map(p=>chart.convertToPixel({seriesIndex:0},p));
 if(points.some(p=>!p||!p.every(Number.isFinite)))return;
 const color=theme==='light'?'#b36932':'#e0ac7f';
 const elements=[
  {type:'polyline',z:100,silent:true,shape:{points},style:{stroke:theme==='light'?'#edf1f5':'#252c35',lineWidth:5,fill:null}},
  {type:'polyline',z:100,silent:true,shape:{points},style:{stroke:color,lineWidth:2.5,lineDash:[8,5],fill:null}}
 ];
 for(const [text,coord] of [['秦岭',[108,34.55]],['淮河',[116.5,33.45]],['北方',[112.8,35.4]],['南方',[112.8,30.9]]]){
  const p=chart.convertToPixel({seriesIndex:0},coord);
  if(p&&p[0]>25&&p[0]<chart.getWidth()-25&&p[1]>18&&p[1]<chart.getHeight()-18)
   elements.push({type:'text',z:101,silent:true,x:p[0],y:p[1],style:{text,fill:color,font:'13px "Microsoft YaHei",sans-serif',align:'center',verticalAlign:'middle',backgroundColor:theme==='light'?'#edf1f5e6':'#252c35e6',padding:[3,5]}});
 }
 if(boundaryGraphic)chart.getZr().remove(boundaryGraphic);
 boundaryGraphic=new echarts.graphic.Group({silent:true});
 boundaryGraphic.setClipPath(new echarts.graphic.Rect({shape:{x:0,y:0,width:chart.getWidth(),height:chart.getHeight()}}));
 elements.forEach(e=>boundaryGraphic.add(e.type==='polyline'?new echarts.graphic.Polyline(e):new echarts.graphic.Text(e)));
 chart.getZr().add(boundaryGraphic);
}

init();


