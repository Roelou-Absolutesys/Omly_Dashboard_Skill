path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find where devices array is built - where .vals is assigned
for kw in ['vals[', '.vals=', 'vals ={', 'vals={', 'ctx.data', 'datasource', 'onDataUpdated', 'self.onDataUpdated']:
    idx = content.find(kw)
    if idx >= 0:
        print(f'\n=== {kw} ===')
        print(repr(content[max(0,idx-100):idx+300]))
