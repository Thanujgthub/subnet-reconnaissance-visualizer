import { Download, FileText, Presentation } from 'lucide-react';

export default function ProjectDownloads() {
    return <section className="section" id="presentation" aria-labelledby="presentation-title">
        <div className="section-heading">
            <div>
                <span className="eyebrow">PRESENTATION MATERIALS</span>
                <h2 id="presentation-title">Explain the project.<br /><span className="muted">One clear step at a time.</span></h2>
            </div>
            <p>12 slides with simple diagrams<br />and presenter notes for your demonstration.</p>
        </div>
        <div className="hero-actions">
            <a className="button primary" href="/SubnetScope-Project.pptx" download><Presentation size={16} /> Download PowerPoint <Download size={15} /></a>
            <a className="button secondary" href="/SubnetScope-Project.pdf" download><FileText size={16} /> Download PDF</a>
            <a className="text-link" href="/SubnetScope-Speaker-Notes.txt" download>Presenter notes <Download size={15} /></a>
        </div>
    </section>;
}
