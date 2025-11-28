import { useState } from 'react';
import { FiInfo, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';

/**
 * Reusable component for explaining features
 * Props:
 * - feature: string identifier for the feature
 * - title: string - title of the feature
 * - description: string - what the feature is
 * - howItWorks: string - how it works
 * - whyItMatters: string - why users should care
 * - examples: array of strings - examples of good/bad scores
 */
export default function FeatureExplanation({ 
  feature, 
  title, 
  description, 
  howItWorks, 
  whyItMatters,
  examples = []
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="feature-explanation">
      <button
        className="feature-explanation-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <FiInfo className="info-icon" />
        <span>What is {title}?</span>
        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {isExpanded && (
        <div className="feature-explanation-content">
          <div className="explanation-section">
            <h4>What is it?</h4>
            <p>{description}</p>
          </div>

          {howItWorks && (
            <div className="explanation-section">
              <h4>How it works</h4>
              <p>{howItWorks}</p>
            </div>
          )}

          {whyItMatters && (
            <div className="explanation-section">
              <h4>Why it matters</h4>
              <p>{whyItMatters}</p>
            </div>
          )}

          {examples.length > 0 && (
            <div className="explanation-section">
              <h4>Examples</h4>
              <ul className="examples-list">
                {examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="close-explanation"
            onClick={() => setIsExpanded(false)}
            aria-label="Close explanation"
          >
            <FiX /> Close
          </button>
        </div>
      )}
    </div>
  );
}

