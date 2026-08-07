#!/usr/bin/env bash
# Local dev matrix runner. Type-checks `test-types/` against every supported
# @types/react major, then restores the default (16) — even on failure or
# Ctrl-C, thanks to the trap on EXIT.
#
# CI runs the equivalent via the GitHub Actions `types` matrix (see
# .github/workflows/ci.yml) and does NOT rely on this script.

set -euo pipefail
cd "$(dirname "$0")"

DEFAULT_VERSION=16
VERSIONS=(16 17 18 19)

trap 'yarn add --dev --silent "@types/react@^${DEFAULT_VERSION}" >/dev/null' EXIT

bash setup.sh

for VERSION in "${VERSIONS[@]}"; do
	echo "==> @types/react@^${VERSION}"
	yarn add --dev --silent "@types/react@^${VERSION}" >/dev/null
	yarn test
done

echo ""
echo "✓ Type-level tests passed on @types/react ${VERSIONS[*]}"
