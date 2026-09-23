path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Show the server attribute fetch block
idx = content.find('serverAttrs={};attrs.forEach')
print(repr(content[idx-600:idx+300]))
