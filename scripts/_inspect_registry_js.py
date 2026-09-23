path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('"name": "SOTA Management V3 - Registry"')
ctrl_idx = content.find('"controllerScript"', idx)
end = content.find('", "settingsSchema"', ctrl_idx)
script = content[ctrl_idx+20:end]
# Find sel class usage
for kw in ['sel', 'sr-mini', 'SELECT', 'select']:
    i = script.find(kw)
    if i >= 0:
        print(f'\n=== {kw} ===')
        print(repr(script[max(0,i-80):i+120]))
