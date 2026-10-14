import Link from 'next/link';
export default function NotFound() { return <main className="not-found"><span className="eyebrow">404 / NO ROUTE TO HOST</span><h1>This address<br />is off the map.</h1><p>The page you requested is unavailable. Return to the network and keep exploring.</p><Link className="button primary" href="/">Return to SubnetScope →</Link></main>; }
