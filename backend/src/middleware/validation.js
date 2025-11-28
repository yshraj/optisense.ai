/**
 * Validates URL format
 */
function validateUrl(req, res, next) {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }
  
  // Check if valid URL format
  try {
    const urlObj = new URL(url);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'URL must use HTTP or HTTPS protocol'
      });
    }
    
    // Must have a hostname
    if (!urlObj.hostname) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }
    
    next();
    
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }
}

module.exports = { validateUrl };

