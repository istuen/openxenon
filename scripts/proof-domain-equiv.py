#!/usr/bin/env python3
"""Proof 13/14 helper: compare term/ban sets between new 3 and old 6 domain files."""
import re
import sys

def extract(path: str):
    text = open(path).read()
    terms, bans = set(), set()
    term_pat = re.compile(r'term\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', re.DOTALL)
    ban_pat = re.compile(r'\bban\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', re.DOTALL)
    kv_pat = re.compile(r'"([^"]+)"\s*:\s*"([^"]*)"')
    str_pat = re.compile(r'"([^"]+)"')
    for blk in term_pat.finditer(text):
        for m in kv_pat.finditer(blk.group(1)):
            terms.add(m.group(1))
    for blk in ban_pat.finditer(text):
        for m in str_pat.finditer(blk.group(1)):
            bans.add(m.group(1))
    return terms, bans

NEW = [
    ".openxenon/domains/intent-domain.oxn",
    ".openxenon/domains/align-domain.oxn",
    ".openxenon/domains/proof-domain.oxn",
]
OLD = [
    ".oxn-domain-archive/cli-context.oxn",
    ".oxn-domain-archive/dsl-context.oxn",
    ".oxn-domain-archive/program-context.oxn",
    ".oxn-domain-archive/builtin-context.oxn",
    ".oxn-domain-archive/work-context.oxn",
    ".oxn-domain-archive/skill-context.oxn",
]

nt, nb = set(), set()
for f in NEW:
    t, b = extract(f)
    nt |= t; nb |= b

ot, ob = set(), set()
for f in OLD:
    t, b = extract(f)
    ot |= t; ob |= b

miss_t = ot - nt
miss_b = ob - nb
print(f"new: terms={len(nt)} bans={len(nb)}")
print(f"old: terms={len(ot)} bans={len(ob)}")
print(f"missing_terms={len(miss_t)} missing_bans={len(miss_b)}")
if miss_t:
    print("MISSING TERMS:", miss_t)
if miss_b:
    print("MISSING BANS:", miss_b)
sys.exit(0 if (not miss_t and not miss_b) else 1)
