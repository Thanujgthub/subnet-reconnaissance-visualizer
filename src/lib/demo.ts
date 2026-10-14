import { calculateSubnet, candidateAddresses } from './subnet.ts';
export const LAB_CIDR = '192.168.1.0/29';
export const PORTS = [22, 53, 80, 443, 3306, 5432] as const;
export type Status = 'open' | 'closed' | 'no-response' | 'unknown';
export type ProbeResult = {
    host: string;
    port: number;
    status: Status;
    reason: string;
    elapsedMs: number;
    source: 'simulation';
};
export type DemoEvent = {
    id: number;
    phase: 'validation' | 'candidate' | 'discovery' | 'probe' | 'complete';
    message: string;
    host?: string;
    responsive?: boolean;
    result?: ProbeResult;
};
export const STATUS_LABELS: Record<Status, string> = { open: 'Open', closed: 'Closed', 'no-response': 'No response', unknown: 'Error / Unknown' };
export const SERVICES: Record<number, string> = { 22: 'SSH', 53: 'DNS (TCP)', 80: 'HTTP', 443: 'HTTPS', 3306: 'MySQL', 5432: 'PostgreSQL' };
export const HOST_NAMES: Record<string, string> = { '192.168.1.1': 'Gateway', '192.168.1.2': 'Web server', '192.168.1.3': 'Workstation', '192.168.1.4': 'Silent device', '192.168.1.5': 'Lab server', '192.168.1.6': 'Unresponsive address' };
export function createDemoEvents(cidr = LAB_CIDR): DemoEvent[] {
    const subnet = calculateSubnet(cidr);
    if (cidr !== LAB_CIDR || subnet.normalized !== LAB_CIDR)
        throw new Error('This deterministic lesson uses only ' + LAB_CIDR + '.');
    const hosts = candidateAddresses(subnet);
    const events: DemoEvent[] = [];
    const add = (event: Omit<DemoEvent, 'id'>) => events.push({ id: events.length, ...event });
    add({ phase: 'validation', message: 'Validated ' + LAB_CIDR + ' · 8 addresses · 6 candidates. Simulation only.' });
    hosts.forEach(host => add({ phase: 'candidate', host, message: host + ' added as a candidate address.' }));
    hosts.forEach((host, index) => add({ phase: 'discovery', host, responsive: index !== 3 && index !== 5, message: host + (index === 3 || index === 5 ? ' · discovery deadline reached; liveness unconfirmed.' : ' · simulated TCP discovery response observed.') }));
    hosts.forEach((host, index) => PORTS.forEach(port => {
        let status: Status = 'closed';
        if (index === 3 || index === 5)
            status = 'no-response';
        else if ((index === 0 && port === 443) || (index === 1 && (port === 80 || port === 443)) || (index === 2 && port === 22) || (index === 4 && (port === 22 || port === 5432)))
            status = 'open';
        else if (index === 4 && port === 3306)
            status = 'unknown';
        const reason = status === 'open' ? 'Simulated TCP connection accepted. The conventional service name is a hint, not application identification.' : status === 'closed' ? 'Simulated ECONNREFUSED: an explicit refusal, providing evidence the address responded.' : status === 'no-response' ? 'Simulated 800 ms deadline expired. Filtering, a silent host, or packet loss could explain it; firewall responsibility is unproven.' : 'Simulated EHOSTUNREACH: the route did not provide enough evidence to classify this port.';
        const result: ProbeResult = { host, port, status, reason, elapsedMs: status === 'no-response' ? 800 : status === 'unknown' ? 14 : 8 + index * 4 + port % 13, source: 'simulation' };
        add({ phase: 'probe', host, result, message: host + ':' + port + ' → ' + STATUS_LABELS[status] + ' (simulated)' });
    }));
    add({ phase: 'complete', message: 'Demo complete. 6 candidates · 4 responsive hosts · 36 simulated port results. No network traffic was sent.' });
    return events;
}
export function summarize(results: Pick<ProbeResult, 'status'>[]): Record<Status, number> {
    return results.reduce((sum, result) => { sum[result.status]++; return sum; }, { open: 0, closed: 0, 'no-response': 0, unknown: 0 });
}
export function filterResults(results: ProbeResult[], host = 'all', status = 'all', sort: 'host' | 'port' = 'host'): ProbeResult[] {
    return results.filter(r => (host === 'all' || r.host === host) && (status === 'all' || r.status === status)).toSorted((a, b) => sort === 'port' ? a.port - b.port || a.host.localeCompare(b.host, undefined, { numeric: true }) : a.host.localeCompare(b.host, undefined, { numeric: true }) || a.port - b.port);
}
