import { useState } from 'react';
import axios from 'axios';
import { 
  FiCheckCircle, FiAlertTriangle, FiInfo, FiExternalLink, 
  FiLock, FiUnlock, FiFileText, FiMap, FiImage, FiLink,
  FiCode, FiLayers, FiShare2, FiStar, FiArrowRight, FiDownload,
  FiChevronDown, FiChevronUp, FiLoader
} from 'react-icons/fi';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import FeatureExplanation from './FeatureExplanation';

export default function ResultsDisplay({ data }) {
  if (!data) return null;

  const { seo, llmVisibility, integrations, isFreeUser = true, isPremium = false, scanId, warnings } = data;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('auth_token');
  
  const [expandedWarnings, setExpandedWarnings] = useState(new Set());
  const [warningRecommendations, setWarningRecommendations] = useState({});
  const [loadingRecommendations, setLoadingRecommendations] = useState({});
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = useState('');

  const handleExport = async (format) => {
    if (!scanId) {
      alert('Scan ID not available for export');
      return;
    }

    try {
      const url = `${API_URL}/api/export/${format}/${scanId}`;
      const config = token ? {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: format === 'pdf' ? 'blob' : 'text'
      } : {
        responseType: format === 'pdf' ? 'blob' : 'text'
      };

      const response = await fetch(url, {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setPremiumFeatureName('PDF Export');
          setShowPremiumModal(true);
          return;
        }
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `scan-${scanId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `scan-${scanId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    }
  };

  const toggleWarningDetail = async (index, warning) => {
    if (!token) {
      alert('Please sign in to view detailed recommendations');
      return;
    }

    if (!isPremium) {
      // Show premium upgrade modal for free users
      setPremiumFeatureName('AI-Powered Recommendations');
      setShowPremiumModal(true);
      return;
    }

    const newExpanded = new Set(expandedWarnings);
    
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
      setExpandedWarnings(newExpanded);
    } else {
      newExpanded.add(index);
      setExpandedWarnings(newExpanded);
      
      // Fetch recommendation if not already loaded
      if (!warningRecommendations[index]) {
        setLoadingRecommendations({ ...loadingRecommendations, [index]: true });
        
        try {
          const response = await axios.post(
            `${API_URL}/api/recommendations/warning`,
            {
              warning,
              context: {
                brandName: data.brandName || null,
                industry: data.industry || null
              }
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          if (response.data.success) {
            setWarningRecommendations({
              ...warningRecommendations,
              [index]: response.data.recommendation
            });
          }
        } catch (error) {
          console.error('Failed to fetch recommendation:', error);
          // Set error state to stop infinite loading
          setWarningRecommendations({
            ...warningRecommendations,
            [index]: { error: 'Failed to load recommendation. Please try again later.' }
          });
        } finally {
          setLoadingRecommendations({ ...loadingRecommendations, [index]: false });
        }
      }
    }
  };

  return (
    <div className="results-container section">
      <div className="container">
        <div className="results-header text-center">
          <h2>Analysis Results</h2>
          <p className="result-url">{data.url}</p>
          <p className="result-timestamp">
            Analyzed {new Date(data.analyzedAt).toLocaleString()}
          </p>
          
          {/* Display warnings for partial failures */}
          {warnings && warnings.length > 0 && (
            <div className="card alert alert-warning" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <FiAlertTriangle />
              <div>
                <strong>Analysis completed with warnings:</strong>
                <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
                <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.9em', opacity: 0.8 }}>
                  The analysis completed successfully, but some parts had issues. Results may be incomplete.
                </p>
              </div>
            </div>
          )}
          
          <div className="export-buttons">
            <button 
              className="btn btn-secondary export-btn" 
              onClick={() => handleExport('csv')}
              title="Export as CSV"
            >
              <FiDownload /> Export CSV
            </button>
            {isPremium && (
              <button 
                className="btn btn-secondary export-btn" 
                onClick={() => handleExport('pdf')}
                title="Export as PDF (Premium)"
              >
                <FiDownload /> Export PDF
              </button>
            )}
            {!isPremium && (
              <button 
                className="btn btn-secondary export-btn premium-locked" 
                onClick={() => {
                  setPremiumFeatureName('PDF Export');
                  setShowPremiumModal(true);
                }}
                title="PDF Export (Premium Feature) - Click to learn more"
              >
                <FiLock size={14} /> PDF (Premium)
              </button>
            )}
          </div>
        </div>
        
        {/* Premium Upgrade Modal */}
        <PremiumUpgradeModal 
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          feature={premiumFeatureName}
        />

        {/* LLM Visibility Score - Hero Card */}
        <div className="llm-score-card card">
          <div className="score-content">
            <div className="score-label">
              <h3>LLM Visibility Score</h3>
              <p>How well AI models cite your website</p>
              <FeatureExplanation
                feature="llm-visibility"
                title="LLM Visibility Score"
                description="The LLM Visibility Score measures how well your website is recognized and recommended by AI search models like ChatGPT, Claude, and Gemini. A higher score means AI assistants are more likely to cite your website when users ask relevant questions."
                howItWorks="We test your website against 3 different prompts that simulate real user queries. Each prompt is scored based on whether your domain is mentioned (1 point), cited with a link (2 points), or recommended as a top resource (3 points). Your total score is calculated as X/9, where 9 is the maximum possible score."
                whyItMatters="As AI-powered search becomes more common, being visible to AI models is crucial for driving traffic. When ChatGPT or Claude recommends your website, you get direct traffic without traditional SEO. This score helps you understand your AI search presence and identify opportunities to improve."
                examples={[
                  "Score 80-100%: Excellent - AI models frequently recommend your site",
                  "Score 50-79%: Good - Your site is mentioned but could be more prominent",
                  "Score 0-49%: Needs improvement - AI models rarely cite your website"
                ]}
              />
            </div>
            <div className="score-value">
              <div className="score-circle">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45"
                    style={{
                      strokeDasharray: `${llmVisibility.percentage * 2.827}, 282.7`,
                      stroke: getScoreColor(llmVisibility.percentage)
                    }}
                  />
                </svg>
                <div className="score-text">
                  <span className="percentage">{llmVisibility.percentage}%</span>
                  <span className="sublabel">{llmVisibility.totalScore}/{llmVisibility.maxScore}</span>
                </div>
              </div>
              <div className="score-calculation">
                <small>Calculation: {llmVisibility.totalScore} points out of {llmVisibility.maxScore} possible</small>
              </div>
            </div>
          </div>
          
          <div className="score-breakdown">
            <h4>Prompt Breakdown</h4>
            <div className="prompts-list">
              {llmVisibility.details.map((detail, index) => (
                <div key={index} className="prompt-item">
                  <div className="prompt-header">
                    <span className="prompt-label">Prompt {index + 1}</span>
                    {detail.domainMentioned ? (
                      <span className="badge badge-success">
                        <FiCheckCircle /> Mentioned
                      </span>
                    ) : (
                      <span className="badge badge-error">
                        ✗ Not Mentioned
                      </span>
                    )}
                  </div>
                  <p className="prompt-text">"{detail.prompt}"</p>
                  <details className="prompt-response">
                    <summary>View AI Response</summary>
                    <div className="response-content">
                      {/* Show parsed JSON description if available, otherwise raw response */}
                      {detail.parsedResponse?.description ? (
                        <div>
                          <p><strong>Description:</strong> {detail.parsedResponse.description}</p>
                          {detail.parsedResponse.reasoning && (
                            <p><strong>Reasoning:</strong> {detail.parsedResponse.reasoning}</p>
                          )}
                        </div>
                      ) : (
                        <p>{detail.response || 'No response available'}</p>
                      )}
                      {detail.citations && detail.citations.length > 0 && (
                        <div className="citations">
                          <strong>Citations Found:</strong>
                          <ul>
                            {detail.citations.map((citation, i) => (
                              <li key={i}>
                                <a href={citation} target="_blank" rel="noopener noreferrer">
                                  {citation} <FiExternalLink size={12} />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Recommendations Section */}
                      {detail.recommendations && detail.recommendations.length > 0 && (
                        <div className="recommendations-section">
                          {isPremium ? (
                            <div className="recommendations-content">
                              <h5><FiStar /> AI Recommendations to Improve Visibility</h5>
                              <ul className="recommendations-list">
                                {detail.recommendations.map((rec, i) => (
                                  <li key={i} className={`recommendation-item priority-${rec.priority || 'medium'}`}>
                                    <strong>{rec.title || `Recommendation ${i + 1}`}</strong>
                                    <p>{rec.description}</p>
                                    {rec.priority && (
                                      <span className={`priority-badge priority-${rec.priority}`}>
                                        {rec.priority} priority
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="premium-cta">
                              <div className="premium-cta-content">
                                <FiStar className="premium-icon" />
                                <div>
                                  <h5>AI-Powered Recommendations Available</h5>
                                  <p>Get personalized, actionable recommendations to improve your AI search visibility</p>
                                </div>
                              </div>
                              <button className="btn btn-primary premium-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                Upgrade to Pro <FiArrowRight />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="section-title">SEO Analysis</h2>

        {/* SEO Score Overview */}
        <div className="seo-overview-grid">
          <div className="card stat-card">
            <div className="stat-icon" style={{ color: seo.isHttps ? '#10B981' : '#EF4444' }}>
              {seo.isHttps ? <FiLock /> : <FiUnlock />}
            </div>
            <div className="stat-content">
              <h4>{seo.isHttps ? 'Secure (HTTPS)' : 'Not Secure'}</h4>
              <p className="stat-value">{seo.isHttps ? '✓ SSL Certificate' : 'X No HTTPS'}</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon" style={{ color: seo.loadTimeMs < 3000 ? '#10B981' : '#F59E0B' }}>
              ⚡
            </div>
            <div className="stat-content">
              <h4>Load Time</h4>
              <p className="stat-value">{seo.loadTimeMs}ms</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon" style={{ color: seo.images?.altCoverage > 80 ? '#10B981' : seo.images?.altCoverage > 50 ? '#F59E0B' : '#EF4444' }}>
              <FiImage />
            </div>
            <div className="stat-content">
              <h4>Images Alt Text</h4>
              <p className="stat-value">{seo.images?.altCoverage || 0}% Coverage</p>
              <p className="stat-detail">{seo.images?.withAlt || 0} of {seo.images?.total || 0} images</p>
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-icon" style={{ color: seo.structuredData?.count > 0 ? '#10B981' : '#EF4444' }}>
              <FiCode />
            </div>
            <div className="stat-content">
              <h4>Structured Data</h4>
              <p className="stat-value">{seo.structuredData?.count || 0} Schema{seo.structuredData?.count !== 1 ? 's' : ''}</p>
              {seo.structuredData?.count > 0 && (
                <p className="stat-detail">{seo.structuredData.schemas?.map(s => s.schema).join(', ')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Main SEO Grid */}
        <div className="seo-detailed-grid">
          {/* Basic SEO */}
          <div className="card">
            <h3><FiFileText /> Basic SEO</h3>
            <div className="seo-metrics">
              <div className="metric">
                <span className="metric-label">Title</span>
                <span className="metric-value">{seo.title || 'Not found'}</span>
                {seo.title && <span className="metric-hint">{seo.title.length} characters</span>}
              </div>
              <div className="metric">
                <span className="metric-label">Meta Description</span>
                <span className="metric-value">{seo.metaDescription || 'Not found'}</span>
                {seo.metaDescription && <span className="metric-hint">{seo.metaDescription.length} characters</span>}
              </div>
              <div className="metric">
                <span className="metric-label">Canonical URL</span>
                <span className="metric-value">{seo.canonical || 'Not set'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Meta Robots</span>
                <span className="metric-value">{seo.robotsMeta || 'Default (index, follow)'}</span>
              </div>
            </div>
          </div>

          {/* Technical SEO */}
          <div className="card">
            <h3>⚙️ Technical</h3>
            <div className="seo-metrics">
              <div className="metric">
                <span className="metric-label">Status Code</span>
                <span className={`metric-value ${seo.statusCode === 200 ? 'text-success' : 'text-error'}`}>
                  {seo.statusCode}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Charset</span>
                <span className="metric-value">{seo.charset || 'Not specified'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Viewport</span>
                <span className="metric-value">{seo.viewport ? '✓ Mobile-friendly' : '✗ Not set'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Language</span>
                <span className="metric-value">{seo.lang || 'Not specified'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Favicon</span>
                <span className="metric-value">{seo.favicon ? '✓ Present' : '✗ Missing'}</span>
              </div>
            </div>
          </div>

          {/* Heading Structure */}
          {seo.headings && (
            <div className="card">
              <h3><FiLayers /> Heading Structure</h3>
              <div className="seo-metrics">
                <div className="metric">
                  <span className="metric-label">H1 Tags</span>
                  <span className={`metric-value ${seo.headings.h1.length === 1 ? 'text-success' : 'text-warning'}`}>
                    {seo.headings.h1.length} found
                  </span>
                  {seo.headings.h1.length > 0 && (
                    <span className="metric-hint">"{seo.headings.h1[0]}"</span>
                  )}
                </div>
                <div className="metric">
                  <span className="metric-label">H2 Tags</span>
                  <span className="metric-value">{seo.headings.h2}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">H3 Tags</span>
                  <span className="metric-value">{seo.headings.h3}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">H4-H6 Tags</span>
                  <span className="metric-value">{seo.headings.h4 + seo.headings.h5 + seo.headings.h6}</span>
                </div>
              </div>
            </div>
          )}

          {/* Images Analysis */}
          {seo.images && (
            <div className="card">
              <h3><FiImage /> Images & Accessibility</h3>
              <div className="seo-metrics">
                <div className="metric">
                  <span className="metric-label">Total Images</span>
                  <span className="metric-value">{seo.images.total}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">With Alt Text</span>
                  <span className="metric-value text-success">{seo.images.withAlt}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Without Alt Text</span>
                  <span className={`metric-value ${seo.images.withoutAlt > 0 ? 'text-error' : 'text-success'}`}>
                    {seo.images.withoutAlt}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Alt Text Coverage</span>
                  <span className="metric-value">{seo.images.altCoverage}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Links Analysis */}
          {seo.links && (
            <div className="card">
              <h3><FiLink /> Links</h3>
              <div className="seo-metrics">
                <div className="metric">
                  <span className="metric-label">Total Links</span>
                  <span className="metric-value">{seo.links.total}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Internal Links</span>
                  <span className="metric-value">{seo.links.internal}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">External Links</span>
                  <span className="metric-value">{seo.links.external}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Nofollow Links</span>
                  <span className="metric-value">{seo.links.nofollow}</span>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Tags */}
          <div className="card">
            <h3><FiShare2 /> Social Media</h3>
            <div className="seo-metrics">
              <div className="metric">
                <span className="metric-label">Open Graph Title</span>
                <span className="metric-value">{seo.ogTitle ? '✓ Set' : '✗ Missing'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Open Graph Description</span>
                <span className="metric-value">{seo.ogDescription ? '✓ Set' : '✗ Missing'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Open Graph Image</span>
                <span className="metric-value">{seo.ogImage ? '✓ Set' : '✗ Missing'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Twitter Card</span>
                <span className="metric-value">{seo.twitterCard || '✗ Not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Data */}
        {seo.structuredData && (
          <div className="card">
            <h3><FiCode /> Structured Data (Schema.org)</h3>
            {seo.structuredData.count > 0 ? (
              <div className="structured-data-list">
                <p className="metric-hint">Found {seo.structuredData.count} structured data schema(s):</p>
                <div className="schema-badges">
                  {seo.structuredData.schemas.map((schema, index) => (
                    <span key={index} className={`badge ${schema.valid ? 'badge-success' : 'badge-error'}`}>
                      {schema.schema}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="no-data">No structured data found. Consider adding Schema.org markup for better search visibility.</p>
            )}
          </div>
        )}

        {/* robots.txt & Sitemap */}
        <div className="seo-files-grid">
          {/* robots.txt */}
          {seo.robotsTxt && (
            <div className="card">
              <h3><FiFileText /> robots.txt</h3>
              {seo.robotsTxt.exists ? (
                <div className="seo-metrics">
                  <div className="metric">
                    <span className="metric-label">Status</span>
                    <span className="metric-value text-success">✓ Found</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Size</span>
                    <span className="metric-value">{seo.robotsTxt.size} bytes</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Rules</span>
                    <span className="metric-value">{seo.robotsTxt.linesCount} lines</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Sitemap Reference</span>
                    <span className="metric-value">{seo.robotsTxt.hasSitemap ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  <a href={seo.robotsTxt.url} target="_blank" rel="noopener noreferrer" className="view-link">
                    View robots.txt <FiExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <p className="no-data text-error">✗ robots.txt not found</p>
              )}
            </div>
          )}

          {/* Sitemap */}
          {seo.sitemap && (
            <div className="card">
              <h3><FiMap /> sitemap.xml</h3>
              {seo.sitemap.exists ? (
                <div className="seo-metrics">
                  <div className="metric">
                    <span className="metric-label">Status</span>
                    <span className="metric-value text-success">✓ Found</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">URLs</span>
                    <span className="metric-value">{seo.sitemap.urlCount} pages</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Size</span>
                    <span className="metric-value">{Math.round(seo.sitemap.size / 1024)} KB</span>
                  </div>
                  <a href={seo.sitemap.url} target="_blank" rel="noopener noreferrer" className="view-link">
                    View sitemap.xml <FiExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <p className="no-data text-error">✗ sitemap.xml not found</p>
              )}
            </div>
          )}
        </div>

        {/* Security Headers */}
        {seo.securityHeaders && (
          <div className="card">
            <h3><FiLock /> Security Headers</h3>
            <div className="seo-metrics">
              <div className="metric">
                <span className="metric-label">HTTPS</span>
                <span className={`metric-value ${seo.isHttps ? 'text-success' : 'text-error'}`}>
                  {seo.isHttps ? '✓ Enabled' : '✗ Not Enabled'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">HSTS</span>
                <span className={`metric-value ${seo.securityHeaders.strictTransportSecurity ? 'text-success' : 'text-warning'}`}>
                  {seo.securityHeaders.strictTransportSecurity ? '✓ Enabled' : '✗ Not Set'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">X-Frame-Options</span>
                <span className={`metric-value ${seo.securityHeaders.xFrameOptions ? 'text-success' : 'text-warning'}`}>
                  {seo.securityHeaders.xFrameOptions || '✗ Not Set'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">X-Content-Type-Options</span>
                <span className={`metric-value ${seo.securityHeaders.xContentTypeOptions ? 'text-success' : 'text-warning'}`}>
                  {seo.securityHeaders.xContentTypeOptions || '✗ Not Set'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SEO Recommendations */}
        {seo.warnings && seo.warnings.length > 0 && (
          <div className="card seo-recommendations-card">
            <div className="recommendations-header">
              <div>
                <h3>
                  <FiAlertTriangle /> SEO Recommendations
                </h3>
                <p className="recommendations-subtitle">
                  {seo.warnings.length} improvement{seo.warnings.length !== 1 ? 's' : ''} identified to boost your SEO performance
                  {isPremium && ' • Click any recommendation for AI-powered insights'}
                </p>
              </div>
              <div className="recommendations-count-badge">
                {seo.warnings.length}
              </div>
            </div>
            
            <div className="recommendations-grid">
              {seo.warnings.map((warning, index) => (
                <div key={index} className="recommendation-card">
                  <div className="recommendation-number">{index + 1}</div>
                  <div className="recommendation-content">
                    <FiInfo className="recommendation-icon" />
                    <div style={{ flex: 1 }}>
                      <p className="recommendation-text">{warning}</p>
                      
                      {/* AI Recommendation Dropdown */}
                      <button
                        className={`ai-recommendation-toggle ${!isPremium ? 'locked' : ''}`}
                        onClick={() => toggleWarningDetail(index, warning)}
                      >
                        {loadingRecommendations[index] ? (
                          <>
                            <FiLoader className="spinner-icon" />
                            Loading AI insights...
                          </>
                        ) : expandedWarnings.has(index) ? (
                          <>
                            <FiChevronUp />
                            Hide AI insights
                          </>
                        ) : (
                          <>
                            <FiStar />
                            Get AI-powered insights
                            {!isPremium && <FiLock size={14} style={{ marginLeft: '4px' }} />}
                          </>
                        )}
                      </button>
                      
                      {/* AI Recommendation Details */}
                      {expandedWarnings.has(index) && warningRecommendations[index] && (
                        <div className="ai-recommendation-details">
                          {warningRecommendations[index].error ? (
                            <div className="ai-recommendation-error">
                              <FiAlertTriangle size={16} />
                              <p>{warningRecommendations[index].error}</p>
                            </div>
                          ) : (
                            <>
                              {warningRecommendations[index].model && (
                                <div className="ai-model-badge">
                                  <FiStar size={12} />
                                  Generated by {warningRecommendations[index].model}
                                </div>
                              )}
                              
                              <div className="ai-recommendation-section">
                                <h5>Why This Matters</h5>
                                <p>{warningRecommendations[index].summary}</p>
                              </div>
                              
                              <div className="ai-recommendation-section">
                                <h5>Impact</h5>
                                <p>{warningRecommendations[index].impact}</p>
                              </div>
                              
                              {warningRecommendations[index].steps && warningRecommendations[index].steps.length > 0 && (
                                <div className="ai-recommendation-section">
                                  <h5>Action Steps</h5>
                                  <ol className="action-steps-list">
                                    {warningRecommendations[index].steps.map((step, i) => (
                                      <li key={i}>{step}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              
                              {warningRecommendations[index].resources && warningRecommendations[index].resources.length > 0 && (
                                <div className="ai-recommendation-section">
                                  <h5>Helpful Resources</h5>
                                  <ul className="resources-list">
                                    {warningRecommendations[index].resources.map((resource, i) => (
                                      <li key={i}>{resource}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {warningRecommendations[index].timeEstimate && (
                                <div className="ai-recommendation-section time-estimate">
                                  <strong>Estimated Time:</strong> {warningRecommendations[index].timeEstimate}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integration Data - Search Console */}
        {integrations?.searchConsole && !integrations.searchConsole.error && (
          <div className="card integration-data-card">
            <h3>🔍 Google Search Console Data</h3>
            <div className="integration-data-content">
              {integrations.searchConsole.rows && integrations.searchConsole.rows.length > 0 ? (
                <div>
                  <div className="integration-summary">
                    <p>
                      <strong>Site:</strong> {integrations.searchConsole.siteUrl}
                    </p>
                    <p>
                      <strong>Date Range:</strong> {integrations.searchConsole.dateRange?.startDate} to {integrations.searchConsole.dateRange?.endDate}
                    </p>
                  </div>
                  <div className="integration-table">
                    <h4>Top Queries</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Query</th>
                          <th>Clicks</th>
                          <th>Impressions</th>
                          <th>CTR</th>
                          <th>Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {integrations.searchConsole.rows.slice(0, 10).map((row, index) => (
                          <tr key={index}>
                            <td>{row.keys?.[0] || 'N/A'}</td>
                            <td>{row.clicks || 0}</td>
                            <td>{row.impressions || 0}</td>
                            <td>{row.ctr ? (row.ctr * 100).toFixed(2) + '%' : '0%'}</td>
                            <td>{row.position ? row.position.toFixed(1) : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="no-data">No Search Console data available for this period.</p>
              )}
            </div>
          </div>
        )}

        {/* Integration Data - Analytics */}
        {integrations?.analytics && !integrations.analytics.error && (
          <div className="card integration-data-card">
            <h3>📊 Google Analytics Data</h3>
            <div className="integration-data-content">
              {integrations.analytics.totals ? (
                <div>
                  <div className="integration-summary">
                    <p>
                      <strong>View ID:</strong> {integrations.analytics.viewId}
                    </p>
                    <p>
                      <strong>Date Range:</strong> {integrations.analytics.dateRange?.startDate} to {integrations.analytics.dateRange?.endDate}
                    </p>
                  </div>
                  <div className="analytics-metrics-grid">
                    <div className="metric-card">
                      <h4>Sessions</h4>
                      <p className="metric-value">{parseInt(integrations.analytics.totals.sessions || 0).toLocaleString()}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Users</h4>
                      <p className="metric-value">{parseInt(integrations.analytics.totals.users || 0).toLocaleString()}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Bounce Rate</h4>
                      <p className="metric-value">{(parseFloat(integrations.analytics.totals.bounceRate || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="metric-card">
                      <h4>Avg. Session Duration</h4>
                      <p className="metric-value">
                        {Math.floor(parseFloat(integrations.analytics.totals.avgSessionDuration || 0))}s
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="no-data">No Analytics data available for this period.</p>
              )}
            </div>
          </div>
        )}

        {/* Integration Error Messages */}
        {integrations?.searchConsole?.error && (
          <div className="card alert alert-warning">
            <FiAlertTriangle />
            <div>
              <strong>Search Console Error:</strong>
              <p>{integrations.searchConsole.error}</p>
            </div>
          </div>
        )}

        {integrations?.analytics?.error && (
          <div className="card alert alert-warning">
            <FiAlertTriangle />
            <div>
              <strong>Analytics Error:</strong>
              <p>{integrations.analytics.error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getScoreColor(percentage) {
  if (percentage >= 70) return '#10B981'; // Green
  if (percentage >= 40) return '#F59E0B'; // Orange
  return '#EF4444'; // Red
}

