import { FiX, FiStar, FiCheck, FiArrowRight } from 'react-icons/fi';

export default function PremiumUpgradeModal({ isOpen, onClose, feature = "AI-Powered Recommendations" }) {
  if (!isOpen) return null;

  const scrollToPricing = () => {
    onClose();
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="premium-upgrade-modal-overlay" onClick={onClose}>
      <div className="premium-upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="premium-upgrade-close" onClick={onClose}>
          <FiX />
        </button>

        <div className="premium-upgrade-icon-wrapper">
          <div className="premium-upgrade-icon">
            <FiStar />
          </div>
        </div>

        <div className="premium-upgrade-content">
          <h3>Upgrade to Premium</h3>
          <p>
            <strong>{feature}</strong> is a Premium feature. Upgrade now to unlock detailed, 
            actionable insights for every SEO issue.
          </p>

          <div className="premium-upgrade-features">
            <ul className="premium-upgrade-features-list">
              <li>
                <FiCheck size={20} />
                <span>AI-powered recommendations for every issue</span>
              </li>
              <li>
                <FiCheck size={20} />
                <span>Unlimited scans and detailed reports</span>
              </li>
              <li>
                <FiCheck size={20} />
                <span>PDF export and competitor comparison</span>
              </li>
              <li>
                <FiCheck size={20} />
                <span>Priority support and early access to features</span>
              </li>
            </ul>
          </div>

          <div className="premium-upgrade-actions">
            <button className="btn-upgrade-premium" onClick={scrollToPricing}>
              View Pricing <FiArrowRight />
            </button>
            <button className="btn-upgrade-secondary" onClick={onClose}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

