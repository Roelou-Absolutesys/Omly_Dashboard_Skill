path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find Registry widget
idx = content.find('Registry')
while idx >= 0:
    print(f'@{idx}:', repr(content[max(0,idx-30):idx+80]))
    idx = content.find('Registry', idx+1)
