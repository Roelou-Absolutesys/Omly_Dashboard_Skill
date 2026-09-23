"""Patch: make Device ID KPI block span 2 grid columns in SOTA Device Detail widget."""
import sys

path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ── 1. Extend kpi() function to accept optional wrapCls applied to outer div ──
OLD_KPI_FUNC = (
    r"""function kpi(label,val,unit,cls){return '<div class=\"dd-kpi\"><div class=\"dd-kpi-label\">'+esc(label)+'</div><div class=\"dd-kpi-val '+(cls||'')+'\">'"""
    r"""+esc(val)+'</div>'+(unit?'<div class=\"dd-kpi-unit\">'+esc(unit)+'</div>':'')+'</div>';}"""
)
NEW_KPI_FUNC = (
    r"""function kpi(label,val,unit,cls,wrapCls){return '<div class=\"dd-kpi'+(wrapCls?' '+wrapCls:'')+'\"><div class=\"dd-kpi-label\">'+esc(label)+'</div><div class=\"dd-kpi-val '+(cls||'')+'\">'"""
    r"""+esc(val)+'</div>'+(unit?'<div class=\"dd-kpi-unit\">'+esc(unit)+'</div>':'')+'</div>';}"""
)

if OLD_KPI_FUNC in content:
    content = content.replace(OLD_KPI_FUNC, NEW_KPI_FUNC, 1)
    changes += 1
    print('✓ kpi() function updated')
else:
    print('✗ kpi() function NOT found — checking raw snippet...')
    idx = content.find('function kpi(label,val,unit,cls)')
    if idx >= 0:
        print('  Raw snippet:', repr(content[idx:idx+260]))
    sys.exit(1)

# ── 2. Add .dd-kpi-wide CSS class ──
OLD_CSS = r""".dd-kpi-unit{font-size:11px;color:#8aa4be;margin-top:2px}"""
NEW_CSS = r""".dd-kpi-unit{font-size:11px;color:#8aa4be;margin-top:2px}.dd-kpi-wide{grid-column:span 2}"""

if OLD_CSS in content:
    content = content.replace(OLD_CSS, NEW_CSS, 1)
    changes += 1
    print('✓ .dd-kpi-wide CSS added')
else:
    print('✗ .dd-kpi-unit CSS NOT found')
    sys.exit(1)

# ── 3. Pass 'dd-kpi-wide' to Device ID kpi() call ──
OLD_DEVICE_ID = r"""h+=kpi('Device ID',(self.__ddState&&self.__ddState.entityId)||'\\u2014','','');"""
NEW_DEVICE_ID = r"""h+=kpi('Device ID',(self.__ddState&&self.__ddState.entityId)||'\\u2014','','','dd-kpi-wide');"""

if OLD_DEVICE_ID in content:
    content = content.replace(OLD_DEVICE_ID, NEW_DEVICE_ID, 1)
    changes += 1
    print('✓ Device ID kpi call updated')
else:
    print('✗ Device ID kpi call NOT found — checking snippet...')
    idx = content.find("'Device ID'")
    if idx >= 0:
        print('  Raw snippet:', repr(content[idx-5:idx+100]))
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone — {changes}/3 changes applied.')
