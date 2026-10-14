import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import net from 'node:net';
import { validateScanPlan, executeScan, tcpProbe } from '../cli/scanner.mjs';
import { parseArgs } from '../cli/scan.mjs';
const base = { cidr: '192.168.1.0/29', ports: [22, 80, 443], authorized: true };
test('authorization must be explicit; dry-run creates no probes', async () => { for (const authorized of [undefined, false, 'true', 1])
    assert.throws(() => validateScanPlan({ ...base, authorized }), /authorized/); let calls = 0; const report = await executeScan({ ...base, authorized: false, dryRun: true }, async () => { calls++; }); assert.equal(calls, 0); assert.equal(report.dryRun, true); assert.equal(report.results.length, 0); });
test('only fully contained private and loopback targets are accepted', () => { for (const cidr of ['10.0.0.0/28', '172.16.0.0/29', '172.31.255.248/29', '192.168.1.0/29', '127.0.0.1/32', '10.0.0.2/31'])
    assert.ok(validateScanPlan({ ...base, cidr })); for (const cidr of ['8.8.8.8/32', '1.1.1.1/32', '172.15.0.0/29', '172.32.0.0/29', '192.169.1.0/29', '169.254.1.0/29', '100.64.1.0/29', '224.0.0.0/29', '0.0.0.0/32', '255.255.255.255/32', '192.168.0.0/15', '0.0.0.0/0', '240.0.0.1/32'])
    assert.throws(() => validateScanPlan({ ...base, cidr }), undefined, cidr); });
test('candidate cap, exact target scope, and conservative endpoints are enforced', () => { assert.equal(validateScanPlan({ ...base, cidr: '10.0.0.0/28' }).hosts.length, 14); for (const cidr of ['10.0.0.0/27', '192.168.1.1/29', '192.168.1.255/32', '10.0.0.0/32', '10.0.0.0/31', '127.0.0.0/32'])
    assert.throws(() => validateScanPlan({ ...base, cidr })); });
test('ports, concurrency, and deadlines have hard bounds', () => { for (const ports of [[], [21], [65536], ['80'], [80.5], [0], [-1], null])
    assert.throws(() => validateScanPlan({ ...base, ports })); for (const concurrency of [0, 17, 1.5, '8'])
    assert.throws(() => validateScanPlan({ ...base, concurrency })); for (const timeoutMs of [99, 2001, NaN, '800'])
    assert.throws(() => validateScanPlan({ ...base, timeoutMs })); assert.equal(validateScanPlan({ ...base, concurrency: 16, timeoutMs: 2000 }).concurrency, 16); assert.deepEqual(validateScanPlan({ ...base, ports: [443, 80, 80] }).ports, [80, 443]); });
test('every invalid plan is rejected before any injected connection', async () => { let calls = 0; for (const changes of [{ authorized: false }, { cidr: '8.8.8.8/32' }, { ports: [21] }, { cidr: '10.0.0.0/24' }, { concurrency: 17 }])
    await assert.rejects(executeScan({ ...base, ...changes }, async () => { calls++; })); assert.equal(calls, 0); });
test('worker pool never exceeds 16 active attempts and preserves task coverage', async () => { let active = 0, peak = 0; const report = await executeScan({ ...base, cidr: '10.0.0.0/28', concurrency: 16 }, async (host, port) => { active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 2)); active--; return { host, port, status: 'closed', source: 'actual-local' }; }); assert.equal(report.results.length, 42); assert.equal(peak, 16); assert.equal(active, 0); assert.equal(report.summary.closed, 42); assert.equal(report.responsiveHosts, 14); });
test('unexpected probe errors produce unknown results without crashing', async () => { const report = await executeScan({ ...base, cidr: '127.0.0.1/32', ports: [80] }, async () => { throw new Error('unexpected'); }); assert.equal(report.summary.unknown, 1); assert.match(report.results[0].detail, /unexpected/); });
class FakeSocket extends EventEmitter {
    destroyed = false;
    constructor(outcome) { super(); this.outcome = outcome; }
    connect() { if (this.outcome === 'throw')
        throw new Error('sync failure'); if (this.outcome)
        setImmediate(() => this.outcome === 'connect' ? this.emit('connect') : this.emit('error', Object.assign(new Error('network'), { code: this.outcome }))); return this; }
    destroy() { this.destroyed = true; }
}
test('TCP outcomes classify correctly and close sockets', async () => { for (const [outcome, status] of [['connect', 'open'], ['ECONNREFUSED', 'closed'], ['EHOSTUNREACH', 'unknown'], ['throw', 'unknown'], [null, 'no-response']]) {
    const socket = new FakeSocket(outcome);
    const result = await tcpProbe('127.0.0.1', 80, 100, () => socket);
    assert.equal(result.status, status);
    assert.equal(socket.destroyed, true);
    assert.equal(result.source, 'actual-local');
} });
test('late socket events settle only once', async () => { const socket = new FakeSocket('connect'); const result = await tcpProbe('127.0.0.1', 80, 100, () => socket); socket.emit('error', Object.assign(new Error('late'), { code: 'ECONNRESET' })); assert.equal(result.status, 'open'); assert.equal(socket.destroyed, true); });
test('argument parser rejects duplicates, unknown flags, and malformed numbers', () => { for (const args of [['--target', 'x'], ['--ports', '80,no'], ['--ports', '80,'], ['--ports'], ['--timeout', '1e3'], ['--authorized', '--authorized']])
    assert.throws(() => parseArgs(args)); assert.deepEqual(parseArgs(['--cidr', '127.0.0.1/32', '--ports', '80,443', '--authorized']), { cidr: '127.0.0.1/32', ports: [80, 443], authorized: true }); });
test('real loopback acceptance and refusal work with the restricted CLI engine', async (t) => { const server = net.createServer(socket => socket.end()); try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(8080, '127.0.0.1', resolve); });
}
catch (error) {
    if (['EADDRINUSE', 'EACCES', 'EPERM'].includes(error.code)) {
        t.skip('Loopback listener unavailable: ' + error.code);
        return;
    }
    throw error;
} try {
    const report = await executeScan({ cidr: '127.0.0.1/32', ports: [8080], authorized: true, timeoutMs: 300 });
    assert.equal(report.results[0].status, 'open');
}
finally {
    await new Promise(resolve => server.close(resolve));
} const closed = await executeScan({ cidr: '127.0.0.1/32', ports: [8080], authorized: true, timeoutMs: 300 }); assert.equal(closed.results[0].status, 'closed'); });
