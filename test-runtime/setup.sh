#!/usr/bin/env bash
# Install the runtime fixture for one React major (19 only for now — React
# 18 is the root tree's own version, exercised by `yarn test:runtime`).
#
# Each fixture (react-19/) is a mini-workspace pinning react, react-dom,
# @testing-library/react and @testing-library/dom. Installing inside the
# fixture directory keeps its node_modules fully isolated from the parent
# repo's: the runtime vitest config (vitest.config.js here) then aliases
# those four packages to the fixture, and every other import keeps
# resolving to the root tree.
#
# Registry installs only — no tarball, so the plain yarn cache is fine
# (unlike test-types/setup.sh, which must bypass it for its `file:` dep).

set -euo pipefail

VERSION="${1:?usage: setup.sh <19>}"
case "$VERSION" in
	19) ;;
	*) echo "setup.sh: unsupported React version '$VERSION' (expected 19)" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/react-${VERSION}"
yarn install --silent
