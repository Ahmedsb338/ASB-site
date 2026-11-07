#!/usr/bin/env bash
# Run after each successful EAS build (npm i -g eas-cli; eas login or EXPO_TOKEN). Rewrites latest.json from the newest finished builds.
# iOS: the link only works for devices/people your Apple Developer account allows (internal/TestFlight). Use the App Store or TestFlight URL once it exists.
set -euo pipefail
cd "$(dirname "$0")"
for p in android ios; do
  eas build:list --platform "$p" --status finished --limit 1 --json --non-interactive > "/tmp/asb-$p.json" || echo "[]" > "/tmp/asb-$p.json"
done
node -e '
const fs=require("fs");
const pick=(f)=>{const b=(JSON.parse(fs.readFileSync(f,"utf8"))||[])[0]; if(!b) return null; const a=b.artifacts||{};
  return {version:b.appVersion,buildId:b.id,profile:b.buildProfile,createdAt:b.createdAt,expiresAt:b.expirationDate||null,url:a.applicationArchiveUrl||a.buildUrl||("https://expo.dev/accounts/asb100100/projects/asb-workforce/builds/"+b.id)};};
const cur=fs.existsSync("latest.json")?JSON.parse(fs.readFileSync("latest.json","utf8")):{};
const out={android:pick("/tmp/asb-android.json")||cur.android||null, ios:pick("/tmp/asb-ios.json")||cur.ios||null};
fs.writeFileSync("latest.json",JSON.stringify(out,null,2)+"\n"); console.log("updated",out.android&&out.android.buildId,out.ios&&out.ios.buildId);'
echo "Redeploy the site folder (index.html + latest.json)."
