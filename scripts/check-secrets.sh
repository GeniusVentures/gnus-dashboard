#!/usr/bin/env bash
# Secret gate: gitleaks over the source tree, grep over out/. Exit 0 clean, 1 finding, 2 setup error.
# When a later dependency ships a known public 64-hex constant in out/, add an exact-value exception, never a broader pattern.
set -euo pipefail
cd "$(dirname "$0")/.."

GL="${GITLEAKS:-gitleaks}"

# The marker is written once, in the mock source; the gate reads it from there.
MOCK_MARKER=$(sed -n 's/.*MOCK_MARKER = "\([^"]*\)".*/\1/p' lib/gnus/mock/marker.ts)
if [ -z "$MOCK_MARKER" ]; then
  echo "SETUP: mock marker not found in lib/gnus/mock/marker.ts" >&2
  exit 2
fi
# Each character in its own bracket expression, so the marker is matched as a fixed string.
MOCK_MARKER_ERE=$(printf '%s' "$MOCK_MARKER" | sed 's/./[&]/g')

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

# Files in out/ holding a quoted 64-hex value that .gitleaks.toml does not list as a public constant.
unlisted_hex_files() {
  local allowed file value
  allowed=$(grep -ohE '[0-9a-fA-F]{64}' .gitleaks.toml | tr 'A-F' 'a-f' | sort -u)
  while IFS=: read -r file value; do
    value=$(printf '%s' "$value" | tr -d "\"'" | sed 's/^0x//' | tr 'A-F' 'a-f')
    if ! grep -qxF -e "$value" <<<"$allowed"; then
      echo "$file"
    fi
  done < <(grep -rIoHE "[\"'](0x)?[0-9a-fA-F]{64}[\"']" out) | sort -u
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
  # Scan from inside out/ so the ^out/ path allowlist in .gitleaks.toml does not match.
  local rc=0
  (cd out && "$GL" dir . --config ../.gitleaks.toml --redact --no-banner --exit-code 1) || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "FAIL out-scan: gitleaks reported findings (exit $rc)"
    bad=1
  fi
  local checks=(
    "blastapi|blastapi"
    "sgns_key|sgns_key"
    "pem-private-key|BEGIN [A-Z ]*PRIVATE KEY"
    "bridge-test-content|bridge-test"
    "quoted-64-hex|"
    "mock-marker|$MOCK_MARKER_ERE"
  )
  local spec
  for spec in "${checks[@]}"; do
    name="${spec%%|*}"
    pattern="${spec#*|}"
    if [ "$name" = "quoted-64-hex" ]; then
      found=$(unlisted_hex_files)
    else
      found=$(grep -rIliE -e "$pattern" out || true)
    fi
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
  # Separate words, so this file holds no quoted 12-word phrase for the gate to flag.
  local words=(abandon ability able about above absent absorb abstract absurd abuse access accident)
  dir=$(mktemp -d ./secret-selftest-XXXXXX)
  trap "rm -rf '$dir' out/secret-selftest-key.js out/secret-selftest-rpc.js out/secret-selftest-mock.js out/bridge-test.html" EXIT
  hex=$(rand_hex 32)
  token=$(rand_hex 18)

  printf 'export const payload = "%s";\n' "$hex" >"$dir/key.ts"
  expect_red "64-hex literal in source" "$hex" check_source
  rm -f "$dir/key.ts"

  printf 'export const phrase = "%s";\n' "${words[*]}" >"$dir/phrase.ts"
  expect_red "12-word phrase in source" "${words[0]} ${words[1]}" check_source
  rm -f "$dir/phrase.ts"

  printf 'export const rpc = "https://eth-mainnet.blastapi.io/%s";\n' "$token" >"$dir/rpc.ts"
  expect_red "keyed RPC URL in source" "$token" check_source
  rm -f "$dir/rpc.ts"

  printf 'var k="%s";\n' "$hex" >out/secret-selftest-key.js
  expect_red "64-hex string in out/" "$hex" check_out
  rm -f out/secret-selftest-key.js

  printf 'var u="https://mainnet.infura.io/v3/%s";\n' "$token" >out/secret-selftest-rpc.js
  expect_red "keyed RPC URL in out/" "$token" check_out
  rm -f out/secret-selftest-rpc.js

  : >out/bridge-test.html
  expect_red "bridge-test page in out/" "$token" check_out
  rm -f out/bridge-test.html

  printf 'var m="%s";\n' "$MOCK_MARKER" >out/secret-selftest-mock.js
  expect_red "mock marker in out/" "$MOCK_MARKER" check_out
  rm -f out/secret-selftest-mock.js

  rmdir "$dir"
  run_both
  echo "secret self-test passed: 7 fixtures detected, clean tree passes"
}

PROBE=pages/mock-import-probe.tsx

# Build with the mock flag removed, so only an unguarded import can put the mock in out/.
build_without_flag() {
  local log
  log=$(mktemp)
  if ! env -u NEXT_PUBLIC_GNUS_MOCK yarn build >"$log" 2>&1; then
    tail -n 30 "$log" >&2
    rm -f "$log"
    echo "SETUP: yarn build failed" >&2
    exit 2
  fi
  rm -f "$log"
}

mock_import_test() {
  "$GL" version >/dev/null 2>&1 || { echo "SETUP: gitleaks not found" >&2; exit 2; }
  [ ! -e "$PROBE" ] || { echo "SETUP: $PROBE already exists" >&2; exit 2; }
  trap "rm -f '$PROBE'" EXIT
  local name out rc
  # One build per way of importing the mock: the whole install path, only the profile table, only the option parser.
  # Each must trip the marker gate on its own, because a page can import any one of them.
  for name in install profiles options; do
    case "$name" in
      install) cat >"$PROBE" <<'PROBE_EOF' ;;
import { useEffect } from "react";
import { installMock } from "../lib/gnus/mock/install";

export default function MockImportProbe() {
  useEffect(() => {
    installMock(window as never);
  }, []);
  return null;
}
PROBE_EOF
      profiles) cat >"$PROBE" <<'PROBE_EOF' ;;
import { MOCK_PROFILES, isMockProfileName } from "../lib/gnus/mock/profiles";

export default function MockImportProbe() {
  return <p>{isMockProfileName("today") ? Object.keys(MOCK_PROFILES).join(",") : ""}</p>;
}
PROBE_EOF
      options) cat >"$PROBE" <<'PROBE_EOF' ;;
import { mockOptionsFromSearch } from "../lib/gnus/mock/install";

export default function MockImportProbe() {
  return <p>{mockOptionsFromSearch("?gnusMock=today").profile}</p>;
}
PROBE_EOF
    esac
    build_without_flag
    rc=0
    out=$(check_out 2>&1) || rc=$?
    if [ "$rc" -ne 1 ] || ! printf '%s' "$out" | grep -q 'mock-marker'; then
      echo "mock import test FAILED: planted $name import not detected" >&2
      return 1
    fi
    echo "  detected: planted $name import"
  done
  rm -f "$PROBE"
  build_without_flag
  rc=0
  check_out >/dev/null 2>&1 || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "mock import test FAILED: clean build did not pass (exit $rc)" >&2
    return 1
  fi
  echo "mock import test passed: 3 planted imports detected, clean build passes"
}

case "${1:-}" in
  "") run_both ;;
  --self-test) self_test ;;
  --mock-import-test) mock_import_test ;;
  *) echo "usage: $0 [--self-test | --mock-import-test]" >&2; exit 2 ;;
esac
