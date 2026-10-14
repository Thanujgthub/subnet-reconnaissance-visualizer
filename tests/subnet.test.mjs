import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubnet, ipv4Number, numberIPv4, candidateAddresses, representativeAddresses } from '../src/lib/subnet.ts';
test('/24 arithmetic and unsigned high addresses', () => {
    const n = calculateSubnet('192.168.1.123/24');
    assert.equal(n.network, '192.168.1.0');
    assert.equal(n.mask, '255.255.255.0');
    assert.equal(n.total, 256);
    assert.equal(n.usable, 254);
    assert.equal(n.firstHost, '192.168.1.1');
    assert.equal(n.lastHost, '192.168.1.254');
    assert.equal(n.broadcast, '192.168.1.255');
    assert.equal(n.hostBits, 8);
    assert.equal(calculateSubnet('255.255.255.255/24').network, '255.255.255.0');
});
test('/29 aligns to an eight-address boundary', () => { const n = calculateSubnet('192.168.1.14/29'); assert.equal(n.network, '192.168.1.8'); assert.equal(n.broadcast, '192.168.1.15'); assert.equal(n.usable, 6); assert.equal(n.mask, '255.255.255.248'); assert.deepEqual(candidateAddresses(n), ['192.168.1.9', '192.168.1.10', '192.168.1.11', '192.168.1.12', '192.168.1.13', '192.168.1.14']); });
test('/31 point-to-point uses both endpoints without broadcast', () => { const n = calculateSubnet('10.0.0.3/31'); assert.equal(n.network, '10.0.0.2'); assert.equal(n.firstHost, '10.0.0.2'); assert.equal(n.lastHost, '10.0.0.3'); assert.equal(n.usable, 2); assert.equal(n.total, 2); assert.equal(n.broadcast, null); assert.match(n.note, /point-to-point/); });
test('/32 represents a single host', () => { const n = calculateSubnet('127.0.0.1/32'); assert.equal(n.total, 1); assert.equal(n.usable, 1); assert.equal(n.network, '127.0.0.1'); assert.equal(n.firstHost, n.lastHost); assert.equal(n.mask, '255.255.255.255'); assert.equal(n.broadcast, null); });
test('/0 and /1 do not overflow signed 32-bit math', () => { const n = calculateSubnet('255.255.255.255/0'); assert.equal(n.total, 4294967296); assert.equal(n.usable, 4294967294); assert.equal(n.network, '0.0.0.0'); assert.equal(n.mask, '0.0.0.0'); assert.equal(n.broadcast, '255.255.255.255'); assert.equal(calculateSubnet('255.255.255.255/1').network, '128.0.0.0'); });
test('all prefixes align and preserve the input range', () => { for (let prefix = 0; prefix <= 32; prefix++) {
    for (const address of ['0.0.0.0', '1.2.3.4', '128.129.200.254', '255.255.255.255']) {
        const n = calculateSubnet(address + '/' + prefix);
        assert.equal(n.networkNumber % n.total, 0);
        assert.ok(ipv4Number(address) >= n.networkNumber);
        assert.ok(ipv4Number(address) <= n.lastNumber);
        assert.equal(n.lastNumber - n.networkNumber + 1, n.total);
        assert.equal(n.prefix + n.hostBits, 32);
    }
} });
test('malformed and ambiguous addresses are rejected', () => { for (const value of ['', '192.168.1.0', '192.168.1/24', '192.168.1.256/24', '192.168.-1.1/24', '192.168.01.0/24', '1.2.3.4/33', '1.2.3.4/-1', '1.2.3.4/2.4', '1.2.3.4/024', '1.2.3.4/24/1', '1.2.3.4/', '1e2.2.3.4/24', '0x7f.0.0.1/32', '1.2.3.4 /24', '::1/32'])
    assert.throws(() => calculateSubnet(value), undefined, value); });
test('IPv4 integer conversion is reversible', () => { for (const n of [0, 1, 2147483648, 3232235777, 4294967295])
    assert.equal(ipv4Number(numberIPv4(n)), n); for (const n of [-1, 4294967296, NaN, 1.5])
    assert.throws(() => numberIPv4(n)); });
test('representations stay small and candidate generation is bounded', () => { assert.ok(representativeAddresses(calculateSubnet('0.0.0.0/0')).length <= 8); assert.equal(representativeAddresses(calculateSubnet('192.168.1.0/29')).length, 8); assert.throws(() => candidateAddresses(calculateSubnet('10.0.0.0/24')), /limit/); });
