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
# Force yarn to re-read the tarball. Same filename means yarn's global cache
# reuses stale content across iterations even with --check-files, so we also
# drop the lockfile (which pins the tarball's content hash) and the local
# entry — install then re-extracts from the freshly-packed tarball.
rm -rf node_modules/react-jsonschema-form-validation yarn.lock
yarn install --silent
