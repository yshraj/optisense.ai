import { FiSearch, FiCpu, FiZap, FiAward, FiTrendingUp, FiTarget, FiLock, FiCode, FiImage } from 'react-icons/fi';

const features = [
  {
    icon: <FiSearch />,
    title: 'Complete SEO Audit',
    description: 'Extract meta tags, check canonical URLs, analyze heading structure, and get detailed content recommendations.',
    color: '#6366F1'
  },
  {
    icon: <FiCpu />,
    title: 'AI Citation Tracking',
    description: 'See if ChatGPT, Claude, and Gemini mention your brand. Get visibility scores across multiple targeted prompts.',
    color: '#8B5CF6'
  },
  {
    icon: <FiCode />,
    title: 'Structured Data Analysis',
    description: 'Detect Schema.org markup, JSON-LD scripts, and validate your structured data for better search visibility.',
    color: '#EC4899'
  },
  {
    icon: <FiImage />,
    title: 'Image & Link Analysis',
    description: 'Check alt text coverage, analyze internal/external links, and identify accessibility issues automatically.',
    color: '#10B981'
  },
  {
    icon: <FiLock />,
    title: 'Security & Technical',
    description: 'Verify HTTPS, security headers, robots.txt, sitemap.xml, and other technical SEO requirements.',
    color: '#F59E0B'
  },
  {
    icon: <FiZap />,
    title: 'Performance & Social',
    description: 'Analyze load times, Open Graph tags, Twitter Cards, and ensure your site is optimized for sharing.',
    color: '#EF4444'
  }
];

export default function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <div className="section-header text-center">
          <h2>Everything You Need to Dominate AI Search</h2>
          <p>Comprehensive analysis tools designed for the future of search</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card card">
              <div className="feature-icon" style={{ color: feature.color }}>
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

