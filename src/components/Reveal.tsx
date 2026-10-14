'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
export default function Reveal({ children, className = '' }: {
    children: ReactNode;
    className?: string;
}) {
    const element = useRef<HTMLDivElement>(null);
    useEffect(() => { if (!element.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
    } }, { threshold: .08 }); observer.observe(element.current); return () => observer.disconnect(); }, []);
    return <div ref={element} className={className}>{children}</div>;
}
