path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find how serverAttrs is populated
idx = content.find('serverAttrs')
while idx >= 0:
    snippet = repr(content[idx:idx+120])
    print(f'@{idx}: {snippet}')
    idx = content.find('serverAttrs', idx+1)
