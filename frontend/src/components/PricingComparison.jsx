import { FiCheck, FiX, FiStar, FiClock } from 'react-icons/fi';

export default function PricingComparison() {
  const features = [
    {
      name: 'Monthly Scans',
      free: '3 scans (lifetime)',
      starter: '50 scans',
      professional: '200 scans'
    },
    {
      name: 'LLM Visibility Analysis',
      free: true,
      starter: true,
      professional: true
    },
    {
      name: 'SEO Recommendations',
      free: true,
      starter: true,
      professional: true
    },
    {
      name: 'Custom AI Prompts',
      free: false,
      starter: '10 prompts',
      professional: '10 prompts'
    },
    {
      name: 'Multi-LLM Analysis',
      free: false,
      starter: true,
      professional: true
    },
    {
      name: 'Competitor Comparison',
      free: false,
      starter: true,
      professional: true
    },
    {
      name: 'PDF Export',
      free: false,
      starter: true,
      professional: true
    },
    {
      name: 'Google Search Console',
      free: false,
      starter: false,
      professional: true
    },
    {
      name: 'Google Analytics',
      free: false,
      starter: false,
      professional: true
    },
    {
      name: 'Scan History',
      free: 'Limited',
      starter: 'Unlimited',
      professional: 'Unlimited'
    },
    {
      name: 'Priority Support',
      free: false,
      starter: false,
      professional: true
    }
  ];

  return (
    <section className="pricing-section section" id="pricing">
      <div className="container">
        <div className="section-header">
          <h2>Choose Your Plan</h2>
          <p>Start free, upgrade when you need more</p>
        </div>

        <div className="pricing-grid">
          {/* Free Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Free</h3>
              <div className="pricing-price">
                <span className="price-amount">$0</span>
                <span className="price-period">/month</span>
              </div>
              <p className="pricing-description">Perfect for trying out OptiSenseAI</p>
            </div>
            <ul className="pricing-features">
              {features.map((feature, index) => (
                <li key={index} className="pricing-feature">
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? (
                      <>
                        <FiCheck className="feature-icon check" />
                        <span>{feature.name}</span>
                      </>
                    ) : (
                      <>
                        <FiX className="feature-icon cross" />
                        <span className="feature-disabled">{feature.name}</span>
                      </>
                    )
                  ) : (
                    <>
                      <FiCheck className="feature-icon check" />
                      <span>{feature.name}: <strong>{feature.free}</strong></span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button className="btn btn-secondary btn-block" disabled>
              Current Plan
            </button>
          </div>

          {/* Starter Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Starter</h3>
              <div className="pricing-price">
                <span className="price-amount">$19</span>
                <span className="price-period">/month</span>
              </div>
              <p className="pricing-description">For growing businesses</p>
            </div>
            <ul className="pricing-features">
              {features.map((feature, index) => (
                <li key={index} className="pricing-feature">
                  {typeof feature.starter === 'boolean' ? (
                    feature.starter ? (
                      <>
                        <FiCheck className="feature-icon check" />
                        <span>{feature.name}</span>
                      </>
                    ) : (
                      <>
                        <FiX className="feature-icon cross" />
                        <span className="feature-disabled">{feature.name}</span>
                      </>
                    )
                  ) : (
                    <>
                      <FiCheck className="feature-icon check" />
                      <span>{feature.name}: <strong>{feature.starter}</strong></span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="coming-soon-notice">
              <FiClock className="coming-soon-icon" />
              <div>
                <strong>Subscription Coming Soon!</strong>
                <p>We're working on bringing you premium features. Stay tuned for updates.</p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-block"
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <FiStar /> Coming Soon
            </button>
          </div>

          {/* Professional Plan */}
          <div className="pricing-card pricing-card-premium">
            <div className="pricing-badge">Popular</div>
            <div className="pricing-header">
              <h3>Professional</h3>
              <div className="pricing-price">
                <span className="price-amount">$49</span>
                <span className="price-period">/month</span>
              </div>
              <p className="pricing-description">For professionals and agencies</p>
            </div>
            <ul className="pricing-features">
              {features.map((feature, index) => (
                <li key={index} className="pricing-feature">
                  {typeof feature.professional === 'boolean' ? (
                    feature.professional ? (
                      <>
                        <FiCheck className="feature-icon check" />
                        <span>{feature.name}</span>
                      </>
                    ) : (
                      <>
                        <FiX className="feature-icon cross" />
                        <span className="feature-disabled">{feature.name}</span>
                      </>
                    )
                  ) : (
                    <>
                      <FiCheck className="feature-icon check" />
                      <span>{feature.name}: <strong>{feature.professional}</strong></span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="coming-soon-notice">
              <FiClock className="coming-soon-icon" />
              <div>
                <strong>Subscription Coming Soon!</strong>
                <p>We're working on bringing you premium features. Stay tuned for updates.</p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-block"
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              <FiStar /> Coming Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

