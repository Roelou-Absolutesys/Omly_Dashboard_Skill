path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Get the Registry widget's CSS - find its templateCss section
idx = content.find('"name": "SOTA Management V3 - Registry"')
# Find templateCss within Registry widget section
css_idx = content.find('templateCss', idx)
print(repr(content[css_idx:css_idx+1200]))
