path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

OLD = r"""<button class=\"sr-btn\" id=\"sr-add\">+ Add Item</button>"""
NEW = r"""<button class=\"sr-btn prim\" id=\"sr-add\">+ Add Item</button>"""

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print('✓ + Add Item button → sr-btn prim')
else:
    print('✗ not found')
    exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
