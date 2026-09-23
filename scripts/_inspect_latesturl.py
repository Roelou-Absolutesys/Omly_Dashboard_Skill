path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find latestUrl definition
idx = content.find('latestUrl')
while idx >= 0:
    print(repr(content[max(0,idx-10):idx+200]))
    print()
    idx = content.find('latestUrl', idx+1)
