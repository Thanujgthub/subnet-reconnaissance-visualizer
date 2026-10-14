/** IPv4 arithmetic uses safe Number integers, never signed bitwise operators. */
export type Subnet = {
    inputAddress: string;
    prefix: number;
    normalized: string;
    network: string;
    mask: string;
    broadcast: string | null;
    lastAddress: string;
    firstHost: string;
    lastHost: string;
    total: number;
    usable: number;
    hostBits: number;
    networkNumber: number;
    lastNumber: number;
    note: string;
    bits: string;
};
export function ipv4Number(address: string): number {
    if (!/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(address))
        throw new Error('Enter four decimal IPv4 octets, with no leading zeroes.');
    const octets = address.split('.').map(Number);
    if (octets.some(n => n > 255))
        throw new Error('Each IPv4 octet must be between 0 and 255.');
    return octets.reduce((n, octet) => n * 256 + octet, 0);
}
export function numberIPv4(value: number): string {
    if (!Number.isInteger(value) || value < 0 || value > 4294967295)
        throw new Error('IPv4 integer is out of range.');
    return [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.');
}
export function calculateSubnet(raw: string): Subnet {
    const input = raw.trim();
    const match = /^([^/]+)\/(0|[1-9]\d?)$/.exec(input);
    if (!match)
        throw new Error('Use IPv4/CIDR notation, for example 192.168.1.0/24.');
    const address = ipv4Number(match[1]);
    const prefix = Number(match[2]);
    if (prefix > 32)
        throw new Error('The CIDR prefix must be between /0 and /32.');
    const hostBits = 32 - prefix;
    const total = 2 ** hostBits;
    const networkNumber = Math.floor(address / total) * total;
    const lastNumber = networkNumber + total - 1;
    const special = prefix >= 31;
    const usable = special ? total : total - 2;
    const network = numberIPv4(networkNumber);
    return {
        inputAddress: match[1], prefix, normalized: network + '/' + prefix, network,
        mask: numberIPv4(4294967296 - total), broadcast: special ? null : numberIPv4(lastNumber),
        lastAddress: numberIPv4(lastNumber), firstHost: numberIPv4(networkNumber + (special ? 0 : 1)),
        lastHost: numberIPv4(lastNumber - (special ? 0 : 1)), total, usable, hostBits,
        networkNumber, lastNumber, bits: address.toString(2).padStart(32, '0'),
        note: prefix === 31 ? 'RFC 3021 point-to-point convention: both addresses are endpoints; there is no directed broadcast.' : prefix === 32 ? 'A single-host route: one address, with no separate network or broadcast reservation.' : 'Conventional multi-access subnet: reserve one network address and one directed broadcast address.',
    };
}
export function candidateAddresses(subnet: Subnet, limit = 14): string[] {
    if (subnet.usable > limit)
        throw new Error('The scan limit is ' + limit + ' candidate addresses. Choose /28 or smaller.');
    const first = ipv4Number(subnet.firstHost);
    return Array.from({ length: subnet.usable }, (_, i) => numberIPv4(first + i));
}
export function representativeAddresses(subnet: Subnet): string[] {
    if (subnet.total <= 8)
        return Array.from({ length: subnet.total }, (_, i) => numberIPv4(subnet.networkNumber + i));
    return [subnet.network, subnet.firstHost, numberIPv4(ipv4Number(subnet.firstHost) + 1), '…', subnet.lastHost, subnet.lastAddress];
}
