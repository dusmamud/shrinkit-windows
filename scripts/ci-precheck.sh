#!/usr/bin/env bash
# Local pre-check that mirrors the GitHub Actions Windows build as closely as
# possible WITHOUT Rust/Windows. Catches the exact failure classes CI caught
# before (wrong action version, non-strict JSON config, misplaced main.rs).
# Anything it can't check (actual Rust compile on windows-latest) is reported
# honestly at the end instead of faked.
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }

echo "== 1. Workflow YAML =="
python3 - <<'EOF'
import yaml, sys
try:
    wf = yaml.safe_load(open('.github/workflows/build-windows.yml'))
    jobs = wf.get('jobs', {})
    uses = [s.get('uses','') for j in jobs.values() for s in j.get('steps', []) if 'uses' in s]
    assert any(u.startswith('tauri-apps/tauri-action@v1') for u in uses), f"tauri-action not pinned to @v1: {uses}"
    print("  ✓ workflow YAML parses; tauri-action pinned to @v1")
except Exception as e:
    print(f"  ✗ workflow check failed: {e}"); sys.exit(1)
EOF
[ $? -eq 0 ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo "== 2. tauri.conf.json strict JSON (no comments) =="
if python3 -c "import json; json.load(open('src-tauri/tauri.conf.json'))" 2>/dev/null; then
  ok "tauri.conf.json parses as strict JSON"
else
  bad "tauri.conf.json is NOT strict JSON (tauri-action pre-parse will fail)"
fi

echo "== 3. Tauri Rust scaffold =="
for f in src-tauri/src/main.rs src-tauri/build.rs src-tauri/Cargo.toml; do
  [ -f "$f" ] && ok "$f exists" || bad "$f MISSING (Cargo expects src-tauri/src/main.rs + build.rs)"
done
[ ! -f src-tauri/main.rs ] && ok "no stray src-tauri/main.rs" || bad "stray src-tauri/main.rs will confuse Cargo"

echo "== 4. Plugin consistency (Cargo.toml <-> main.rs <-> capabilities) =="
for plug in dialog clipboard-manager fs opener; do
  cargo_hit=$(grep -c "tauri-plugin-$plug" src-tauri/Cargo.toml || true)
  main_hit=$(grep -c "tauri_plugin_${plug//-/_}::init()" src-tauri/src/main.rs || true)
  if [ "$cargo_hit" -gt 0 ] && [ "$main_hit" -gt 0 ]; then
    ok "plugin $plug: Cargo dep + main.rs init() present"
  else
    bad "plugin $plug: Cargo=$cargo_hit main.rs=$main_hit (both must be >0)"
  fi
done
python3 - <<'EOF'
import json, glob, sys
ok = True
for cap in glob.glob('src-tauri/capabilities/*.json'):
    try:
        json.load(open(cap))
    except Exception as e:
        print(f"  ✗ capability {cap} is not valid JSON: {e}"); ok = False
if ok: print("  ✓ all capability files are valid JSON")
sys.exit(0 if ok else 1)
EOF
[ $? -eq 0 ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo "== 5. Icons referenced by tauri.conf.json =="
python3 - <<'EOF'
import json, os, sys
cfg = json.load(open('src-tauri/tauri.conf.json'))
icons = cfg['bundle'].get('icon', [])
missing = [i for i in icons if not os.path.exists(os.path.join('src-tauri', i))]
if missing:
    print(f"  ✗ missing icons: {missing}"); sys.exit(1)
print(f"  ✓ all {len(icons)} icons exist")
EOF
[ $? -eq 0 ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo "== 6. Frontend (same gates as CI) =="
npx tsc --noEmit >/dev/null 2>&1 && ok "tsc --noEmit clean" || bad "tsc errors"
npm run build >/dev/null 2>&1 && ok "vite build green" || bad "vite build failed"

echo ""
echo "Result: $PASS passed, $FAIL failed."
if [ "$FAIL" -gt 0 ]; then
  echo "DO NOT PUSH — fix the failures above first."
  exit 1
fi
echo "NOTE: this cannot run the Rust/Tauri compile itself (no Rust toolchain or"
echo "WebView2 in this environment). The windows-latest CI run remains the only"
echo "proof for the native compile + NSIS/MSI packaging step."
