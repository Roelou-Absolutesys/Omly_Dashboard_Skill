path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace single SERVER_SCOPE attr fetch with parallel fetch across all 3 scopes + merge
OLD = (
    r"""var attrUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/attributes/SERVER_SCOPE?keys=branch,region,site';\n  fetch('/api/device/info/'+entityId,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(di){if(di)self.__ddState.deviceInfo=di;}).catch(function(){});\n  fetch(attrUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(attrs){if(attrs&&Array.isArray(attrs)){self.__ddState.serverAttrs={};attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});if(self.__ddState.lat"""
)

print('old found:', OLD in content)

# Also try with escaped \n
OLD2 = (
    r"""var attrUrl='/api/plugins/telemetry/DEVICE/'+entityId+'/values/attributes/SERVER_SCOPE?keys=branch,region,site';\\n  fetch('/api/device/info/'+entityId,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(di){if(di)self.__ddState.deviceInfo=di;}).catch(function(){});\\n  fetch(attrUrl,{headers:hdrs,credentials:'include'}).then(function(r){return r.ok?r.json():null;}).then(function(attrs){if(attrs&&Array.isArray(attrs)){self.__ddState.serverAttrs={};attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});if(self.__ddState.lat"""
)
print('old2 found:', OLD2 in content)

idx = content.find("var attrUrl='/api/plugins/telemetry/DEV")
print(repr(content[idx:idx+700]))
