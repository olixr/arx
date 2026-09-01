"""Move a family of GameServer methods to a module, leaving delegators.
Usage: python3 server-mover.py <module> <alias> <title...> -- <method...>
Run from packages/server/src/game."""
import re, sys
from collections import defaultdict

args = sys.argv[1:]
module = args[0]; alias = args[1]
title = ' '.join(args[2:args.index('--')])
METHODS = args[args.index('--')+1:]

lines = open('gameServer.ts').readlines()
src = ''.join(lines)

def back_comment(a):
    while a > 0 and (lines[a-1].strip().startswith('*') or lines[a-1].strip().startswith('/*') or lines[a-1].strip().startswith('//')):
        a -= 1
        if lines[a].strip().startswith('/*'): break
    return a

def find_method_span(name):
    m = re.search(rf'^  (?:private )?(?:async )?{name}\(', src, re.M)
    assert m, name
    d = src[:m.start()].count('\n')
    a = back_comment(d)
    depth = 0; j = d; started = False
    while True:
        depth += lines[j].count('{') - lines[j].count('}')
        if not started and depth > 0: started = True
        if started and depth == 0: break
        j += 1
    return a, d, j

spans = {n: find_method_span(n) for n in METHODS}
ordered = sorted(METHODS, key=lambda n: spans[n][0])

def strip_comments(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'^\s*//.*', '', t, flags=re.M)

import_of = {}
for m in re.finditer(r"import\s+(type\s+)?\{([^}]+)\}\s+from\s+'([^']+)'", src):
    for nn in re.sub(r'//.*','',m.group(2)).split(','):
        nn = re.sub(r'^\s*type\s+','',nn.strip())
        orig = nn
        if ' as ' in nn:
            orig, nn = [x.strip() for x in nn.split(' as ')]
        if nn and re.match(r'^\w+$', nn): import_of.setdefault(nn, (m.group(3), orig))

def relpath(mod):
    if mod.startswith('./'): return mod
    if mod.startswith('../'): return mod
    return mod

parts = []
sigs = {}
for n in ordered:
    a, d, b = spans[n]
    t = ''.join(lines[a:b+1])
    # capture signature for the delegator: the body brace is the LAST
    # 0->1 brace-depth transition in the method text (return-type braces
    # balance out before it; after the body opens, depth never rehits 0
    # until the final close).
    mtext = ''.join(lines[d:b+1])
    depth2 = 0; body_at = None
    for ci, ch in enumerate(mtext):
        if ch == '{':
            if depth2 == 0: body_at = ci
            depth2 += 1
        elif ch == '}':
            depth2 -= 1
    decl = mtext[:body_at]
    sigs[n] = decl
    t = re.sub(rf'^(  )(private )?(async )?{n}\(', rf'export \3function {n}(srv: GameServer, ', t, count=1, flags=re.M)
    # Intra-family calls dispatch through srv.* — test slates stub
    # siblings, and the stub must win over the module's own copy.
    for m2 in METHODS:
        t = re.sub(rf'this\.{m2}\(', f'srv.{m2}(', t)
    t = t.replace('this.', 'srv.')
    t = '\n'.join(l[2:] if l[:2]=='  ' else l for l in t.split('\n'))
    parts.append(t.rstrip('\n') + '\n\n')

body_all = ''.join(parts)
ids = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)', strip_comments(body_all)))
ids |= set(re.findall(r'\.\.\.(\w+)', strip_comments(body_all)))
by_mod = defaultdict(set)
for i in sorted(ids):
    if i in METHODS or i in ('srv','GameServer'): continue
    if i in import_of:
        mod, orig = import_of[i]
        by_mod[relpath(mod)].add(i if orig == i else f'{orig} as {i}')
imp = [f"import {{ {', '.join(sorted(v))} }} from '{k}';" for k, v in sorted(by_mod.items())]
GS_TYPES = ['ActorComp', 'PlayerComp', 'ProcContext']
gst = sorted(t2 for t2 in GS_TYPES if re.search(rf'(?<![.\w]){t2}(?![\w])', body_all))
imp.append(f"import type {{ GameServer{''.join(', ' + t2 for t2 in gst)} }} from './gameServer.js';")

open(f'{module}.ts','w').write(
  f"/**\n * {title}\n * Moved verbatim off GameServer (foundations F4); the class keeps\n"
  f" * one-line delegators so every caller and test slate reads unchanged.\n */\n"
  + '\n'.join(imp) + '\n\n' + body_all.rstrip('\n') + '\n')

# rewrite gameServer: replace each span with a delegator
newsrc = lines[:]
dels = sorted(((a,d,b,n) for n,(a,d,b) in spans.items()), reverse=True)
for a, d, b, n in dels:
    sig = sigs[n]
    ptext = sig[sig.index('(')+1:sig.rindex(')')]
    ptext = re.sub(r'/\*.*?\*/', '', ptext, flags=re.S)
    ptext = re.sub(r'//.*', '', ptext)
    names = []; depth = 0; cur = ''
    for ch in ptext:
        if ch in '<([': depth += 1
        elif ch in '>)]': depth -= 1
        if ch == ',' and depth == 0: names.append(cur); cur = ''
        else: cur += ch
    if cur.strip(): names.append(cur)
    pnames = [re.match(r'\s*(\w+)', p).group(1) for p in names if p.strip()]
    sig_clean = re.sub(r'^  (private )?', '  ', sig.rstrip())
    delegator = f"{sig_clean} {{\n    return {alias}.{n}(this, {', '.join(pnames)});\n  }}\n"
    newsrc[a:b+1] = [delegator]
out = ''.join(newsrc)
out = out.replace("import { CHAT_COMMANDS } from './commands/index.js';",
                  f"import {{ CHAT_COMMANDS }} from './commands/index.js';\nimport * as {alias} from './{module}.js';")
# flip visibility for members the module touches
members = sorted(set(re.findall(r'srv\.(\w+)', strip_comments(body_all))))
flips = 0
for mname in members:
    o2 = re.sub(rf'^(  )private ((?:readonly )?(?:async )?{mname}[(:= <])', r'\1\2', out, count=1, flags=re.M)
    if o2 != out: flips += 1; out = o2
    o2 = re.sub(rf'^(    )private (readonly )?({mname}: )', r'\1\2\3', out, count=1, flags=re.M)
    if o2 != out: flips += 1; out = o2
open('gameServer.ts','w').write(out)
print(f'{module}: moved {len(METHODS)}, flips {flips}, gameServer lines {out.count(chr(10))+1}')
