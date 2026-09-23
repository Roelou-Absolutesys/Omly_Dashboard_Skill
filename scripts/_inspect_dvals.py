path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find how d.vals is built in the main device list widget
idx = content.find("d.vals['branch']")
print('=== d.vals[branch] context ===')
print(repr(content[max(0,idx-800):idx+200]))
