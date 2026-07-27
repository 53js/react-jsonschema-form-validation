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
# Force yarn to re-read the tarball: same filename means yarn thinks the
# entry is fresh even when the tarball content changed. --check-files
# re-extracts missing packages.
rm -rf node_modules/react-jsonschema-form-validation
yarn install --silent --check-files
