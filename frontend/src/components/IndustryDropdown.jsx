import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiCheck } from 'react-icons/fi';

const INDUSTRIES = [
  'Technology',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Food & Beverage',
  'Travel & Tourism',
  'Fashion & Apparel',
  'Automotive',
  'Entertainment',
  'Sports & Fitness',
  'Beauty & Personal Care',
  'Home & Garden',
  'Business Services',
  'Legal Services',
  'Marketing & Advertising',
  'Manufacturing',
  'Energy & Utilities',
  'Other'
];

export default function IndustryDropdown({ value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter industries based on search
  const filteredIndustries = INDUSTRIES.filter(industry =>
    industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (industry) => {
    onChange(industry);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="industry-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{value || 'Select Industry (Optional)'}</span>
        <FiChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search industries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
            />
          </div>
          <div className="dropdown-options">
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  className={`dropdown-option ${value === industry ? 'selected' : ''}`}
                  onClick={() => handleSelect(industry)}
                >
                  <span>{industry}</span>
                  {value === industry && <FiCheck className="check-icon" />}
                </button>
              ))
            ) : (
              <div className="dropdown-no-results">No industries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

