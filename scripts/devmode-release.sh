#!/usr/bin/env bash
# Builds "Ardia DevMode.app": the Release build of this checkout (scripts/release.sh --rc --phase build, no notarization,
# no appcast, no upload) renamed so it runs next to an installed Ardia without sharing its data.
#
#   scripts/devmode-release.sh [<out dir>]
#   scripts/devmode-release.sh -h | --help
#
# Bundle id com.ardia.browser.devmode (its own Application Support folder and defaults), updates off (blank SUFeedURL),
# signed ad hoc (Chrome then runs on the mock keychain). Writes <out dir>/Ardia DevMode.app and
# <out dir>/Ardia-DevMode-<short sha>.zip (default out dir: dist/devmode).
set -euo pipefail

case "${1:-}" in
  -h | --help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd -P)"
out="${1:-$root/dist/devmode}"
mkdir -p "$out"
out="$(cd "$out" && pwd -P)"
pbx="$root/apps/browser/macos/Ardia.xcodeproj/project.pbxproj"
version="$(sed -n 's/.*MARKETING_VERSION = "\{0,1\}\([^";]*\)"\{0,1\};/\1/p' "$pbx" | sort -u)"
sha="$(git -C "$root" rev-parse --short HEAD)"
build_dist="$out/release-build"
app="$out/Ardia DevMode.app"
zip="$out/Ardia-DevMode-$sha.zip"
plist="$app/Contents/Info.plist"

framework="$("$root/packages/ardiacore/scripts/fetch-engine.sh")"
export ARDIACORE_FRAMEWORK="$framework"
export ARDIACORE_FRAMEWORK_ENGINE="$("$root/engine/engine-key.sh")"
export RC_DIST="$build_dist"
export APPCAST_BASE=none
(cd "$root" && scripts/release.sh "$version" --rc --phase build)

built="$build_dist/Ardia.xcarchive/Products/Applications/Ardia.app"
[ -d "$built" ] || { echo "devmode-release: no $built" >&2; exit 1; }
rm -rf "$app" "$zip"
ditto "$built" "$app"

set_key() { /usr/libexec/PlistBuddy -c "Set :$1 $2" "$plist" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :$1 $3 $2" "$plist"; }
set_key CFBundleIdentifier com.ardia.browser.devmode string
set_key CFBundleDisplayName "Ardia DevMode" string
set_key CFBundleName "Ardia DevMode" string
set_key SUFeedURL "" string
set_key SUEnableAutomaticChecks false bool
set_key SUAutomaticallyUpdate false bool

codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"
ditto -c -k --keepParent "$app" "$zip"
echo "app: $app"
echo "zip: $zip"
