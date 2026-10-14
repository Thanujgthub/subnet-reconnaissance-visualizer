'use client';
import { useRef, useState } from 'react';
import { Calculator, Activity, ArrowUpRight } from 'lucide-react';
import SubnetExplorer from './SubnetExplorer';
import PortLab from './PortLab';
export default function Laboratory() {
    const [tab, setTab] = useState(0);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    return <section id="lab" className="section lab-section"><div className="section-heading"><div><span className="eyebrow">03 / INTERACTIVE LABORATORY</span><h2>Less theory.<br /><span className="muted">More understanding.</span></h2></div><p>Change the input. Watch the process.<br />Build an intuition for what the numbers mean.</p></div><div className="lab-shell"><div className="lab-tabbar" role="tablist" aria-label="Interactive laboratory" onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - tab;
        setTab(next);
        buttons.current[next]?.focus();
    } }}>{['Subnet Explorer', 'Port Profiling Lab'].map((label, i) => <button ref={el => { buttons.current[i] = el; }} key={label} id={i === 0 ? 'subnet-tab' : 'port-tab'} role="tab" aria-selected={tab === i} aria-controls={i === 0 ? 'subnet-panel' : 'port-panel'} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)}>{i === 0 ? <Calculator size={17}/> : <Activity size={17}/>}<span>{label}</span><small>0{i + 1}</small></button>)}<span className="lab-badge"><span className="live-dot"/> BROWSER-LOCAL</span></div>{tab === 0 ? <SubnetExplorer /> : <PortLab />}</div><div className="lab-footnote"><span>Real subnet calculations. Explicitly simulated network observations.</span><a href="#local-tool">Need actual TCP tests? Run the local CLI <ArrowUpRight size={14}/></a></div></section>;
}
