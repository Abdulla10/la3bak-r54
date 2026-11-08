"""R57: رفع رقم النسخة (?v=) لكل ملف تغيّر ولكل ملف يستورده، لين نوصل لـ index.html — عشان المتصفح ما يستخدم نسخة قديمة من الكاش.
الاستخدام: python3 acceptance-r55/_bump-versions.py <الوسم> <ملف1> <ملف2> ...   (المسارات نسبة لمجلد public)"""
import os, re, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', 'public'); ROOT = os.path.abspath(ROOT)
tag = sys.argv[1]; changed = {os.path.normpath(f) for f in sys.argv[2:]}
files = []
for d, _, fs in os.walk(ROOT):
    if '/vendor' in d or '/assets' in d: continue
    for f in fs:
        if f.endswith(('.js', '.html')): files.append(os.path.join(d, f))
spec = re.compile(r"""(['"])((?:\.{1,2}/|/)[A-Za-z0-9_./-]+\.(?:js|css))(\?v=[A-Za-z0-9_.-]+)?\1""")
def resolve(importer, path):
    if path.startswith('/'): return os.path.normpath(path[1:])
    return os.path.normpath(os.path.relpath(os.path.join(os.path.dirname(importer), path), ROOT))
done = set(); queue = list(changed); touched = set()
while queue:
    target = queue.pop()
    if target in done: continue
    done.add(target)
    for f in files:
        rel = os.path.relpath(f, ROOT)
        t = open(f, encoding='utf-8').read(); orig = t
        def sub(m):
            q, path, ver = m.group(1), m.group(2), m.group(3)
            if resolve(f, path) != target: return m.group(0)
            return f"{q}{path}?v={tag}{q}"
        t = spec.sub(sub, t)
        if t != orig:
            open(f, 'w', encoding='utf-8').write(t); touched.add(rel)
            if rel.endswith('.js') and rel != 'sw.js' and rel not in done: queue.append(rel)
print('bumped importers:', sorted(touched))
