self.onInit=function(){
var ctx=self.ctx;
var _init=function(){
var root=ctx&&ctx.$container&&ctx.$container[0];
if(!root){setTimeout(_init,50);return;}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function toNum(v,d){var n=Number(v);return Number.isFinite(n)?n:d;}
function boolish(v){if(v===true||v===1)return true;var s=String(v==null?'':v).toLowerCase().trim();return s==='1'||s==='true'||s==='yes'||s==='on';}
function fmt(ts){if(!ts)return '\u2014';var d=new Date(ts);if(isNaN(d.getTime()))return '\u2014';function p(n){return n<10?'0'+n:''+n;}return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());}
function rel(ts){if(!ts)return '\u2014';var diff=Math.max(0,Date.now()-ts);var s=Math.floor(diff/1000);if(s<60)return s+' sec ago';var m=Math.floor(s/60);if(m<60)return m+' min ago';var h=Math.floor(m/60);if(h<48)return h+' hrs ago';return Math.floor(h/24)+' days ago';}
function stageCls(s){var v=String(s||'').toLowerCase();if(v==='error'||v==='failed')return 'crit';if(v==='downloading'||v==='installing')return 'info';if(v==='up-to-date'||v==='online (post-check)'||v==='online')return 'ok';return 'warn';}
function pctCls(p){if(p>=85)return 'crit';if(p>=70)return 'warn';return 'ok';}
function _jwt(){var t=localStorage.getItem('jwt_token')||'';if(!t){try{var c=JSON.parse(localStorage.getItem('currentUser')||'{}');t=String(c.token||c.jwtToken||c.jwt||'');}catch(e){}}return t;}
var titleEl=root.querySelector('#dd-title'),subEl=root.querySelector('#dd-sub'),kpiEl=root.querySelector('#dd-kpi'),histEl=root.querySelector('#dd-hist'),backBtn=root.querySelector('#dd-back');
self.__ddState={entityId:null,entityName:null,deviceInfo:null,serverAttrs:{}};
function getStore(){var w=window;if(!w.__SOTA_MGMT_STATE__){w.__SOTA_MGMT_STATE__={selectedItem:null,target:null,selectedCampaign:null,campaigns:[]};}return w.__SOTA_MGMT_STATE__;}
if(backBtn){backBtn.addEventListener('click',function(){try{if(ctx&&ctx.stateController){if(typeof ctx.stateController.navigatePrevState==='function'){ctx.stateController.navigatePrevState(false);}else if(typeof ctx.stateController.openState==='function'){ctx.stateController.openState('default',{},false);}else if(typeof ctx.stateController.updateState==='function'){ctx.stateController.updateState('default',{},false);}}}catch(e){}});}
function kpi(label,val,unit,cls){return '<div class="dd-kpi"><div class="dd-kpi-label">'+esc(label)+'</div><div class="dd-kpi-val '+(cls||'')+'">'+esc(val)+'</div>'+(unit?'<div class="dd-kpi-unit">'+esc(unit)+'</div>':'')+'</div>';}
function renderKpi(data){
  if(!kpiEl)return;
  var vals={};
  var tsKeys=['online','power-state','ota-state','ota-progress-pct','cpu-usage-pct','mem-usage-pct','disk-usage-pct','network-rtt-host-ms','packet-loss-pct','risk-score','incidents-open','uptime-sec','branch','region','sw_version'];
  tsKeys.forEach(function(k){var pts=Array.isArray(data[k])?data[k]:[];if(pts.length){var p=pts[0];vals[k]=p.value!==undefined?p.value:p[1];}});
  var online=boolish(vals['online']);
  var powered=boolish(vals['power-state']);
  var cpu=toNum(vals['cpu-usage-pct'],null);
  var mem=toNum(vals['mem-usage-pct'],null);
  var disk=toNum(vals['disk-usage-pct'],null);
  var rtt=toNum(vals['network-rtt-host-ms'],null);
  var loss=toNum(vals['packet-loss-pct'],null);
  var risk=toNum(vals['risk-score'],null);
  var inc=toNum(vals['incidents-open'],null);
  var otaState=String(vals['ota-state']||'unknown');
  var otaPct=toNum(vals['ota-progress-pct'],null);
  var uptime=toNum(vals['uptime-sec'],null);
  var h='';
  h+=kpi('Status',online?(powered?'Online':'Powered Off'):'Offline','',online&&powered?'ok':'crit');
  h+=kpi('OTA State',otaState,'',stageCls(otaState));
  if(otaPct!==null)h+=kpi('OTA Progress',otaPct.toFixed(0),'%',otaPct>=100?'ok':'info');
  if(cpu!==null)h+=kpi('CPU',cpu.toFixed(1),'%',pctCls(cpu));
  if(mem!==null)h+=kpi('Memory',mem.toFixed(1),'%',pctCls(mem));
  if(disk!==null)h+=kpi('Disk',disk.toFixed(1),'%',pctCls(disk));
  if(rtt!==null)h+=kpi('RTT',rtt.toFixed(0),'ms',rtt>200?'crit':(rtt>80?'warn':'ok'));
  if(loss!==null)h+=kpi('Packet Loss',loss.toFixed(1),'%',loss>5?'crit':(loss>1?'warn':'ok'));
  if(risk!==null)h+=kpi('Risk Score',risk.toFixed(0),'',risk>=70?'crit':(risk>=40?'warn':'ok'));
  if(inc!==null&&inc>0)h+=kpi('Open Incidents',inc,'',inc>0?'crit':'ok');
  if(uptime!==null){var uh=Math.floor(uptime/3600);h+=kpi('Uptime',uh,'hrs','ok');}
  var sAttrs=self.__ddState&&self.__ddState.serverAttrs||{};
  var branch=vals['branch']||vals['region']||sAttrs['branch']||sAttrs['region']||sAttrs['site']||null;
  h+=kpi('Site',branch||'\u2014','','');
  var swVer=vals['sw_version']||null;
  h+=kpi('Software Version',swVer||'\u2014','','');
  var devInfo=self.__ddState&&self.__ddState.deviceInfo;
  h+=kpi('Profile',(devInfo&&devInfo.deviceProfileName)||'\u2014','','');
  h+=kpi('Device ID',(self.__ddState&&self.__ddState.entityId)||'\u2014','','');
  kpiEl.innerHTML=h||'<div style="color:#8aa4be;font-size:12px;padding:8px;">No telemetry available yet.</div>';
}
function renderHistory(data){
  if(!histEl)return;
  var statePoints=Array.isArray(data['ota-state'])?data['ota-state']:[];
  var pctMap={};
  var pctPoints=Array.isArray(data['ota-progress-pct'])?data['ota-progress-pct']:[];
  for(var j=0;j<pctPoints.length;j++){var pp=pctPoints[j];if(pp&&pp.ts!==undefined)pctMap[pp.ts]=pp.value;}
  if(!statePoints.length){histEl.innerHTML='<tr><td colspan="3" class="dd-empty">No OTA history in the last 30 days.</td></tr>';return;}
  var html='';
  for(var i=0;i<statePoints.length;i++){
    var pt=statePoints[i];var ts=pt.ts;var state=pt.value;
    var pct=pctMap[ts];var clsVal=stageCls(state);
    html+='<tr><td>'+esc(fmt(ts))+'<div style="font-size:10px;color:#8aa4be">'+esc(rel(ts))+'</div></td>';
    html+='<td><span class="dd-st '+clsVal+'">'+esc(String(state||'\u2014').toUpperCase())+'</span></td>';
    html+='<td>'+(pct!==undefined?esc(Number(pct).toFixed(0))+'%':'\u2014')+'</td></tr>';
  }
  histEl.innerHTML=html;
}
function loadDevice(entityId,entityName){
  if(!entityId)return;
  self.__ddState.entityId=entityId;self.__ddState.entityName=entityName;self.__ddState.deviceInfo=null;self.__ddState.serverAttrs={};
  if(titleEl)titleEl.textContent='Device Detail';
  if(subEl)subEl.textContent=entityName||entityId;
  if(kpiEl)kpiEl.innerHTML='<div style="color:#8aa4be;font-size:12px;padding:8px;">Loading...</div>';
  if(histEl)histEl.innerHTML='<tr><td colspan="3" class="dd-empty">Loading history...</td></tr>';
  var token=_jwt();
  var hdrs=Object.assign({'Content-Type':'application/json'},token?{'X-Authorization':'Bearer '+token}:{});
  var now=Date.now();
  var start=now-(30*24*3600000);
  var tsKeys='online,power-state,ota-state,ota-progress-pct,cpu-usage-pct,mem-usage-pct,disk-usage-pct,network-rtt-host-ms,packet-loss-pct,risk-score,incidents-open,uptime-sec,branch,region,sw_version';
  var latestUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/timeseries?keys='+tsKeys+'&limit=1&agg=NONE';
  var histUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/timeseries?keys=ota-state,ota-progress-pct&startTs='+start+'&endTs='+now+'&limit=200&agg=NONE&orderBy=DESC';
  var attrUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/attributes/SERVER_SCOPE?keys=branch,region,site';
  fetch('/api/device/info/'+entityId,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(di){if(di)self.__ddState.deviceInfo=di;}).catch(function(){});
  fetch(attrUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(attrs){if(attrs&&Array.isArray(attrs)){self.__ddState.serverAttrs={};attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});}}).catch(function(){});
  fetch(latestUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(d)renderKpi(d);}).catch(function(){if(kpiEl)kpiEl.innerHTML='<div style="color:#8aa4be;font-size:12px;padding:8px;">Could not load telemetry.</div>';});
  fetch(histUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(d)renderHistory(d);else if(histEl)histEl.innerHTML='<tr><td colspan="3" class="dd-empty">Could not load history.</td></tr>';}).catch(function(){if(histEl)histEl.innerHTML='<tr><td colspan="3" class="dd-empty">Error loading history.</td></tr>';});
}
function tryLoadFromStore(){
  var store=getStore();
  var t=store&&store.target;
  if(t&&t.id&&t.id!==self.__ddState.entityId){loadDevice(String(t.id),String(t.name||t.id));}
  else if(!self.__ddState.entityId){if(titleEl)titleEl.textContent='Device Detail';if(subEl)subEl.textContent='No device selected';if(kpiEl)kpiEl.innerHTML='<div style="color:#8aa4be;font-size:12px;padding:8px;">No device selected. Click Details on a device in the endpoint table.</div>';if(histEl)histEl.innerHTML='<tr><td colspan="3" class="dd-empty">No device selected.</td></tr>';}
}
self.__sotaListener=function(e){var d=(e&&e.detail)||{};if(d.type==='device-selected'&&d.payload&&d.payload.id){loadDevice(String(d.payload.id),String(d.payload.name||d.payload.id));}};
window.addEventListener('SOTA_MGMT_UPDATE',self.__sotaListener);
self.onDataUpdated=function(){tryLoadFromStore();};
self.onResize=function(){};
self.onDestroy=function(){try{if(self.__sotaListener)window.removeEventListener('SOTA_MGMT_UPDATE',self.__sotaListener);}catch(e){}self.__ddState=null;};
tryLoadFromStore();
};
_init();
};
