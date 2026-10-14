import net from 'node:net';
import { calculateSubnet, candidateAddresses, ipv4Number } from '../src/lib/subnet.ts';
export const ALLOWED_PORTS = Object.freeze([22, 53, 80, 443, 3306, 5432, 8080]);
const RANGES = [['10.0.0.0', '10.255.255.255'], ['172.16.0.0', '172.31.255.255'], ['192.168.0.0', '192.168.255.255'], ['127.0.0.0', '127.255.255.255']].map(([a, b]) => [ipv4Number(a), ipv4Number(b)]);
export function validateScanPlan(options) {
    if (!options || typeof options.cidr !== 'string')
        throw new Error('An explicit IPv4 CIDR is required.');
    if (options.dryRun !== undefined && typeof options.dryRun !== 'boolean')
        throw new Error('dryRun must be a boolean.');
    const dryRun = options.dryRun === true;
    if (!dryRun && options.authorized !== true)
        throw new Error('Scanning requires --authorized: acknowledge that you own or have permission to test every target.');
    const subnet = calculateSubnet(options.cidr);
    if (options.cidr.trim() !== subnet.normalized)
        throw new Error('Use the exact network CIDR ' + subnet.normalized + '. Host bits are set; the tool will not silently broaden your target.');
    if (!RANGES.some(([a, b]) => subnet.networkNumber >= a && subnet.lastNumber <= b))
        throw new Error('The entire subnet must be within one RFC1918 private range or 127.0.0.0/8 loopback.');
    const hosts = candidateAddresses(subnet, 14);
    if (hosts.some(host => { const last = Number(host.split('.')[3]); return last === 0 || last === 255; }))
        throw new Error('Conservative target policy excludes .0 and .255 endpoints, including /31 and /32 targets.');
    if (!Array.isArray(options.ports) || options.ports.length === 0 || options.ports.some(p => !Number.isInteger(p) || !ALLOWED_PORTS.includes(p)))
        throw new Error('Explicitly select ports from: ' + ALLOWED_PORTS.join(', '));
    const timeoutMs = options.timeoutMs ?? 800;
    const concurrency = options.concurrency ?? 8;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 2000)
        throw new Error('Timeout must be an integer from 100 to 2000 ms.');
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
        throw new Error('Concurrency must be an integer from 1 to 16.');
    return Object.freeze({ cidr: subnet.normalized, hosts: Object.freeze(hosts), ports: Object.freeze([...new Set(options.ports)].sort((a, b) => a - b)), timeoutMs, concurrency, dryRun, source: 'actual-local' });
}
export function tcpProbe(host, port, timeoutMs, socketFactory = () => new net.Socket()) {
    return new Promise(resolve => {
        const start = performance.now();
        const socket = socketFactory();
        let finished = false;
        const done = (status, detail) => { if (finished)
            return; finished = true; clearTimeout(deadline); socket.destroy(); resolve({ host, port, status, detail, elapsedMs: Math.round(performance.now() - start), source: 'actual-local' }); };
        const deadline = setTimeout(() => done('no-response', 'Deadline expired; filtering, packet loss, or a silent target are possible. Firewall responsibility is unproven.'), timeoutMs);
        socket.once('connect', () => done('open', 'TCP connection accepted; the application protocol was not identified.'));
        socket.once('error', error => done(error.code === 'ECONNREFUSED' ? 'closed' : 'unknown', error.code === 'ECONNREFUSED' ? 'ECONNREFUSED: target explicitly refused the connection.' : (error.code || 'UNKNOWN') + ': inconclusive network or system error.'));
        try {
            socket.connect({ host, port });
        }
        catch (error) {
            done('unknown', error.code || error.message);
        }
    });
}
export async function executeScan(options, probe = tcpProbe) {
    const plan = validateScanPlan(options);
    if (plan.dryRun)
        return { source: 'actual-local', dryRun: true, plan, results: [], summary: { open: 0, closed: 0, 'no-response': 0, unknown: 0 } };
    const jobs = plan.hosts.flatMap(host => plan.ports.map(port => ({ host, port })));
    const results = new Array(jobs.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(plan.concurrency, jobs.length) }, async () => {
        while (cursor < jobs.length) {
            const index = cursor++;
            const { host, port } = jobs[index];
            try {
                results[index] = await probe(host, port, plan.timeoutMs);
            }
            catch (error) {
                results[index] = { host, port, status: 'unknown', detail: error.message, source: 'actual-local', elapsedMs: 0 };
            }
        }
    }));
    const summary = { open: 0, closed: 0, 'no-response': 0, unknown: 0 };
    results.forEach(result => summary[result.status]++);
    const responsiveHosts = new Set(results.filter(r => r.status === 'open' || r.status === 'closed').map(r => r.host)).size;
    return { source: 'actual-local', dryRun: false, createdAt: new Date().toISOString(), plan, results, summary, responsiveHosts, note: 'TCP responses are evidence of responsiveness. A timeout does not prove a host is offline or a firewall is present. No application identification or security assessment was performed.' };
}
