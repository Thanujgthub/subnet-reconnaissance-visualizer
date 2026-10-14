'use client';
import { useState } from 'react';
import { ArrowRight, Check, Copy, Calculator, Info } from 'lucide-react';
import { calculateSubnet, representativeAddresses } from '@/lib/subnet';
const examples = ['192.168.1.0/24', '192.168.1.0/29', '10.0.0.0/31', '127.0.0.1/32', '0.0.0.0/0'];
export default function SubnetExplorer() {
    const [input, setInput] = useState(examples[0]);
    const [result, setResult] = useState(() => calculateSubnet(examples[0]));
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const calculate = (value = input) => { try {
        setResult(calculateSubnet(value));
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } };
    const update = (value: string) => { setInput(value); calculate(value); setCopied(false); };
    const metrics = [['Network address', result.network], ['Subnet mask', result.mask], ['Total addresses', result.total.toLocaleString('en-US')], ['Usable endpoints', result.usable.toLocaleString('en-US')], ['First usable', result.firstHost], ['Last usable', result.lastHost], ['Broadcast address', result.broadcast ?? 'Not applicable'], ['Network / host bits', result.prefix + ' / ' + result.hostBits]];
    return <div className="explorer lab-content" id="subnet-panel" role="tabpanel" aria-labelledby="subnet-tab">
  <div className="lab-intro"><div><span className="eyebrow">01 / CALCULATE & UNDERSTAND</span><h3>A subnet, unpacked.</h3><p>Turn an IPv4 address and prefix into a map of its address space.</p></div><Calculator size={30} strokeWidth={1}/></div>
  <form onSubmit={e => { e.preventDefault(); calculate(); }} className="cidr-form"><label htmlFor="cidr">IPv4 address / CIDR prefix</label><div className="input-action"><input id="cidr" value={input} onChange={e => update(e.target.value)} placeholder="192.168.1.0/24" spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'cidr-error' : 'cidr-help'}/><button className="button primary" type="submit">Calculate <ArrowRight size={16}/></button></div><p id="cidr-help" className="input-help">Any valid IPv4 subnet, /0 through /32. Calculations update as you type.</p>{error && <p role="alert" className="error-message" id="cidr-error">{error} The last valid calculation stays below.</p>}</form>
  <div className="examples"><span>TRY</span>{examples.map(example => <button key={example} onClick={() => update(example)} className={result.normalized === example && !error ? 'active' : ''}>{example}</button>)}</div>
  <div className="result-heading"><span className="mono">{result.normalized}</span><button className="text-button" onClick={async () => { try {
        await navigator.clipboard.writeText(result.normalized);
        setCopied(true);
    }
    catch {
        setError('Clipboard is unavailable. Select and copy the normalized CIDR shown below.');
    } }}>{copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? 'Copied' : 'Copy CIDR'}</button></div>
  {result.inputAddress !== result.network && <p className="input-help">The address belongs to <strong>{result.normalized}</strong>. Network calculation clears its host bits; the local scanner requires the exact network CIDR.</p>}
  <div className="metrics-grid" aria-live="polite">{metrics.map(([label, value]) => <div key={label} className="metric"><span>{label}</span><strong>{value}</strong></div>)}</div>
  <div className="bit-panel"><div className="viz-heading"><span>THE 32-BIT ADDRESS</span><span><i className="legend-dot network"/> {result.prefix} network <i className="legend-dot host"/> {result.hostBits} host</span></div><div className="bits" aria-label={result.prefix + ' network bits and ' + result.hostBits + ' host bits'}>{result.bits.split('').map((bit, i) => <span key={i} className={(i < result.prefix ? 'network-bit' : 'host-bit') + (i % 8 === 7 ? ' octet-end' : '')} title={'Bit ' + (i + 1) + ': ' + (i < result.prefix ? 'network' : 'host')}>{bit}</span>)}</div><div className="bit-caption"><span>NETWORK PORTION</span><span>HOST PORTION</span></div></div>
  <div className="address-range"><div className="viz-heading"><span>ADDRESS SPACE</span><span>{result.total > 8 ? 'Representative addresses' : 'Every address'}</span></div><div className="address-track">{representativeAddresses(result).map((address, i) => <div key={i} className={'address-cell ' + (address === result.network && result.prefix < 31 ? 'reserved' : address === result.broadcast ? 'broadcast' : 'usable')}><span className="address-dot"/><strong>{address}</strong><small>{address === '…' ? 'More addresses' : result.prefix === 32 ? 'Single host' : result.prefix === 31 ? 'P2P endpoint' : address === result.network ? 'Network' : address === result.broadcast ? 'Broadcast' : 'Usable host'}</small></div>)}</div></div>
  <div className="calculation-explainer"><div><span className="step-number">1</span><p><strong>Split the address.</strong> /{result.prefix} reserves {result.prefix} network bits, leaving 32 − {result.prefix} = {result.hostBits} host bits.</p></div><div><span className="step-number">2</span><p><strong>Count combinations.</strong> 2<sup>{result.hostBits}</sup> = {result.total.toLocaleString('en-US')} total addresses. Round the input down to its {result.total.toLocaleString('en-US')}-address boundary to find {result.network}.</p></div><div><span className="step-number">3</span><p><strong>{result.prefix >= 31 ? 'Apply the special case.' : 'Reserve the endpoints.'}</strong> {result.prefix >= 31 ? result.note : result.total.toLocaleString('en-US') + ' − 2 = ' + result.usable.toLocaleString('en-US') + ' conventional usable addresses. The final address is ' + result.broadcast + '.'}</p></div></div>
  <p className="notice"><Info size={16}/>{result.prefix < 31 ? 'This is address arithmetic, not a scan. Routability, assignment rules, and authorization depend on the network.' : result.note}</p>
 </div>;
}
