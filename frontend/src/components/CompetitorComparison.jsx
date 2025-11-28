import { useState } from 'react';
import { FiX, FiTrendingUp, FiTrendingDown, FiMinus, FiDownload, FiStar } from 'react-icons/fi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CompetitorComparison({ isOpen, onClose, token, isPremium }) {
  const [urls, setUrls] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddUrl = () => {
    if (urls.length < 5) {
      setUrls([...urls, '']);
    }
  };

  const handleRemoveUrl = (index) => {
    if (urls.length > 2) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleCompare = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length < 2) {
      setError('Please provide at least 2 URLs to compare');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/compare`,
        { urls: validUrls },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setResults(response.data.comparison);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requiresUpgrade) {
        setError('Competitor comparison is a premium feature. Please upgrade to access this feature.');
      } else {
        setError(errorData?.error || 'Comparison failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index, total) => {
    if (index === 0) return <FiTrendingUp className="text-success" />;
    if (index === total - 1) return <FiTrendingDown className="text-error" />;
    return <FiMinus className="text-secondary" />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content competitor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Competitor Comparison</h2>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {!isPremium && (
          <div className="premium-banner">
            <FiStar /> This is a premium feature. Upgrade to compare up to 5 competitors.
          </div>
        )}

        {!results ? (
          <div className="comparison-form">
            <p className="form-description">
              Compare up to 5 URLs to see how they perform in AI search visibility and SEO.
            </p>

            <div className="url-inputs">
              {urls.map((url, index) => (
                <div key={index} className="url-input-group">
                  <input
                    type="text"
                    placeholder={`URL ${index + 1}`}
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className="url-input"
                  />
                  {urls.length > 2 && (
                    <button
                      className="btn-remove-url"
                      onClick={() => handleRemoveUrl(index)}
                      type="button"
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {urls.length < 5 && (
              <button
                className="btn btn-secondary"
                onClick={handleAddUrl}
                type="button"
              >
                + Add Another URL
              </button>
            )}

            {error && (
              <div className="error-banner">
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleCompare}
              disabled={loading || !isPremium}
            >
              {loading ? 'Comparing...' : 'Compare URLs'}
            </button>
          </div>
        ) : (
          <div className="comparison-results">
            <div className="results-header-actions">
              <button className="btn btn-secondary" onClick={() => setResults(null)}>
                New Comparison
              </button>
            </div>

            {/* LLM Visibility Comparison */}
            <div className="comparison-section">
              <h3>LLM Visibility Scores</h3>
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>URL</th>
                      <th>Score</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.metrics.llmVisibility.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`rank-badge rank-${index + 1}`}>
                            #{index + 1} {getRankIcon(index, results.metrics.llmVisibility.length)}
                          </span>
                        </td>
                        <td className="url-cell">{item.url}</td>
                        <td>
                          <span className="score-value">{item.score}%</span>
                        </td>
                        <td>{item.totalScore}/{item.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEO Warnings Comparison */}
            <div className="comparison-section">
              <h3>SEO Warnings</h3>
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>URL</th>
                      <th>Warnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.metrics.seoWarnings.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`rank-badge rank-${index + 1}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="url-cell">{item.url}</td>
                        <td>
                          <span className={`warning-count ${item.warningCount === 0 ? 'text-success' : 'text-warning'}`}>
                            {item.warningCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Citations Comparison */}
            <div className="comparison-section">
              <h3>Total Citations</h3>
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>URL</th>
                      <th>Citations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.metrics.citations.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <span className={`rank-badge rank-${index + 1}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="url-cell">{item.url}</td>
                        <td>
                          <span className="citation-count">{item.citationCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

