#!/usr/bin/env bash
# Build self-contained single executable applications (SEA) of the CLI.
#
# Usage:
#   scripts/build-sea.sh                       Build every target (linux/windows, x64/arm64)
#   scripts/build-sea.sh win-x64 linux-arm64   Build the named target(s)
#
# Outputs go to dist-bin/sdfz-demo-parser-<version>-<target>.{tar.gz,zip}, each
# containing a single binary named sdfz-demo-parser[.exe] (no arch in the name).
#
# Run with the Node you want to ship (26+); the embedded runtime is whatever Node
# runs this, which must match the downloaded target binaries (handled below).
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_VERSION="$(node -p 'process.versions.node')"
PKG_VERSION="$(node -p 'require("./package.json").version')"

# `node --build-sea` only exists on Node 26+; fail loudly rather than with a
# cryptic "bad option" from an older Node on PATH.
if (( ${NODE_VERSION%%.*} < 26 )); then
  echo "error: build-sea.sh must run on Node 26+, but found $NODE_VERSION" >&2
  exit 1
fi

mkdir -p build dist-bin nodes

# Bundle the CLI + its deps into one CommonJS file (SEA needs a single file).
# --no-install so a missing devDependency errors instead of fetching from the network.
npx --no-install esbuild src/cli.ts --bundle --platform=node --format=cjs --target=node26 \
  --outfile=build/cli.cjs "--define:__SEA_VERSION__=\"$PKG_VERSION\""

build_one() {
  local target="$1" archive bin ext name nodebin binname out
  case "$target" in
    win-*) archive=zip;    bin=node.exe; ext=.exe ;;
    *)     archive=tar.gz; bin=bin/node; ext= ;;
  esac
  name="node-v$NODE_VERSION-$target"
  nodebin="nodes/$name/$bin"
  if [[ ! -f "$nodebin" ]]; then
    echo "Downloading $name.$archive"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$name.$archive" -o "nodes/$name.$archive"
    if [[ "$archive" == zip ]]; then
      unzip -qo "nodes/$name.$archive" -d nodes
    else
      tar -xzf "nodes/$name.$archive" -C nodes
    fi
  fi
  # Build the binary under a plain, arch-free name; the archive name carries the arch.
  binname="sdfz-demo-parser$ext"
  # useCodeCache/useSnapshot must stay false for cross-platform blobs.
  cat > build/sea-config.json <<EOF
{ "main": "build/cli.cjs", "output": "build/$binname", "executable": "$nodebin",
  "disableExperimentalSEAWarning": true, "useCodeCache": false, "useSnapshot": false }
EOF
  node --build-sea build/sea-config.json
  [[ "$ext" == ".exe" ]] || chmod +x "build/$binname"

  out="dist-bin/sdfz-demo-parser-$PKG_VERSION-$target.$archive"
  rm -f "$out"
  if [[ "$archive" == zip ]]; then
    (cd build && zip -q "../$out" "$binname")
  else
    tar -czf "$out" -C build "$binname"
  fi
  echo "Built $out"
}

targets=("$@")
[[ ${#targets[@]} -eq 0 ]] && targets=(linux-x64 linux-arm64 win-x64 win-arm64)
for target in "${targets[@]}"; do
  build_one "$target"
done
