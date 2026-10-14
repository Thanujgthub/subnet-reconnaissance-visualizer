#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { ALLOWED_PORTS, executeScan } from './scanner.mjs';
const HELP = 'SubnetScope — authorized local TCP connection tests\n\nUsage: npm run scan -- --cidr 127.0.0.1/32 --ports 80,443 --authorized\n       npm run scan -- --cidr 192.168.1.0/29 --ports 22,80,443 --dry-run\n\nOptions:\n  --cidr <IPv4/CIDR>    Exact private or loopback network; at most 14 hosts\n  --ports <list>        Required comma-separated allowlisted TCP ports\n  --authorized          Acknowledge permission for every target\n  --dry-run             Print the plan without creating sockets\n  --timeout <ms>        100–2000; default 800\n  --concurrency <n>     1–16; default 8\n  --output <path>       Save JSON locally; refuses to overwrite existing files\n  --help                Show usage\n\nAllowed ports: ' + ALLOWED_PORTS.join(', ') + '\nNo external collection. No application fingerprinting. No public scanning API.';
export function parseArgs(args) {
    const mapping = { '--cidr': 'cidr', '--ports': 'ports', '--timeout': 'timeoutMs', '--concurrency': 'concurrency', '--output': 'output', '--authorized': 'authorized', '--dry-run': 'dryRun' };
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        const key = mapping[flag];
        if (!key)
            throw new Error('Unknown option: ' + flag);
        if (key in options)
            throw new Error('Duplicate option: ' + flag);
        if (flag === '--authorized' || flag === '--dry-run') {
            options[key] = true;
            continue;
        }
        const value = args[++i];
        if (!value || value.startsWith('--'))
            throw new Error('Missing value for ' + flag);
        if (key === 'ports') {
            if (!/^\d+(,\d+)*$/.test(value))
                throw new Error('Ports must be comma-separated decimal integers.');
            options[key] = value.split(',').map(Number);
        }
        else if (key === 'timeoutMs' || key === 'concurrency') {
            if (!/^\d+$/.test(value))
                throw new Error(flag + ' must be an integer.');
            options[key] = Number(value);
        }
        else
            options[key] = value;
    }
    return options;
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.length === 1 && args[0] === '--help') {
        console.log(HELP);
        return;
    }
    const options = parseArgs(args);
    const report = await executeScan(options);
    console.log(report.dryRun ? 'DRY RUN — no network traffic sent' : 'ACTUAL LOCAL TCP RESULTS — authorized lab only');
    console.log('CIDR: ' + report.plan.cidr + ' | Hosts: ' + report.plan.hosts.join(', ') + ' | Ports: ' + report.plan.ports.join(', '));
    console.log('Timeout: ' + report.plan.timeoutMs + ' ms | Concurrency: ' + report.plan.concurrency);
    if (!report.dryRun) {
        console.table(report.results.map(({ host, port, status, elapsedMs }) => ({ host, port, status, elapsedMs })));
        console.log('Summary:', report.summary);
        console.log('Responsive hosts:', report.responsiveHosts);
        console.log(report.note);
    }
    if (options.output) {
        await writeFile(options.output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        console.log('Saved local JSON to ' + options.output);
    }
}
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
    main().catch(error => { console.error('SubnetScope: ' + error.message); process.exitCode = 1; });
}
