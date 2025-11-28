import React, { useState, useEffect, useRef } from 'react';
import { FiExternalLink, FiCalendar, FiClock, FiTrendingUp, FiChevronDown, FiChevronRight, FiX, FiChevronLeft } from 'react-icons/fi';
import axios from 'axios';
import ResultsDisplay from './ResultsDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ScanHistory({ isOpen, onClose, token }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urlSearch, setUrlSearch] = useState('');
  const [debouncedUrlSearch, setDebouncedUrlSearch] = useState('');
  const [user, setUser] = useState(null);
  const sectionRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounce URL search to prevent cursor exit
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedUrlSearch(urlSearch);
      setPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce delay
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [urlSearch]);

  useEffect(() => {
    if (isOpen && token) {
      fetchScans();
      fetchUserData();
    }
  }, [isOpen, token, page, limit, statusFilter, debouncedUrlSearch]);

  // Separate effect for scrolling to avoid conflicts
  useEffect(() => {
    if (isOpen) {
      // Smooth scroll to section with offset for navbar
      const scrollToSection = () => {
        if (sectionRef.current) {
          const element = sectionRef.current;
          const navbarHeight = 80; // Approximate navbar height
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - navbarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      };

      // Use requestAnimationFrame for smoother animation
      const scrollTimer = requestAnimationFrame(() => {
        setTimeout(scrollToSection, 100);
      });
      
      return () => {
        cancelAnimationFrame(scrollTimer);
      };
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  const fetchScans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      // Add status filter to backend query
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // Add URL search filter (use debounced value)
      if (debouncedUrlSearch.trim()) {
        params.append('search', debouncedUrlSearch.trim());
      }
      
      const response = await axios.get(`${API_URL}/api/user/scans?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setScans(response.data.scans);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.pages || 0);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 70) return '#10B981';
    if (percentage >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const toggleRow = (scanId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(scanId)) {
      newExpanded.delete(scanId);
    } else {
      newExpanded.add(scanId);
    }
    setExpandedRows(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="scan-history-section section" ref={sectionRef}>
      <div className="container">
        <div className="scan-history-header">
          <div className="scan-history-header-content">
            <div>
              <h2>Scan History</h2>
              <p>View and manage all your previous analyses {total > 0 && `(${total} total)`}</p>
            </div>
            <button className="btn-close-history" onClick={onClose} title="Close">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="scan-history-loading">
            <div className="spinner"></div>
            <p>Loading scan history...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        ) : scans.length === 0 ? (
          <div className="scan-history-empty">
            <FiTrendingUp size={48} />
            <h3>
              {statusFilter !== 'all' ? 'No scans found' : 'No scans yet'}
            </h3>
            <p>
              {statusFilter !== 'all' 
                ? `No scans with status "${statusFilter}". Try changing the filter.`
                : 'Start analyzing websites to see your history here'}
            </p>
            {statusFilter !== 'all' && (
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="scan-history-table-container">
            {/* Filters Bar */}
            <div className="table-filters-bar">
              {/* Search on Left */}
              <div className="filter-search">
                <input
                  type="text"
                  placeholder="Search by URL..."
                  value={urlSearch}
                  onChange={(e) => {
                    setUrlSearch(e.target.value);
                    setPage(1);
                  }}
                  className="filter-search-input"
                />
              </div>
              
              {/* Status and Per Page on Right */}
              <div className="table-filters">
                <div className="filter-item">
                  <label>Status</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="filter-select"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Per Page</label>
                  <select 
                    value={limit} 
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="filter-select"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>
            
            <table className="scan-history-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Date</th>
                  <th>LLM Visibility</th>
                  <th>SEO Warnings</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => {
                  const isExpanded = expandedRows.has(scan._id);
                  return (
                    <React.Fragment key={scan._id}>
                      <tr 
                        className={`scan-table-row ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleRow(scan._id)}
                      >
                        <td className="url-cell">
                          <div className="url-content">
                            {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            <a 
                              href={scan.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="scan-url-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {scan.url}
                              <FiExternalLink size={14} />
                            </a>
                          </div>
                        </td>
                        <td>
                          <div className="table-meta">
                            <span className="meta-item">
                              <FiCalendar size={14} />
                              {formatDate(scan.createdAt)}
                            </span>
                            {scan.executionTimeMs && (
                              <span className="meta-item">
                                <FiClock size={14} />
                                {(scan.executionTimeMs / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {scan.llmVisibility ? (
                            <span 
                              className="score-badge"
                              style={{ color: getScoreColor(scan.llmVisibility.percentage) }}
                            >
                              {scan.llmVisibility.percentage}%
                            </span>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>
                          {scan.seo ? (
                            <span className="warnings-count">
                              {scan.seo.warnings?.length || 0}
                            </span>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${scan.status}`}>
                            {scan.status === 'completed' ? '✓ Completed' : 
                             scan.status === 'processing' ? '⏳ Processing' :
                             scan.status === 'failed' ? '✗ Failed' : scan.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-expand"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(scan._id);
                            }}
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && scan.status === 'completed' && (
                        <tr className="scan-details-row">
                          <td colSpan={6}>
                            <div className="scan-details-content">
                              <ResultsDisplay 
                                data={{
                                  url: scan.url,
                                  analyzedAt: scan.createdAt,
                                  seo: scan.seo,
                                  llmVisibility: scan.llmVisibility,
                                  scanId: scan._id,
                                  isPremium: user?.isPremium && 
                                    (!user?.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date()),
                                  isFreeUser: !(user?.isPremium && 
                                    (!user?.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date()))
                                }} 
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination */}
            {total > 0 && (
              <div className="scan-history-pagination">
                <div className="pagination-info">
                  Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} scan{total !== 1 ? 's' : ''}
                </div>
                {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="btn-pagination"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <FiChevronLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="pagination-pages">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`btn-page ${page === pageNum ? 'active' : ''}`}
                          onClick={() => setPage(pageNum)}
                          disabled={loading}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    className="btn-pagination"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <FiChevronRight size={16} />
                  </button>
                </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

