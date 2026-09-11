#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

workspace_field() {
  local workspace="$1"
  local field="$2"
  node --input-type=commonjs -e '
    const { execFileSync } = require("node:child_process");
    const workspace = process.argv[1];
    const field = process.argv[2];
    const parsed = JSON.parse(
      execFileSync("npm", ["pkg", "get", field, "--workspace", workspace], {
        encoding: "utf8",
      }),
    );
    const value = typeof parsed === "string" ? parsed : parsed[workspace];
    if (typeof value !== "string" || value.length === 0) {
      process.exit(1);
    }
    process.stdout.write(value);
  ' "$workspace" "$field"
}

publish_workspace() {
  local workspace="$1"
  local name version
  name="$(workspace_field "$workspace" name)"
  version="$(workspace_field "$workspace" version)"
  if npm view "${name}@${version}" version >/dev/null 2>&1; then
    echo "Skip ${name}@${version} (already on npm)"
    return 0
  fi
  if [[ "${DRY_RUN}" == true ]]; then
    echo "Would publish ${name}@${version}"
    return 0
  fi
  set +e
  local publish_log
  publish_log="$(npm publish --workspace "$workspace" --access public --provenance 2>&1)"
  local publish_status=$?
  set -e
  printf '%s\n' "${publish_log}"
  if [[ "${publish_status}" -eq 0 ]]; then
    return 0
  fi
  if grep -Fq "cannot publish over the previously published versions" <<<"${publish_log}"; then
    echo "Skip ${name}@${version} (already on npm)"
    return 0
  fi
  return "${publish_status}"
}

publish_workspace @arcanetech/privacy-sdk-core
publish_workspace @arcanetech/privacy-sdk-relay
publish_workspace @arcanetech/privacy-sdk-stellar
publish_workspace @arcanetech/privacy-sdk-state-redux
publish_workspace @arcanetech/privacy-sdk-state-memory
