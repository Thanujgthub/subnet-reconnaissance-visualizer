'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
const links = [['overview', 'Overview'], ['how-it-works', 'How it works'], ['lab', 'Interactive lab'], ['architecture', 'Architecture'], ['about', 'About project']];
export function Logo() { return <svg width="29" height="29" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 9 16 3 26 9V23L16 29 6 23Z" stroke="currentColor" strokeWidth="1.4"/><path d="m6 9 10 6 10-6M16 15v14M6 23l10-8 10 8" stroke="currentColor" strokeWidth="1.2"/><circle cx="16" cy="15" r="3" fill="currentColor"/><circle cx="6" cy="9" r="2" fill="currentColor"/><circle cx="26" cy="23" r="2" fill="currentColor"/></svg>; }
export default function Navigation() {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState('overview');
    useEffect(() => { const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting)
        setActive(entry.target.id); }); }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 }); links.forEach(([id]) => { const element = document.getElementById(id); if (element)
        observer.observe(element); }); return () => observer.disconnect(); }, []);
    useEffect(() => { if (!open)
        return; const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        setOpen(false);
        document.getElementById('menu-toggle')?.focus();
    } }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, [open]);
    return <header className="site-header"><div className="nav-inner"><a className="brand" href="#overview" aria-label="SubnetScope home"><Logo /><span>Subnet<span>Scope</span><small>NETWORK INTELLIGENCE, EXPLAINED.</small></span></a><button className="icon-button mobile-toggle" id="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation">{open ? <X size={21}/> : <Menu size={21}/>}</button><nav id="main-navigation" className={open ? 'is-open' : ''} aria-label="Main navigation">{links.map(([id, label]) => <a key={id} href={'#' + id} className={active === id ? 'active' : ''} aria-current={active === id ? 'location' : undefined} onClick={() => { setActive(id); setOpen(false); }}>{label}</a>)}</nav><a className="nav-cta" href="#lab">Enter the lab <ArrowUpRight size={15}/></a></div></header>;
}
