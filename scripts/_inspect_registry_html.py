path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('"name": "SOTA Management V3 - Registry"')
# Find ADD ITEM button in templateHtml
html_idx = content.find('templateHtml', idx)
end_html = content.find('templateCss', html_idx)
print(repr(content[html_idx:end_html]))
