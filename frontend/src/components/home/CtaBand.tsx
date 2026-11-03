import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { requestAssistant } from '../assistant/assistantEvents';

export function CtaBand() {
  return (
    <section className="cg-cta-band" aria-labelledby="home-cta-title">
      <div className="cg-container cg-cta-band__inner">
        <div>
          <p className="cg-eyebrow cg-eyebrow--light">Start with a conversation</p>
          <h2 id="home-cta-title">Ready to get help from your local cooperative?</h2>
          <p>
            Describe the job in a few words, review the suggested category and confirm the request yourself. No
            auto-booking, and no payment collected in this prototype.
          </p>
        </div>
        <div className="cg-cta-band__actions">
          <Link className="cg-btn cg-btn--white cg-btn--lg" to="/book">
            Start Booking
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <button type="button" className="cg-btn cg-btn--outline-light cg-btn--lg" onClick={requestAssistant}>
            <MessageCircle size={17} aria-hidden="true" />
            Ask the assistant
          </button>
        </div>
      </div>
    </section>
  );
}
