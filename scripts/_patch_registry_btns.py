path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Fix .sr-mini:hover → solid blue (currently still the old light-hover)
OLD1 = r""".sr-mini:hover{background:#f4f8fc;border-color:#b8cde6;color:#1f4f82;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.12)}"""
NEW1 = r""".sr-mini:hover{background:#1a6fd4;border-color:#1557b0;color:#fff;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.22)}"""
if OLD1 in content:
    content = content.replace(OLD1, NEW1)
    changes += 1
    print('✓ .sr-mini:hover → solid blue')
else:
    print('✗ .sr-mini:hover not found')
    idx = content.find('.sr-mini:hover')
    if idx >= 0:
        print('  found at:', repr(content[idx:idx+160]))

# 2. Remove light-blue .sr-mini.sel default state (make it look same as neutral button)
OLD2 = r""".sr-mini.sel{background:#e8f1fc;border-color:#c5d9f5;color:#1a6fd4}"""
NEW2 = r""".sr-mini.sel{background:#fff;border-color:#d8e2ef;color:#5a7a9a}"""
if OLD2 in content:
    content = content.replace(OLD2, NEW2)
    changes += 1
    print('✓ .sr-mini.sel default → neutral (no light blue)')
else:
    print('✗ .sr-mini.sel not found')

# 3. .sr-mini.sel:hover → same solid blue as all other buttons
OLD3 = r""".sr-mini.sel:hover{background:#d7e8fb;border-color:#9fc0ec;color:#145cb0;box-shadow:0 6px 14px rgba(26,111,212,.18)}"""
NEW3 = r""".sr-mini.sel:hover{background:#1a6fd4;border-color:#1557b0;color:#fff;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.22)}"""
if OLD3 in content:
    content = content.replace(OLD3, NEW3)
    changes += 1
    print('✓ .sr-mini.sel:hover → solid blue')
else:
    print('✗ .sr-mini.sel:hover not found')

# 4. Also revert the earlier wrong .sr-btn:hover fix (sr-btn is used for other things, revert to subtle)
OLD4 = r""".sr-btn:hover{background:#1a6fd4;border-color:#1557b0;color:#fff;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.22)}"""
NEW4 = r""".sr-btn:hover{background:#f4f8fc;border-color:#b8cde6;color:#1f4f82;transform:translateY(-1px);box-shadow:0 6px 14px rgba(26,111,212,.12)}"""
if OLD4 in content:
    content = content.replace(OLD4, NEW4)
    changes += 1
    print('✓ .sr-btn:hover reverted (not used by SELECT/DETAILS)')
else:
    print('  (sr-btn:hover already at default or not found - skip)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nDone — {changes} changes applied.')
