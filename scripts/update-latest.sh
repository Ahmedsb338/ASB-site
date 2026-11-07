#!/usr/bin/env bash
# Run after each successful EAS build (needs: npm i -g eas-cli, eas login or EXPO_TOKEN). Rewrites latest.json from the newest finished Android preview build.
set -euo pipefail
cd "$(dirname "$0")"
eas build:list --platform android --build-profile preview --status finished --limit 1 --json --non-interactive > /tmp/asb-build.json
node -e '
const b=JSON.parse(require("fs").readFileSync("/tmp/asb-build.json","utf8"))[0];
if(!b) throw new Error("No finished build");
const a=b.artifacts||{};
const out={version:b.appVersion,buildId:b.id,profile:b.buildProfile,createdAt:b.createdAt,expiresAt:b.expirationDate,
  url:a.applicationArchiveUrl||a.buildUrl,page:"https://expo.dev/accounts/asb100100/projects/asb-workforce/builds/"+b.id};
require("fs").writeFileSync("latest.json",JSON.stringify(out,null,2)+"\n");
console.log("latest.json ->",out.buildId);
'
echo "Now redeploy the site folder (index.html + latest.json)."
