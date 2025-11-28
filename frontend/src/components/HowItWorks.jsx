import { FiGlobe, FiZap, FiBarChart2, FiCheckCircle } from 'react-icons/fi';

const steps = [
  {
    number: '01',
    icon: <FiGlobe />,
    title: 'Enter Your Website URL',
    description: 'Simply paste your website URL into the search bar. No signup required for your first scan - get instant results!',
    color: '#6366F1'
  },
  {
    number: '02',
    icon: <FiZap />,
    title: 'AI-Powered Analysis',
    description: 'Our advanced system analyzes your SEO health, checks AI visibility across ChatGPT, Claude, and Gemini, and scans for technical issues.',
    color: '#8B5CF6'
  },
  {
    number: '03',
    icon: <FiBarChart2 />,
    title: 'Get Comprehensive Insights',
    description: 'Receive detailed reports on your SEO score, AI citation visibility, structured data, security headers, and actionable recommendations.',
    color: '#EC4899'
  },
  {
    number: '04',
    icon: <FiCheckCircle />,
    title: 'Take Action & Improve',
    description: 'Use our actionable insights to optimize your website, improve AI search visibility, and track your progress over time.',
    color: '#10B981'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-it-works-section">
      <div className="container">
        <div className="section-header text-center">
          <h2>How It Works</h2>
          <p>Get comprehensive website analysis in just 30 seconds</p>
        </div>

        <div className="how-it-works-steps">
          {steps.map((step, index) => (
            <div key={index} className="how-it-works-step">
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <div className="step-icon">
                  {step.icon}
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="how-it-works-cta">
          <p>Ready to discover your website's AI search visibility?</p>
          <button 
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn btn-primary btn-large"
          >
            Start Your Free Analysis
          </button>
        </div>
      </div>
    </section>
  );
}

