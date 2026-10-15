# Verification and publication status

Verified on 2026-10-15. The public site is [SubnetScope](https://subnet-reconnaissance-visualizer.vercel.app); the source is the new [public GitHub repository](https://github.com/Thanujgthub/subnet-reconnaissance-visualizer).

## Application checks

| Check | Result |
|---|---|
| Fresh registry installation | npm ci passed in a clean directory and in the project |
| Unit and scanner-safety tests | 24 passed, 0 failed, 0 skipped |
| Lint | Passed |
| Strict TypeScript | Passed |
| Local production build | Passed |
| Vercel production build | Passed; deployment READY |
| Production browser journeys | 13 groups passed; actual public URL recorded in browser-verification.json |
| Responsive checks | 1440, 768, 390, and 320 px |
| Browser console and page errors | None in the tested normal journeys |
| Presentation downloads | Public HTTP 200; PPTX/PDF hashes match the verified local files |
| PowerPoint | Native open passed, 12 slides and 12 populated speaker notes |
| Deck package and layout | No integrity findings, layout findings, or font-policy warnings |

The supported CI and hosting runtime is pinned to Node 24. The renewed Windows checks ran on the available Node 25.6.0 installation; npm warns about that local engine difference. Earlier Node 24.13.1 checks also passed. The GitHub Actions workflow uses Node 24 and is checked separately after pushing.

The browser suite covers navigation and anchors, topology selection and motion controls, WebGL context loss and resource cleanup, changing motion/viewport preferences, all eight pipeline stages, calculator input/clipboard/edge cases, deterministic playback, reset during/after playback, filters, sorting, result inspection, TCP sequences, architecture and viva content, direct presentation downloads, mobile menu/Escape, reduced motion, no-WebGL fallback, and the branded 404. Genuine screenshots are in screenshots/. The results table has an intentional independent horizontal scroll area on small screens.

## Real local networking

Unit/integration checks create only an owned temporary 127.0.0.1:8080 listener, verify acceptance, close it, and verify refusal. The actual CLI dry-run, authorization, readable table, local JSON export, and refusal to overwrite were also verified. Private-network safety tests use injected probes; no other private network was scanned and no actual report was published.

## Presentation

The public directory contains SubnetScope-Project.pptx, SubnetScope-Project.pdf, and SubnetScope-Speaker-Notes.txt. The PPTX contains editable text and diagrams. It was normalized/exported by Microsoft PowerPoint, reopened normally, and all 12 native slide renders were inspected. The PDF is a native PowerPoint export. This replaces the account-restricted Page fallback with ordinary public downloads.

The deck integrity checker passed. The layout checker passed for 12 slides, 16:9 dimensions, heading fit, bullet geometry, Arial and Consolas. Its Python 3.9 invocation needed an in-memory itertools.pairwise compatibility shim; no skill files were changed. No unsupported claim of comprehensive PowerPoint compatibility testing is made.

## Publication

GitHub CLI authentication and Vercel identity were verified. A new public repository was created under Thanujgthub and main was pushed without changing unrelated repositories. A new Vercel project was created and connected to that repository. The production alias is publicly readable without an account; checks used ordinary unauthenticated HTTP requests and a fresh browser context.

The public site is hosted on Vercel and does not depend on this PC or a temporary tunnel. No four-hour uptime guarantee is claimed. The educational lab sends no real network probes. The CLI and local reports are excluded from Vercel uploads.

## Corrected issues

The original managed session could not launch processes or download packages. After execution/network access became available, both authenticated CLIs worked. The first remote build exposed an invalid offline-generated lockfile. The lockfile was regenerated from the official registry in a clean directory, Next.js ESLint configuration versions were aligned, and fresh installation plus cloud builds passed. This resolved the initial GitHub Actions installation failure as well; final CI status is verified against the pushed commit.

Earlier UI verification corrected clipboard timing, a route-announcer selector, an expected 404 assertion, mobile classification visibility, and WebGL context cleanup. One prior parallel check exhausted memory; subsequent checks passed.

## Limits of verification

No full manual screen-reader audit or comprehensive cross-browser certification was performed. Browser checks used Chromium. TCP classification does not identify applications or determine service security, and a timeout does not prove filtering or an offline host. All website port observations and timings are explicitly simulated.
