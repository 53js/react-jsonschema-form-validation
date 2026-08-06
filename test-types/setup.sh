#!/usr/bin/env bash
# Rebuild dist/, pack the lib into a tarball under test-types/, then let
# yarn install it. Isolates the fixture's node_modules from the parent
# repo's — a plain `file:..` in yarn 1 exposes the whole parent tree
# (including its own `node_modules/@types/react`), which would collide
# with the version the fixture pins.

set -euo pipefail
cd "$(dirname "$0")/.."

# Ensure dist/ reflects the current source
yarn dist:js >/dev/null
yarn dist:types >/dev/null

yarn pack --filename test-types/rjfv-fixture.tgz >/dev/null

cd test-types
# Force yarn to re-read the tarball. yarn 1's global cache keys `file:`
# tarballs by name-version, so as long as the packed version stays 0.6.0
# the global cache serves stale content — even after `rm yarn.lock` and
# `rm node_modules/…`. Pointing yarn at a throwaway cache-folder bypasses
# the global one and forces a fresh extract from the freshly-packed
# tarball. The user's real cache is untouched.
rm -rf node_modules/react-jsonschema-form-validation yarn.lock
yarn install --silent --cache-folder "$(mktemp -d)"
