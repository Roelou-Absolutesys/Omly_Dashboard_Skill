path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the full loadDevice / open function to understand the full attr fetch context
idx = content.find("var attrUrl='/api/plugins/telemetry/DEV")
print(repr(content[max(0,idx-300):idx+600]))
