#!/usr/bin/env python3
"""Rewrites the file list in sw.js so every game file (and voice clip) is cached for offline play.
Run from the project folder after changing files:  python3 tools/build_sw.py [version]
"""
import os, re, sys
skip_dirs = {'tools', '.git'}
files = ['./']
for root, dirs, names in os.walk('.'):
    dirs[:] = sorted(d for d in dirs if d not in skip_dirs)
    for n in sorted(names):
        rel = os.path.join(root, n).replace(os.sep, '/')
        if rel in ('./sw.js', './README.md', './voice/lines.json') or n.startswith('.'): continue
        files.append(rel)
s = open('sw.js').read()
s = re.sub(r"const FILES = \[.*?\];", "const FILES = [\n" + "".join(f"  '{f}',\n" for f in files) + "];", s, flags=re.S)
if len(sys.argv) > 1: s = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{sys.argv[1]}';", s)
open('sw.js', 'w').write(s)
print(len(files), 'files listed')
