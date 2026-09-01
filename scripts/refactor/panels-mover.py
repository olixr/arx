"""Move a set of class methods from a UI class file to a module of
host-first functions. Usage: panels-mover.py <srcfile> <ClassName> <module> <alias> <hostvar> <title...> -- <methods...>"""
import re, sys
from collections import defaultdict
args = sys.argv[1:]
srcfile, klass, module, alias, hostvar = args[0], args[1], args[2], args[3], args[4]
title = ' '.join(args[5:args.index('--')])
METHODS = args[args.index('--')+1:]

lines = open(srcfile).readlines()
src = ''.join(lines)

def back_comment(a):
    while a > 0 and (lines[a-1].strip().startswith(('*','/*','//'))):
        a -= 1
        if lines[a].strip().startswith('/*'): break
    return a

def find_span(name):
    m = re.search(rf'^  (?:private )?(?:readonly )?{name}\(', src, re.M)
    assert m, name
    d = src[:m.start()].count('\n')
    a = back_comment(d)
    depth=0; j=d; started=False
    while True:
        depth += lines[j].count('{') - lines[j].count('}')
        if not started and depth>0: started=True
        if started and depth==0: break
        j+=1
    return a, d, j

spans = {n: find_span(n) for n in METHODS}
sp = sorted(((a,b,n) for n,(a,d,b) in spans.items()))
for i in range(len(sp)-1):
    assert sp[i][1] < sp[i+1][0], (sp[i], sp[i+1])

def strip_comments(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'^\s*//.*', '', t, flags=re.M)
def ids_of(text):
    code = strip_comments(text)
    return set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)', code)) | set(re.findall(r'\.\.\.(\w+)', code))

import_of = {}
for m in re.finditer(r"import\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'", src):
    for nn in re.sub(r'//.*','',m.group(2)).split(','):
        nn = re.sub(r'^\s*type\s+','',nn.strip())
        orig = nn
        if ' as ' in nn: orig, nn = [x.strip() for x in nn.split(' as ')]
        if nn and re.match(r'^\w+$', nn): import_of.setdefault(nn, (m.group(3), orig))

# module-scope defs in srcfile (before class)
class_at = src.index(f'class {klass}')
topdefs = set(re.findall(r'^(?:export )?(?:const|function|let|type|interface|enum)\s+(\w+)', src[:class_at], re.M))

parts = []
for n in sorted(METHODS, key=lambda x: spans[x][0]):
    a, d, b = spans[n]
    t = ''.join(lines[a:b+1])
    t = re.sub(rf'^(  )(private )?(readonly )?{n}\(', rf'export function {n}({hostvar}: {klass}, ', t, count=1, flags=re.M)
    t = re.sub(r'\(\w+: \w+, \)', f'({hostvar}: {klass})', t)  # empty original params
    for m2 in METHODS:
        t = re.sub(rf'this\.{m2}\(', f'{m2}({hostvar}, ', t)
    t = t.replace('this.', f'{hostvar}.')
    t = re.sub(rf'{re.escape(hostvar)}: {klass}, \)', f'{hostvar}: {klass})', t)
    t = '\n'.join(l[2:] if l[:2]=='  ' else l for l in t.split('\n'))
    parts.append(t.rstrip('\n') + '\n\n')
body_all = ''.join(parts)
members = sorted(set(re.findall(rf'{re.escape(hostvar)}\.(\w+)', strip_comments(body_all))))
bad = set(members) & set(METHODS)
assert not bad, bad

idset = ids_of(body_all)
by_mod = defaultdict(set)
from_src_vals = set(); from_src_types = set()
for i in sorted(idset):
    if i in METHODS or i in (hostvar, klass): continue
    if i in topdefs:
        kind = re.search(rf'^(?:export )?(const|function|let|type|interface|enum)\s+{i}\b', src[:class_at], re.M).group(1)
        (from_src_types if kind in ('type','interface') else from_src_vals).add(i)
        continue
    if i in import_of:
        mod, orig = import_of[i]
        by_mod[mod].add(i if orig == i else f'{orig} as {i}')
imp = [f"import {{ {', '.join(sorted(v))} }} from '{k}';" for k, v in sorted(by_mod.items())]
srcmod = './' + srcfile.replace('.ts','.js')
if from_src_vals:
    imp.append(f"// Back-imports from the host file — the deferred cycle every split\n// rides; touched only at render time, long after both initialize.")
    imp.append(f"import {{ {', '.join(sorted(from_src_vals))} }} from '{srcmod}';")
imp.append(f"import {'type ' if not from_src_vals else ''}{{ {'type ' if from_src_vals else ''}{klass}{''.join(', type ' + t for t in sorted(from_src_types))} }} from '{srcmod}';" if False else f"import type {{ {', '.join([klass] + sorted(from_src_types))} }} from '{srcmod}';")
open(f'{module}.ts','w').write(
  f"/**\n * {title}\n * Moved verbatim off {klass} (foundations F5.3); the functions hold the\n"
  f" * panel through its public surface.\n */\n" + '\n'.join(imp) + '\n\n' + body_all.rstrip('\n') + '\n')

# host file: delete spans, rewrite remaining call sites, publicize members, import alias
dels = sorted(((a,b) for a,d,b in spans.values()), reverse=True)
newlines = lines[:]
for a,b in dels: del newlines[a:b+1]
out = ''.join(newlines)
for n in METHODS:
    out = re.sub(rf'this\.{n}\(', f'{alias}.{n}(this, ', out)
    out = re.sub(rf'{re.escape(alias)}\.{n}\(this, \)', f'{alias}.{n}(this)', out)
for mname in members:
    out = re.sub(rf'^(\s*)private ((?:readonly )?{mname}[(:= <?])', r'\1\2', out, count=1, flags=re.M)
# export topdef vals the module needs
for v in from_src_vals:
    out = re.sub(rf'^(const|function|let|enum)\s+{v}\b', rf'export \1 {v}', out, count=1, flags=re.M)
for v in from_src_types:
    out = re.sub(rf'^(type|interface)\s+{v}\b', rf'export \1 {v}', out, count=1, flags=re.M)
first_imp = re.search(r'^import ', out, re.M)
out = out[:first_imp.start()] + f"import * as {alias} from './{module}.js';\n" + out[first_imp.start():]
open(srcfile,'w').write(out)
print(f'{module}: moved {len(METHODS)}; host lines {out.count(chr(10))+1}; publicized {len(members)} member refs')
