#!/usr/bin/env bash
# Install the runtime fixture for one React major (18 or 19).
#
# Each fixture (react-18/, react-19/) is a mini-workspace pinning react,
# react-dom, @testing-library/react and @testing-library/dom. Installing
# inside the fixture directory keeps its node_modules fully isolated from
# the parent repo's (which stays on React 16 + RTL 12): the runtime vitest
# config (vitest.config.js here) then aliases those four packages to the
# fixture, and every other import keeps resolving to the root tree.
#
# Registry installs only — no tarball, so the plain yarn cache is fine
# (unlike test-types/setup.sh, which must bypass it for its `file:` dep).

set -euo pipefail

VERSION="${1:?usage: setup.sh <18|19>}"
case "$VERSION" in
	18|19) ;;
	*) echo "setup.sh: unsupported React version '$VERSION' (expected 18 or 19)" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/react-${VERSION}"
yarn install --silent
