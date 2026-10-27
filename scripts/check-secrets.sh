#!/usr/bin/env bash
# Secret gate: gitleaks over the source tree, grep over out/. Exit 0 clean, 1 finding, 2 setup error.
# When a later dependency ships a known public 64-hex constant in out/, add an exact-value exception, never a broader pattern.
set -euo pipefail
cd "$(dirname "$0")/.."

GL="${GITLEAKS:-gitleaks}"

check_source() {
  if ! "$GL" version >/dev/null 2>&1; then
    echo "SETUP: gitleaks not found (set GITLEAKS or put gitleaks on PATH)" >&2
    return 2
  fi
  local bad=0 rc=0 found
  "$GL" dir . --config .gitleaks.toml --redact --no-banner --exit-code 1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "FAIL source-scan: gitleaks reported findings (exit $rc)"
    bad=1
  fi
  if [ -d public ]; then
    found=$(find public -iname '*bridge-test*')
    if [ -n "$found" ]; then
      echo "FAIL source-scan: bridge-test page under public/:"
      echo "$found"
      bad=1
    fi
  fi
  return "$bad"
}

check_out() {
  if [ ! -d out ]; then
    echo "SETUP: out/ is missing: run yarn build first" >&2
    return 2
  fi
  local bad=0 found name pattern
  found=$(find out -iname '*bridge-test*')
  if [ -n "$found" ]; then
    echo "FAIL out-scan: bridge-test file name:"
    echo "$found"
    bad=1
  fi
  local checks=(
    "blastapi|blastapi"
    "sgns_key|sgns_key"
    "pem-private-key|BEGIN [A-Z ]*PRIVATE KEY"
    "bridge-test-content|bridge-test"
    "quoted-64-hex|[\"'](0x)?[0-9a-fA-F]{64}[\"']"
  )
  local spec
  for spec in "${checks[@]}"; do
    name="${spec%%|*}"
    pattern="${spec#*|}"
    found=$(grep -rIliE -e "$pattern" out || true)
    if [ -n "$found" ]; then
      echo "FAIL out-scan ($name) in:"
      echo "$found"
      bad=1
    fi
  done
  return "$bad"
}

run_both() {
  local rc=0 worst=0
  check_source || rc=$?
  [ "$rc" -gt "$worst" ] && worst=$rc
  rc=0
  check_out || rc=$?
  [ "$rc" -gt "$worst" ] && worst=$rc
  return "$worst"
}

rand_hex() {
  od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'
}

# Run a scan, require exit 1, and require that its output does not echo the fixture value.
expect_red() {
  local label="$1" secret="$2" fn="$3" out rc=0
  out=$("$fn" 2>&1) || rc=$?
  if [ "$rc" -ne 1 ]; then
    echo "self-test FAILED: $label was not detected (exit $rc)" >&2
    return 1
  fi
  if printf '%s' "$out" | grep -qF -e "$secret"; then
    echo "self-test FAILED: $label output echoed the planted value" >&2
    return 1
  fi
  echo "  detected: $label"
}

self_test() {
  [ -d out ] || { echo "SETUP: out/ is missing: run yarn build first" >&2; exit 2; }
  "$GL" version >/dev/null 2>&1 || { echo "SETUP: gitleaks not found" >&2; exit 2; }
  local dir hex token
  dir=$(mktemp -d ./secret-selftest-XXXXXX)
  trap "rm -rf '$dir' out/secret-selftest-key.js out/bridge-test.html" EXIT
  hex=$(rand_hex 32)
  token=$(rand_hex 18)

  printf 'export const ethPrivateKey = "%s";\n' "$hex" >"$dir/key.ts"
  expect_red "private-key literal in source" "$hex" check_source
  rm -f "$dir/key.ts"

  printf 'export const rpc = "https://eth-mainnet.blastapi.io/%s";\n' "$token" >"$dir/rpc.ts"
  expect_red "keyed RPC URL in source" "$token" check_source
  rm -f "$dir/rpc.ts"

  printf 'var k="%s";\n' "$hex" >out/secret-selftest-key.js
  expect_red "64-hex string in out/" "$hex" check_out
  rm -f out/secret-selftest-key.js

  : >out/bridge-test.html
  expect_red "bridge-test page in out/" "$token" check_out
  rm -f out/bridge-test.html

  rmdir "$dir"
  run_both
  echo "secret self-test passed: 4 fixtures detected, clean tree passes"
}

case "${1:-}" in
  "") run_both ;;
  --self-test) self_test ;;
  *) echo "usage: $0 [--self-test]" >&2; exit 2 ;;
esac
