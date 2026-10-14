# Verification and publication status

Verified locally on 2026-10-14 with Node.js 24.13.1 on Windows. This is a record of checks actually executed, not an experimental network performance report.

## Final checks

| Check | Result |
|---|---|
| npm test | 24 passed, 0 failed, 0 skipped |
| npm run lint | Passed, no warnings or errors |
| npm run typecheck | Passed |
| npm run build | Passed; Next.js 16.3.3 production build, static /, /_not-found, and /icon.svg |
| npm run test:e2e | 13 check groups passed against the production build |
| Windows install planning | npm ci --dry-run --ignore-scripts --offline passed |
| Linux x64 install planning | npm ci --dry-run --ignore-scripts --offline --os=linux --cpu=x64 passed |
| CLI smoke checks | Dry-run command, actual loopback CLI command, readable table, local JSON export, and refusal to overwrite passed |
| Actual local networking | One temporary authorized 127.0.0.1:8080 listener: acceptance, cleanup, then refusal passed |
| Private-target safety tests | Injected probes; rejection verified before connection creation |

Browser evidence is in [browser-verification.json](browser-verification.json), with genuine [screenshots](screenshots/). Desktop 1440 px, tablet 768 px, and mobile 390/320 px layouts were checked. The suite exercised the live calculator, prefix edge cases, invalid input, example buttons, copying, keyboard tabs, all pipeline stages, demo playback and speeds, reset during/after playback, tab-switch cleanup, filtering, sorting, inspection, topology controls, TCP sequences, accordions, reduced motion, no-WebGL fallback, and the branded 404. No normal-journey console errors or unhandled page errors were observed. The intentional missing-page request’s expected HTTP 404 is excluded from the console error assertion.

Visual review covered the opening composition, calculations, full simulation results, narrow mobile table, fundamentals, pipeline, TCP states, architecture, local-tool instructions, limitations, glossary, and viva section. No page-level horizontal overflow was observed at the tested sizes. The result table intentionally has its own horizontal scroll region; classification remains visible before the supplementary columns on small screens.

No complete manual screen-reader audit or comprehensive cross-browser certification was performed. Browser verification used installed Chromium-based tooling. Real private-network discovery was not performed, and no actual lab reports were uploaded or committed.

## Issues corrected during verification

- Continuation audit: GPU context loss now cancels rendering, disconnects observers/listeners, and removes the canvas and projected labels before showing SVG. Live reduced-motion and viewport changes release/recreate the scene; SVG host highlighting follows the inspection controls. Added production browser regressions for each transition.

- Fixed a Next.js lint finding by using Link for the error page’s internal route; removed an unused helper.
- Set metadataBase from Vercel’s automatic deployment URL variables, with a local fallback, removing the build warning. Added a PNG sharing image.
- Made the clipboard browser assertion wait for the asynchronous success state instead of checking immediately.
- Narrowed a browser test locator that also matched Next.js’s route announcer.
- Distinguished the intentional 404 response from unexpected normal-journey console errors in the browser test harness.
- Moved classification ahead of service hints in the mobile table and added a scroll hint.
- A later parallel lint/type/build run exhausted local memory. After closing the review browser, all three checks passed sequentially with the normal npm commands.
- Corrected stale transitive dependency files when assembling the cached verification toolchain; generated a portable lockfile and checked Windows/Linux install planning.

All final application checks pass. GitHub Actions configuration is included but has not run remotely.

## Environment and publication

The workspace started empty. All project writes are under D:/CN/subnet-reconnaissance-visualizer; the project has its own new Git repository. Existing projects were used only as read-only sources of installed dependencies for offline checks.

Network package downloads return EACCES in this managed execution environment. The application was built and tested with cached official packages. Offline lockfile resolution and install planning pass, but a fresh registry download / clean installation could not be verified here.

After the user completed Vercel login, Vercel CLI 64.0.2 became available in D:/CN/.npm-cache. The production command was retried from the project directory and reached “Loading teams”, then exited with connect EACCES 34.160.81.0:443. The identity check encounters the same HTTPS connection denial. The CLI dry run reports that the project is not linked; no .vercel project link or deployment was created. This managed session’s outbound network restriction remains the deployment blocker. GitHub CLI still reports no authenticated hosts. No remote repository or production URL has been verified, and no unrelated remote was configured.

From this project directory in a network-enabled terminal, the remaining publication commands are:

~~~sh
gh auth login
gh repo create subnet-reconnaissance-visualizer --public --source . --remote origin --push
gh repo view --json url
npx --cache D:/CN/.npm-cache --yes vercel@latest deploy --prod
~~~

Choose a new Vercel project for this source directory. After deployment, open the returned URL and repeat the calculator/demo/mobile smoke checks before claiming production verification. The public lab remains a simulation after deployment; the CLI stays local.
