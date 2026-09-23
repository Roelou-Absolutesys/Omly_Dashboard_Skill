path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

OLD = r""".sr-btn:hover{background:#f4f8fc;border-color:#b8cde6;color:#1f4f82;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.12)}"""
NEW = r""".sr-btn:hover{background:#1a6fd4;border-color:#1557b0;color:#fff;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.22)}"""

if OLD in content:
    count = content.count(OLD)
    content = content.replace(OLD, NEW)
    print(f'✓ replaced {count} occurrence(s)')
else:
    print('✗ not found')
    idx = content.find('.sr-btn:hover')
    print(repr(content[idx:idx+160]))
    exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done.')
