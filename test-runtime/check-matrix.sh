#!/usr/bin/env bash
# Local dev matrix runner. Executes the full unit-test suite against every
# React major of the runtime matrix (19 today), reusing the exact CI recipe
# (see the `runtime` matrix in .github/workflows/ci.yml). The native
# React 18 run stays `yarn test:runtime` from the repo root.
#
# Runs EVERY version even if one fails (matrix semantics), then exits
# non-zero if any failed.

set -euo pipefail
cd "$(dirname "$0")/.."

VERSIONS=(19)
FAILED=()

for VERSION in "${VERSIONS[@]}"; do
	echo "==> react@${VERSION}"
	bash test-runtime/setup.sh "$VERSION"
	REACT_VERSION="$VERSION" yarn vitest run --config test-runtime/vitest.config.js \
		|| FAILED+=("$VERSION")
done

echo ""
if ((${#FAILED[@]})); then
	echo "✗ Runtime suite failed on react ${FAILED[*]}"
	exit 1
fi
echo "✓ Runtime tests passed on react ${VERSIONS[*]}"
