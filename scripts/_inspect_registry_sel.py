path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('"name": "SOTA Management V3 - Registry"')
ctrl_idx = content.find('"controllerScript"', idx)
end = content.find('", "settingsSchema"', ctrl_idx)
script = content[ctrl_idx+20:end]

# Find where sel variable is built
i = script.find("'\\' sel+\\'")
# find var sel=
for kw in ['var sel=', "var sel =", '+sel+']:
    i = script.find(kw)
    while i >= 0:
        print(f'=== {kw} @{i} ===')
        print(repr(script[max(0,i-120):i+200]))
        i = script.find(kw, i+1)
