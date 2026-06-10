#!/usr/bin/env python3
"""Generic term/ban set inclusion checker for .oxn domain files.

Given two lists of .oxn files (old + new), verify that the deduplicated
term and ban name sets of the old files are a subset of the new files.
Returns exit 0 when preserved (old ⊆ new), exit 1 otherwise.

Usage:
    proof-domain-equiv.py <new-1.oxn> [new-2.oxn ...] -- <old-1.oxn> [old-2.oxn ...]

Why "--" separator: OXN file paths can in theory contain anything; "--"
gives an unambiguous split and is shell-idiomatic.

Use case: any "X domains merged into Y domains" refactor where you need to
prove that no term/ban was lost. The .oxn DSL grammar (Langium-based) makes
this a syntactic check, not a semantic one — but it catches the common
case of copy-paste drop.

Example (current restructure):
    proof-domain-equiv.py \\
        .openxenon/domains/intent-domain.oxn \\
        .openxenon/domains/align-domain.oxn \\
        .openxenon/domains/proof-domain.oxn \\
        -- \\
        .oxn-domain-archive/cli-context.oxn \\
        .oxn-domain-archive/dsl-context.oxn \\
        .oxn-domain-archive/program-context.oxn \\
        .oxn-domain-archive/builtin-context.oxn \\
        .oxn-domain-archive/work-context.oxn \\
        .oxn-domain-archive/skill-context.oxn
"""

import re
import sys


def extract(path: str) -> tuple[set[str], set[str]]:
    """Return (term_keys, ban_values) deduplicated from a single .oxn file."""
    text = open(path).read()
    terms: set[str] = set()
    bans: set[str] = set()
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


def merge(files: list[str]) -> tuple[set[str], set[str]]:
    t, b = set(), set()
    for f in files:
        ft, fb = extract(f)
        t |= ft
        b |= fb
    return t, b


def main(argv: list[str]) -> int:
    if '--' not in argv:
        print('usage: proof-domain-equiv.py <new...> -- <old...>', file=sys.stderr)
        return 2
    sep = argv.index('--')
    new_files = argv[1:sep]
    old_files = argv[sep + 1:]
    if not new_files or not old_files:
        print('both sides require at least one file', file=sys.stderr)
        return 2

    nt, nb = merge(new_files)
    ot, ob = merge(old_files)
    miss_t = ot - nt
    miss_b = ob - nb

    print(f'new: terms={len(nt)} bans={len(nb)}')
    print(f'old: terms={len(ot)} bans={len(ob)}')
    print(f'missing_terms={len(miss_t)} missing_bans={len(miss_b)}')
    if miss_t:
        print('MISSING TERMS:', miss_t)
    if miss_b:
        print('MISSING BANS:', miss_b)
    return 0 if (not miss_t and not miss_b) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
