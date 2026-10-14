'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Box } from 'lucide-react';
const nodes = [
    { x: 320, y: 88, name: 'Gateway', ip: '.1', kind: 'gateway' },
    { x: 178, y: 188, name: 'Web server', ip: '.2', kind: 'web' },
    { x: 432, y: 195, name: 'Workstation', ip: '.3', kind: 'host' },
    { x: 106, y: 315, name: 'Silent device', ip: '.4', kind: 'silent' },
    { x: 321, y: 320, name: 'Lab server', ip: '.5', kind: 'host' },
    { x: 521, y: 322, name: 'No response', ip: '.6', kind: 'silent' },
];
export function TopologyMap({ activeHost, compact = false }: {
    activeHost?: string;
    compact?: boolean;
}) {
    return <svg className={'topology-svg ' + (compact ? 'compact' : '')} viewBox="0 0 640 410" role="img" aria-label="Illustrative /29 network: gateway connected to five candidate hosts. Two addresses have no discovery response.">
  <defs><pattern id={compact ? 'lab-grid' : 'hero-grid'} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#162a3c" strokeWidth=".7"/></pattern></defs>
  <rect width="640" height="410" fill={'url(#' + (compact ? 'lab-grid' : 'hero-grid') + ')'}/>
  <path d="M50 145 310 30 595 168 595 345 340 395 50 337Z" fill="#09202c" fillOpacity=".35" stroke="#24536a" strokeDasharray="5 8"/>
  {nodes.slice(1).map(n => <g key={n.ip}><path d={'M320 88 Q320 ' + n.y + ' ' + n.x + ' ' + n.y} fill="none" stroke={n.kind === 'silent' ? '#304454' : '#27778b'} strokeWidth="1.5" strokeDasharray={n.kind === 'silent' ? '4 7' : undefined}/><circle r="3" fill="#68e7e5" className="svg-packet"><animateMotion dur={3 + Number(n.ip.slice(1)) * .3 + 's'} repeatCount="indefinite" path={'M320 88 Q320 ' + n.y + ' ' + n.x + ' ' + n.y}/></circle></g>)}
  {nodes.map(n => <g key={n.ip} className={activeHost?.endsWith(n.ip) ? 'map-node selected' : 'map-node'}><ellipse cx={n.x} cy={n.y + 7} rx="24" ry="12" fill="#07121c" stroke={n.kind === 'silent' ? '#354652' : '#2e8090'}/><circle cx={n.x} cy={n.y} r="8" fill={n.kind === 'silent' ? '#617182' : '#69e6df'}/><circle cx={n.x} cy={n.y} r="18" fill="none" stroke={n.kind === 'silent' ? '#354652' : '#2e8090'}/><text x={n.x} y={n.y + 37} textAnchor="middle" fill="#dceaf0" fontSize="12">{n.name}</text><text x={n.x} y={n.y + 53} textAnchor="middle" fill="#718b9e" fontSize="10" fontFamily="monospace">192.168.1{n.ip}</text></g>)}
 </svg>;
}
export default function Topology() {
    const mount = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const [paused, setPaused] = useState(false);
    const [selected, setSelected] = useState(1);
    const pausedRef = useRef(false);
    const selectedRef = useRef(selected);
    useEffect(() => { selectedRef.current = selected; }, [selected]);
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => {
        if (!mount.current || window.matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)').matches)
            return;
        let disposed = false;
        let cleanup = () => { };
        import('@/lib/network-scene').then(({ createNetworkScene }) => {
            if (disposed || !mount.current)
                return;
            try {
                cleanup = createNetworkScene(mount.current, () => pausedRef.current, () => setReady(false), () => selectedRef.current);
                setReady(true);
            }
            catch {
                setReady(false);
            }
        }).catch(() => { });
        return () => { disposed = true; cleanup(); };
    }, []);
    const host = nodes[selected];
    return <div className={'topology-panel ' + (paused ? 'motion-paused' : '')}>
  <div className="panel-toolbar"><span><span className="live-dot"/> NETWORK TOPOLOGY</span><span className="mono">192.168.1.0/29</span></div>
  <div className="scene-wrap"><div className={'scene-fallback ' + (ready ? 'is-hidden' : '')}><TopologyMap /></div><div ref={mount} className="three-mount" aria-hidden="true"/>
   <div className="scene-mode"><Box size={12}/>{ready ? '3D NETWORK MODEL' : 'NETWORK MODEL'} <span>ILLUSTRATIVE</span></div>
   <button className="icon-button pause-button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume network animation' : 'Pause network animation'}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>
  </div>
  <div className="host-selector" aria-label="Inspect an example host">{nodes.map((n, i) => <button key={n.ip} aria-pressed={selected === i} className={selected === i ? 'selected' : ''} onClick={() => setSelected(i)}><span className={n.kind === 'silent' ? 'node-dot silent' : 'node-dot'}/>{n.ip}</button>)}</div>
  <div className="topology-inspect" aria-live="polite"><div><span className="mono">192.168.1{host.ip}</span><strong>{host.name}</strong></div><span className={'status ' + (host.kind === 'silent' ? 'no-response' : 'open')}>{host.kind === 'silent' ? 'Liveness unconfirmed' : 'Example responsive host'}</span></div>
 </div>;
}
