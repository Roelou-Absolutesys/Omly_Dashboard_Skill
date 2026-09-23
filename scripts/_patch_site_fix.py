path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Cache latest telemetry data when renderKpi is called
OLD_RENDERKPI_CALL = (
    r"""}).then(function(d){if(d)renderKpi(d);}).catch(function(){if(kpiEl)kpiEl.innerHTML='<div style=\"color:#8aa4be;font-size:12px;padding:8px;\">Could not load telemetry.</div>';});"""
)
NEW_RENDERKPI_CALL = (
    r"""}).then(function(d){if(d){self.__ddState.latestKpiData=d;renderKpi(d);}}).catch(function(){if(kpiEl)kpiEl.innerHTML='<div style=\"color:#8aa4be;font-size:12px;padding:8px;\">Could not load telemetry.</div>';});"""
)

if OLD_RENDERKPI_CALL in content:
    content = content.replace(OLD_RENDERKPI_CALL, NEW_RENDERKPI_CALL, 1)
    print('✓ latestKpiData cache added')
else:
    print('✗ renderKpi call not found')
    idx = content.find('if(d)renderKpi(d)')
    print(repr(content[idx-20:idx+120]))
    exit(1)

# 2. Re-render KPIs after server attrs are loaded
OLD_ATTRS_DONE = (
    r"""attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});}}).catch(function(){});"""
)
NEW_ATTRS_DONE = (
    r"""attrs.forEach(function(a){if(a&&a.key)self.__ddState.serverAttrs[a.key]=a.value;});if(self.__ddState.latestKpiData)renderKpi(self.__ddState.latestKpiData);}}).catch(function(){});"""
)

if OLD_ATTRS_DONE in content:
    content = content.replace(OLD_ATTRS_DONE, NEW_ATTRS_DONE, 1)
    print('✓ re-render after attrs added')
else:
    print('✗ attrs done block not found')
    idx = content.find('serverAttrs[a.key]=a.value;')
    print(repr(content[idx-10:idx+160]))
    exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone — 2/2 changes applied.')
