path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

OLD = (
    r"""var attrUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/attributes/SERVER_SCOPE?keys=branch,region,site';\n  fetch('/api/device/info/'+entityId,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(di){if(di)self.__ddState.deviceInfo=di;}).catch(function(){});\n  fetch(attrUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(attrs){if(attrs&&Array.isArray(attrs)){self.__ddState.serverAttrs={};attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});if(self.__ddState.latestKpiData)renderKpi(self.__ddState.latestKpiData);}}).catch(function(){});"""
)

NEW = (
    r"""var attrBase='/api/plugins/telemetry/DEVICE/'+entityId+'/values/attributes';\n  fetch('/api/device/info/'+entityId,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(di){if(di)self.__ddState.deviceInfo=di;}).catch(function(){});\n  (function(){var scopes=['SERVER_SCOPE','SHARED_SCOPE','CLIENT_SCOPE'];var pending=scopes.length;var merged={};function onDone(){pending--;if(pending<=0){self.__ddState.serverAttrs=merged;if(self.__ddState.latestKpiData)renderKpi(self.__ddState.latestKpiData);}}scopes.forEach(function(sc){fetch(attrBase+'/'+sc+'?keys=branch,region,site',{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(attrs){if(attrs&&Array.isArray(attrs))attrs.forEach(function(a){if(a&&a.key&&!(a.key in merged))merged[a.key]=a.value;});onDone();}).catch(onDone);});})();"""
)

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('✓ replaced with all-scopes parallel fetch')
else:
    print('✗ old string not found')
    exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done.')
