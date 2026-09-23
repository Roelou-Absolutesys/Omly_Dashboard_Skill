path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('"name": "SOTA Management V3 - Registry"')
css_idx = content.find('templateCss', idx)
# Print full CSS block
end = content.find('", "controllerScript"', css_idx)
print(repr(content[css_idx+14:end]))
