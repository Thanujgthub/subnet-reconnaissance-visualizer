'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ArrowUpDown, Info, X, Terminal, CheckCircle2 } from 'lucide-react';
import { createDemoEvents, filterResults, summarize, LAB_CIDR, HOST_NAMES, STATUS_LABELS, SERVICES, type ProbeResult, type Status } from '@/lib/demo';
const EVENTS = createDemoEvents();
const HOSTS = Object.keys(HOST_NAMES);
export default function PortLab() {
    const [cidr, setCidr] = useState(LAB_CIDR);
    const [cursor, setCursor] = useState(0);
    const [started, setStarted] = useState(false);
    const [error, setError] = useState('');
    const [hostFilter, setHostFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sort, setSort] = useState<'host' | 'port'>('host');
    const [speed, setSpeed] = useState(140);
    const [inspected, setInspected] = useState<ProbeResult | null>(null);
    const detail = useRef<HTMLDivElement>(null);
    const running = started && cursor < EVENTS.length;
    useEffect(() => { if (!running)
        return; const timer = setInterval(() => setCursor(n => Math.min(n + 1, EVENTS.length)), speed); return () => clearInterval(timer); }, [running, speed]);
    const elapsed = EVENTS.slice(0, cursor);
    const results = elapsed.flatMap(e => e.result ? [e.result] : []);
    const visible = filterResults(results, hostFilter, statusFilter, sort);
    const counts = summarize(results);
    const progress = Math.round(cursor / EVENTS.length * 100);
    const reset = () => { setStarted(false); setCursor(0); setCidr(LAB_CIDR); setHostFilter('all'); setStatusFilter('all'); setSort('host'); setSpeed(140); setInspected(null); setError(''); };
    const start = () => { try {
        createDemoEvents(cidr);
        setError('');
        setCursor(1);
        setStarted(true);
    }
    catch (e) {
        setError((e as Error).message);
    } };
    const inspect = (result: ProbeResult) => { setInspected(result); requestAnimationFrame(() => detail.current?.focus()); };
    return <div className="lab-content" id="port-panel" role="tabpanel" aria-labelledby="port-tab">
  <div className="simulation-banner"><span className="live-dot"/> SIMULATION — No network traffic is being sent</div>
  <div className="lab-intro"><div><span className="eyebrow">02 / OBSERVE & INTERPRET</span><h3>Follow every connection.</h3><p>Six candidate addresses. Six TCP ports. One deterministic walkthrough.</p></div><Terminal size={30} strokeWidth={1}/></div>
  <div className="demo-controls"><div className="demo-cidr"><label htmlFor="demo-cidr">Illustrative lab subnet</label><input id="demo-cidr" value={cidr} onChange={e => setCidr(e.target.value)} disabled={started} aria-invalid={!!error} aria-describedby="demo-subnet-help" spellCheck={false}/></div><div><label htmlFor="demo-speed">Playback</label><select id="demo-speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={140}>Guided</option><option value={45}>Quick</option><option value={450}>Step slowly</option></select></div><button className="button primary" onClick={start} disabled={started}><Play size={15}/>{running ? 'Running…' : started ? 'Demo complete' : 'Start Demo'}</button><button className="button secondary" onClick={reset}><RotateCcw size={15}/>Reset</button></div>
  <p className="input-help" id="demo-subnet-help">The supplied lesson uses only {LAB_CIDR}. Editing it demonstrates input validation; other datasets are not included.</p>{error && <p role="alert" className="error-message">{error}</p>}
  <div className="progress-label"><span>{!started ? 'READY TO DISCOVER' : running ? (EVENTS[cursor - 1]?.phase.toUpperCase() ?? 'PREPARING') : 'WALKTHROUGH COMPLETE'}</span><span>{progress}% · {results.length}/36 probes</span></div><div className="progress-track" role="progressbar" aria-label="Demo progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: progress + '%' }}/></div>
  <div className="demo-grid"><div className="sample-network"><div className="viz-heading"><span>CAMPUS LAB /29</span><span>Illustrative topology</span></div><div className="gateway-node"><span className="network-symbol">◇</span><div><strong>Lab subnet</strong><small>192.168.1.0/29</small></div></div><div className="host-network">{HOSTS.map(host => { const discovery = elapsed.find(e => e.phase === 'discovery' && e.host === host); const candidate = elapsed.some(e => e.phase === 'candidate' && e.host === host); return <button key={host} onClick={() => setHostFilter(hostFilter === host ? 'all' : host)} aria-pressed={hostFilter === host} className={'host-node ' + (discovery?.responsive ? 'responsive' : discovery ? 'unconfirmed' : candidate ? 'candidate' : 'pending')}><span className="node-dot"/><strong>{host.split('.').at(-1)?.padStart(2, '0')}</strong><small>{HOST_NAMES[host]}</small><em>{discovery ? (discovery.responsive ? 'Responded' : 'Unconfirmed') : candidate ? 'Candidate' : 'Waiting'}</em></button>; })}</div><p className="input-help">Select a host to filter its ports. No discovery response? Profiling still considers that candidate.</p></div>
   <div className="event-panel"><div className="viz-heading"><span>EVENT TIMELINE</span><span className="mono">SIMULATED</span></div><div className="event-list" role="log" aria-label="Simulated event timeline" aria-live="off">{elapsed.length === 0 ? <div className="empty-timeline"><Terminal size={25}/><span>The first packet begins with you.</span><small>Start the demo to follow the algorithm.</small></div> : elapsed.slice(-6).map(event => <div className="event" key={event.id}><span className="event-index">{String(event.id + 1).padStart(2, '0')}</span><span>{event.message}</span></div>)}</div></div>
  </div>
  <div className="summary-row">{(Object.keys(counts) as Status[]).map(status => <div className={'summary-stat ' + status} key={status}><span><i className={'legend-dot ' + status}/>{STATUS_LABELS[status]}</span><strong>{counts[status]}</strong><div className="mini-bar"><i style={{ width: results.length ? counts[status] / results.length * 100 + '%' : '0%' }}/></div></div>)}</div>
  <div className="results-toolbar"><div><h4>Port observations <span className="muted">/ simulated</span></h4><small>{visible.length} of {results.length} results shown</small></div><div className="filters"><label>Host<select value={hostFilter} onChange={e => setHostFilter(e.target.value)} aria-label="Filter by host"><option value="all">All hosts</option>{HOSTS.map(host => <option key={host}>{host}</option>)}</select></label><label>Status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="all">All states</option>{(Object.keys(counts) as Status[]).map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label><button className="icon-button sort-button" onClick={() => setSort(sort === 'host' ? 'port' : 'host')} aria-label={'Sort results by ' + (sort === 'host' ? 'port' : 'host')} title={'Sorted by ' + sort}><ArrowUpDown size={16}/><span>{sort === 'host' ? 'Host' : 'Port'}</span></button></div></div>
  <div className="results-table-wrap" tabIndex={0} role="region" aria-label="Scrollable simulated port results"><table className="results-table"><caption className="sr-only">Simulated TCP outcomes. Service names are conventional hints, not confirmed applications.</caption><thead><tr><th>Host address</th><th>TCP port</th><th>Classification</th><th>Common service</th><th>Demo time</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{visible.map(result => <tr key={result.host + ':' + result.port}><td className="mono">{result.host}</td><td className="mono">{result.port}</td><td><span className={'status ' + result.status}>{STATUS_LABELS[result.status]}</span></td><td>{SERVICES[result.port]}</td><td className="mono muted">{result.elapsedMs} ms</td><td><button className="text-button" onClick={() => inspect(result)} aria-label={'Inspect ' + result.host + ' port ' + result.port}>Inspect <Info size={12}/></button></td></tr>)}{visible.length === 0 && <tr><td colSpan={6} className="empty-results">{results.length ? 'No observations match these filters.' : 'Observations appear here as the demo progresses.'}</td></tr>}</tbody></table></div><p className="table-scroll-help">Scroll horizontally for service hints, timing, and result details.</p>
  {inspected && <div className="inspection-card" ref={detail} tabIndex={-1}><button className="icon-button" onClick={() => setInspected(null)} aria-label="Close result details"><X size={16}/></button><span className="eyebrow">SIMULATED RESULT / EXPLAINED</span><h4>{inspected.host}:{inspected.port} <span className={'status ' + inspected.status}>{STATUS_LABELS[inspected.status]}</span></h4><p>{inspected.reason}</p><small>{inspected.elapsedMs} ms is an illustrative measurement, not a real network latency.</small></div>}
  {started && !running && <p className="success-message" role="status"><CheckCircle2 size={17}/>Complete: 6 candidates, 4 responsive hosts, {counts.open} accepted connections. All observations are simulated.</p>}
  <p className="notice"><Info size={16}/>A port number suggests a service convention. An accepted TCP connection proves neither the application identity nor that the service is secure.</p>
 </div>;
}
