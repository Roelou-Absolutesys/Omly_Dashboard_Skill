path = r'c:\Users\RoelouVanderMerwe\Desktop\My_Projects\test_widgets\Omly_Dashboard_Skill\sota_management_widgets_v3.json'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Look for how devices are listed and what site/branch field they use
for kw in ['region', 'branch', 'site', 'sAttrs', 'CLIENT_SCOPE', 'SHARED_SCOPE', 'SHARED', 'CLIENT']:
    idx = 0
    hits = []
    while True:
        idx = content.find(kw, idx)
        if idx < 0:
            break
        hits.append(repr(content[max(0,idx-40):idx+80]))
        idx += 1
    print(f'\n=== {kw} ({len(hits)} hits) ===')
    for h in hits[:6]:
        print(' ', h)
