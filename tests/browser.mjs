import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const url = process.env.BASE_URL || 'http://127.0.0.1:3100';
const shots = new URL('../docs/screenshots/', import.meta.url);
await mkdir(shots, { recursive: true });
const knownBrowsers = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (!existsSync(chromium.executablePath()) ? knownBrowsers.find(existsSync) : undefined);
let server, serverLog = '', browser;
const errors = [], checks = [];
const check = (name) => { checks.push(name); console.log('PASS ' + name); };
const pause = ms => new Promise(r => setTimeout(r, ms));
async function screenshot(page, name) { await page.screenshot({ path: fileURLToPath(new URL(name, shots)), scale: 'css', animations: 'disabled' }); }
async function overflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false); }
try {
    if (!process.env.BASE_URL) {
        server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        server.stdout.on('data', d => serverLog += d);
        server.stderr.on('data', d => serverLog += d);
    }
    let ready = false;
    for (let i = 0; i < 100; i++) {
        try {
            if ((await fetch(url)).ok) {
                ready = true;
                break;
            }
        }
        catch { }
        await pause(200);
    }
    assert.ok(ready, 'Production server failed: ' + serverLog);
    for (const path of ['/icon.svg','/social.png']) assert.ok((await fetch(url+path)).ok, 'Missing asset '+path);
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !(m.location().url === url + '/missing-page' && m.text().includes('404')))
        errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    assert.match(await page.title(), /SubnetScope/);
    await overflow(page);
    await screenshot(page, 'desktop-overview.png');
    for (const id of ['overview', 'how-it-works', 'lab', 'architecture', 'about'])
        assert.equal(await page.locator('#' + id).count(), 1);
    for (const anchor of await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href'))))
        assert.equal(await page.locator(anchor).count(), 1, 'Broken anchor ' + anchor);
    await page.getByRole('button', { name: 'Pause network animation' }).click();
    await page.getByRole('button', { name: 'Resume network animation' }).click();
    for (const ip of ['.1', '.2', '.3', '.4', '.5', '.6'])
        await page.locator('.host-selector').getByRole('button', { name: ip, exact: true }).click();
    assert.match(await page.locator('.topology-inspect').innerText(), /No response/);
    assert.equal(await page.locator('.three-mount canvas').count(), 1);
    await page.locator('.scene-node-label.selected').filter({ hasText: '192.168.1.6' }).waitFor();
    check('Opening view, anchors, topology inspection, pause/resume');
    await page.evaluate(() => {
        const canvas = document.querySelector('.three-mount canvas');
        const extension = canvas.getContext('webgl').getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('Context-loss extension unavailable in test browser');
        extension.loseContext();
    });
    await page.locator('.three-mount canvas').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.scene-node-label').count(), 0);
    assert.equal(await page.locator('.scene-fallback.is-hidden').count(), 0);
    await page.locator('.host-selector').getByRole('button', { name: '.2', exact: true }).click();
    assert.match(await page.locator('.map-node.selected').textContent(), /Web server192.168.1.2/);
    await screenshot(page, 'webgl-context-loss.png');
    check('Context loss cleans up canvas and labels; SVG host inspection remains functional');

    const preferenceContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const preferencePage = await preferenceContext.newPage();
    preferencePage.on('pageerror', error => errors.push(error.message));
    await preferencePage.goto(url, { waitUntil: 'networkidle' });
    await preferencePage.locator('.three-mount canvas').waitFor();
    await preferencePage.emulateMedia({ reducedMotion: 'reduce' });
    await preferencePage.locator('.three-mount canvas').waitFor({ state: 'detached' });
    assert.equal(await preferencePage.locator('.scene-node-label').count(), 0);
    assert.equal(await preferencePage.locator('.scene-fallback.is-hidden').count(), 0);
    await preferencePage.locator('.host-selector').getByRole('button', { name: '.6', exact: true }).click();
    assert.match(await preferencePage.locator('.map-node.selected').textContent(), /No response192.168.1.6/);
    await screenshot(preferencePage, 'motion-preference-fallback.png');
    await preferencePage.emulateMedia({ reducedMotion: 'no-preference' });
    await preferencePage.locator('.three-mount canvas').waitFor();
    await preferencePage.locator('.scene-node-label.selected').filter({ hasText: '192.168.1.6' }).waitFor();
    await preferencePage.setViewportSize({ width: 650, height: 900 });
    await preferencePage.locator('.three-mount canvas').waitFor({ state: 'detached' });
    assert.equal(await preferencePage.locator('.scene-node-label').count(), 0);
    await preferencePage.setViewportSize({ width: 1440, height: 900 });
    await preferencePage.locator('.three-mount canvas').waitFor();
    assert.equal(await preferencePage.locator('.scene-node-label').count(), 6);
    await preferenceContext.close();
    check('Live motion and viewport changes cleanly release and recreate 3D resources');

    for (let i = 0; i < 8; i++) {
        await page.locator('.pipeline-stages button').nth(i).click();
        assert.equal(await page.locator('.pipeline-main h3').innerText(), await page.locator('.pipeline-stages button strong').nth(i).innerText());
    }
    await page.getByRole('button', { name: 'Previous pipeline stage' }).click();
    await page.getByRole('button', { name: 'Next pipeline stage' }).click();
    assert.ok(await page.getByRole('button', { name: 'Next pipeline stage' }).isDisabled());
    check('All eight workflow stages and bounded previous/next controls');
    await page.getByRole('tab', { name: /Subnet Explorer/ }).click();
    const cidr = page.getByLabel('IPv4 address / CIDR prefix');
    for (const [input, total, usable] of [['192.168.1.0/24', '256', '254'], ['192.168.1.0/29', '8', '6'], ['10.0.0.2/31', '2', '2'], ['127.0.0.1/32', '1', '1'], ['0.0.0.0/0', '4,294,967,296', '4,294,967,294']]) {
        await cidr.fill(input);
        await page.getByRole('button', { name: 'Calculate', exact: true }).click();
        assert.equal(await page.locator('.metric').nth(2).locator('strong').innerText(), total);
        assert.equal(await page.locator('.metric').nth(3).locator('strong').innerText(), usable);
    }
    await cidr.fill('192.168.1.256/24');
    assert.ok(await page.locator('.error-message[role="alert"]').isVisible());
    assert.equal(await cidr.getAttribute('aria-invalid'), 'true');
    await screenshot(page, 'subnet-invalid.png');
    for (const example of ['192.168.1.0/24', '192.168.1.0/29', '10.0.0.0/31', '127.0.0.1/32', '0.0.0.0/0'])
        await page.getByRole('button', { name: example, exact: true }).click();
    await page.getByRole('button', { name: '192.168.1.0/24', exact: true }).click();
    await page.getByRole('button', { name: 'Copy CIDR' }).click();
    await page.getByRole('button', { name: 'Copied' }).waitFor();
    await page.locator('#lab').scrollIntoViewIfNeeded();
    await screenshot(page, 'subnet-explorer.png');
    check('Live arithmetic, examples, Calculate, clipboard, validation, and edge cases');
    await page.getByRole('tab', { name: /Subnet Explorer/ }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: /Port Profiling/ }).getAttribute('aria-selected'), 'true');
    await page.getByLabel('Illustrative lab subnet').fill('192.168.1.0/24');
    await page.getByRole('button', { name: 'Start Demo', exact: true }).click();
    assert.ok(await page.locator('.error-message[role="alert"]').isVisible());
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByLabel('Playback').selectOption('450');
    await page.getByRole('button', { name: 'Start Demo', exact: true }).click();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await pause(600);
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '0');
    await page.getByRole('button', { name: 'Start Demo', exact: true }).click();
    await page.getByRole('tab', { name: /Subnet Explorer/ }).click();
    await page.getByRole('tab', { name: /Port Profiling/ }).click();
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '0');
    await page.getByLabel('Playback').selectOption('45');
    await page.getByRole('button', { name: 'Start Demo', exact: true }).click();
    await page.waitForFunction(() => Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')) > 25);
    await screenshot(page, 'demo-progress.png');
    await page.getByRole('status').waitFor({ timeout: 15000 });
    assert.equal(await page.locator('.results-table tbody tr').count(), 36);
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');
    assert.deepEqual(await page.locator('.summary-stat strong').allTextContents(), ['6', '17', '12', '1']);
    await page.locator('.results-toolbar').scrollIntoViewIfNeeded();
    await screenshot(page, 'port-lab.png');
    check('Simulation validation, playback, reset mid-run, complete 36-result dataset and summary');
    await page.getByRole('button', { name: 'Sort results by port' }).click();
    assert.deepEqual(await page.locator('.results-table tbody tr').locator('td:nth-child(2)').allTextContents(), [...Array(6).fill('22'), ...Array(6).fill('53'), ...Array(6).fill('80'), ...Array(6).fill('443'), ...Array(6).fill('3306'), ...Array(6).fill('5432')]);
    await page.getByRole('button', { name: 'Sort results by host' }).click();
    await page.getByLabel('Filter by host').selectOption('192.168.1.2');
    await page.getByLabel('Filter by status').selectOption('open');
    assert.equal(await page.locator('.results-table tbody tr').count(), 2);
    await page.getByRole('button', { name: 'Inspect 192.168.1.2 port 80', exact: true }).click();
    assert.match(await page.locator('.inspection-card').innerText(), /Simulated TCP connection accepted/);
    await page.getByRole('button', { name: 'Close result details' }).click();
    await page.getByLabel('Filter by host').selectOption('192.168.1.4');
    assert.match(await page.locator('.empty-results').innerText(), /No observations match/);
    await page.getByLabel('Filter by status').selectOption('no-response');
    assert.equal(await page.locator('.results-table tbody tr').count(), 6);
    await page.locator('.host-network button').nth(1).click();
    assert.equal(await page.getByLabel('Filter by host').inputValue(), '192.168.1.2');
    await page.locator('.host-network button').nth(1).click();
    assert.equal(await page.getByLabel('Filter by host').inputValue(), 'all');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    assert.match(await page.locator('.empty-results').innerText(), /Observations appear/);
    check('Host/status filters, sorting, result inspection, topology filters, and reset after completion');
    for (let i = 0; i < 4; i++) {
        await page.locator('.tcp-options button').nth(i).click();
        await screenshot(page, 'tcp-outcome-' + i + '.png');
    }
    check('All four TCP outcome sequence explanations');
    for (const id of ['architecture', 'local-tool', 'about']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await screenshot(page, id + '.png');
    }
    await page.locator('.local-instructions summary').click();
    assert.ok(await page.locator('.local-instructions').getAttribute('open') !== null);
    await page.locator('.local-instructions summary').click();
    for (const item of await page.locator('.viva summary').all()) {
        await item.click();
        await item.click();
    }
    check('Architecture, local instructions, limitations, and all viva accordions');
    for (const width of [768, 390, 320]) {
        const mobile = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'reduce' });
        const p = await mobile.newPage();
        p.on('pageerror', e => errors.push(e.message));
        await p.goto(url, { waitUntil: 'networkidle' });
        await overflow(p);
        if (width < 700) {
            await p.getByRole('button', { name: 'Open navigation' }).click();
            await p.getByRole('navigation').getByRole('link', { name: 'Interactive lab', exact: true }).click();
            assert.equal(await p.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded'), 'false');
            await p.getByRole('button', { name: 'Open navigation' }).click();
            await p.keyboard.press('Escape');
            assert.equal(await p.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded'), 'false');
        }
        await p.locator('a[aria-label="SubnetScope home"]').click();
        await screenshot(p, 'mobile-' + width + '.png');
        await p.locator('#lab').scrollIntoViewIfNeeded();
        await screenshot(p, 'mobile-subnet-' + width + '.png');
        await overflow(p);
        await p.getByRole('tab', { name: /Port Profiling/ }).click();
        await p.getByLabel('Playback').selectOption('45');
        await p.getByRole('button', { name: 'Start Demo', exact: true }).click();
        await p.getByRole('status').waitFor({ timeout: 15000 });
        await p.locator('.results-toolbar').scrollIntoViewIfNeeded();
        await overflow(p);
        await screenshot(p, 'mobile-ports-' + width + '.png');
        await mobile.close();
    }
    check('768/390/320 px layouts, reduced motion, mobile menu and Escape, full mobile demo');
    const fallback = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' ? null : original.call(this, type, ...args); }; });
    const p = await fallback.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await p.locator('.scene-fallback.is-hidden').count(), 0);
    assert.ok(await p.locator('.topology-svg').isVisible());
    await fallback.close();
    check('Graceful no-WebGL fallback');
    const missing = await page.goto(url + '/missing-page', { waitUntil: 'networkidle' });
    assert.equal(missing.status(), 404);
    assert.match(await page.locator('h1').innerText(), /off the map/);
    await screenshot(page, '404.png');
    check('Branded 404 route');
    assert.deepEqual(errors, []);
    check('No browser console errors or unhandled page errors');
    await writeFile(new URL('../docs/browser-verification.json', import.meta.url), JSON.stringify({ passed: checks.length, checks, errors, viewports: [1440, 768, 390, 320], source: 'local production build', generatedAt: new Date().toISOString() }, null, 2) + '\n');
    console.log('Browser verification complete: ' + checks.length + ' groups passed.');
}
finally {
    await browser?.close();
    server?.kill();
}
