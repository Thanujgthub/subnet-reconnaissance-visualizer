'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <main className="not-found"><span className="eyebrow">CONNECTION INTERRUPTED</span><h1>Let’s try that again.</h1><p>The interface encountered an unexpected error.</p><button className="button primary" onClick={reset}>Retry</button><Link className="text-link" href="/">Return to overview</Link></main>; }
