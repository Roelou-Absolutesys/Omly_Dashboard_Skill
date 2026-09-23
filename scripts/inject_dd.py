import json, os
base = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill'
bundle_path = os.path.join(base, 'sota_management_widgets_v3.json')
script_path = os.path.join(base, 'scripts', 'dd_controller.js')

with open(bundle_path, 'r', encoding='utf-8-sig') as f:
    bundle = json.load(f)
with open(script_path, 'r', encoding='utf-8') as f:
    script = f.read()

for w in bundle['widgetTypes']:
    if 'sota_device_detail' in w.get('fqn', ''):
        w['descriptor']['controllerScript'] = script
        print('Patched widget:', w['fqn'])
        break

with open(bundle_path, 'w', encoding='utf-8') as f:
    json.dump(bundle, f, ensure_ascii=False)

print('Done.')
print('sw_version in script:', 'sw_version' in script)
print('SERVER_SCOPE in script:', 'SERVER_SCOPE' in script)
print('serverAttrs in script:', 'serverAttrs' in script)
