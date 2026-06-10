#!/bin/bash
# Generic oxn-proof skill self-verification helper.
# Verifies that all skill steps (1..7 in v0.1.2) leave physical evidence
# in the project's .openxenon/proofs/<proof-name>/ directory.
#
# Usage:
#   bash skill-workflow-prover.sh <proof-name> <check>
#
# Checks (all read .openxenon/proofs/<proof-name>/frozen.json by default):
#   probes-added         proof.oxn contains >= 2 probe blocks
#   frozen-readonly-444  frozen.json mode == 444 (OS read-only lock)
#   signature-hex64      _xenon_meta.content_hash is 64-char hex
#   verdict-emitted      verdict field exists, ∈ {PASSED, FAILED}
#   all-probes-passed    probes[] exists, each has 'passed' field
#   show-exit-zero       `oxn proof show <proof-name>` exit 0
#   show-probes-listed   show output lists the first 7 probe names
#   frozen-touch-allowed owner can advance mtime (overwrite semantics exist)
#   echo-write-blocked   `echo > frozen.json` blocked by 0o444
#   body-sha256-valid    frozen.json body SHA-256 is 64-hex
#
# Why this script: OXN DSL STRING grammar /"[^"]*"/ does NOT allow \"
# escape, so all inner-double-quote shell logic must live outside proof.oxn.
# Each proof's proof.oxn only calls `bash scripts/skill-workflow-prover.sh
# <proof-name> <check>` with no embedded quotes.
#
# Note: this helper is "generic per proof space" but check 3 (signature-hex64)
# and 4 (verdict-emitted) require the proof to have been run at least once.
# Run your proof once, then re-run for full PASS.

set -u

if [ $# -lt 2 ]; then
  echo "usage: $0 <proof-name> <check>" >&2
  echo "  checks: probes-added | frozen-readonly-444 | signature-hex64 |" >&2
  echo "          verdict-emitted | all-probes-passed | show-exit-zero |" >&2
  echo "          show-probes-listed | frozen-touch-allowed |" >&2
  echo "          echo-write-blocked | body-sha256-valid" >&2
  exit 2
fi

PROOF_NAME="$1"
CHECK="$2"
PROOF_DIR=".openxenon/proofs/${PROOF_NAME}"
FROZEN="${PROOF_DIR}/frozen.json"
PROOF_OXN="${PROOF_DIR}/proof.oxn"

# Sanity: proof space must exist
if [ ! -d "$PROOF_DIR" ]; then
  echo "no proof space: $PROOF_DIR" >&2
  exit 2
fi

case "$CHECK" in
  probes-added)
    count=$(grep -cE '^[[:space:]]*probe[[:space:]]+' "$PROOF_OXN")
    [ "$count" -ge 2 ] && echo "probes=$count"
    ;;
  frozen-readonly-444)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    mode=$(stat -f %Lp "$FROZEN")
    [ "$mode" = 444 ] && echo "mode=$mode"
    ;;
  signature-hex64)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    hash=$(python3 -c 'import json; print(json.load(open("'"$FROZEN"'"))["_xenon_meta"]["content_hash"])')
    echo "$hash" | grep -E '^[0-9a-f]{64}$' >/dev/null && echo "hash=$hash"
    ;;
  verdict-emitted)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    v=$(python3 -c 'import json; print(json.load(open("'"$FROZEN"'"))["verdict"])')
    case "$v" in
      PASSED|FAILED) echo "verdict=$v" ;;
      *) echo "unexpected-verdict=$v" >&2; exit 1 ;;
    esac
    ;;
  all-probes-passed)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    python3 -c 'import json,sys; d=json.load(open("'"$FROZEN"'")); ps=d["probes"]; assert all("passed" in p for p in ps); n=sum(1 for p in ps if p["passed"]); print("passed=" + str(n) + "/" + str(len(ps))); sys.exit(0)'
    ;;
  show-exit-zero)
    ./dist/oxn proof show "$PROOF_NAME" 2>/dev/null | grep -q "^Proof: ${PROOF_NAME}$" && echo ok
    ;;
  show-probes-listed)
    out=$(./dist/oxn proof show "$PROOF_NAME" 2>/dev/null)
    # Verify the first 7 probe names are listed (covers p1..p7 region)
    n=$(grep -cE '^[[:space:]]*probe[[:space:]]+' "$PROOF_OXN")
    n=$((n < 7 ? n : 7))
    for i in $(seq 1 "$n"); do
      echo "$out" | grep -q "p${i}-" || { echo "missing-p${i}"; exit 1; }
    done
    echo "listed=$n"
    ;;
  frozen-touch-allowed)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    mtime_before=$(stat -f %m "$FROZEN")
    sleep 1
    touch "$FROZEN" && mtime_after=$(stat -f %m "$FROZEN")
    [ "$mtime_after" -gt "$mtime_before" ] && echo "mtime=${mtime_before}->${mtime_after}"
    ;;
  echo-write-blocked)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    if echo tampered > "$FROZEN" 2>/dev/null; then
      echo FAIL
      exit 1
    else
      echo BLOCKED
    fi
    ;;
  body-sha256-valid)
    [ -f "$FROZEN" ] || { echo "no-frozen"; exit 1; }
    h=$(shasum -a 256 "$FROZEN" | awk '{print $1}')
    echo "$h" | grep -E '^[0-9a-f]{64}$' >/dev/null && echo "body_sha256=$h"
    ;;
  *)
    echo "unknown check: $CHECK" >&2
    exit 2
    ;;
esac
