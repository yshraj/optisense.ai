const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Analyzes SEO health of a given URL
 * @param {string} url - The URL to analyze
 * @param {Object} options - Analysis options
 * @param {boolean} options.isPremium - Whether user is premium (enables enhanced checks)
 * @returns {Promise<Object>} SEO data
 */
async function analyzeSEO(url, options = {}) {
  const { isPremium = false } = options;
  const startTime = Date.now();
  
  try {
    // Normalize URL - ensure it has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Parse URL for domain extraction
    const parsedUrl = new URL(normalizedUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    
    // Check HTTPS - use the actual URL that was fetched
    const isHttps = normalizedUrl.startsWith('https://') || parsedUrl.protocol === 'https:';
    
    // Fetch the page with timeout
    const response = await axios.get(normalizedUrl, {
      timeout: 15000, // 15 seconds
      maxRedirects: 5,
      headers: {
        'User-Agent': 'OptiSenseAI-Bot/1.0 (SEO Analysis Tool)'
      }
    });
    
    const loadTimeMs = Date.now() - startTime;
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract SEO data
    const seoData = {
      // Basic Tags
      title: $('title').text().trim() || null,
      metaDescription: $('meta[name="description"]').attr('content') || null,
      canonical: $('link[rel="canonical"]').attr('href') || null,
      
      // Technical
      statusCode: response.status,
      loadTimeMs: loadTimeMs,
      robotsMeta: $('meta[name="robots"]').attr('content') || null,
      viewport: $('meta[name="viewport"]').attr('content') || null,
      charset: $('meta[charset]').attr('charset') || 
               $('meta[http-equiv="Content-Type"]').attr('content')?.match(/charset=(.+)/)?.[1] || null,
      lang: $('html').attr('lang') || null,
      favicon: $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || null,
      
      // Security
      isHttps: isHttps,
      securityHeaders: {
        strictTransportSecurity: response.headers['strict-transport-security'] || null,
        contentSecurityPolicy: response.headers['content-security-policy'] || null,
        xFrameOptions: response.headers['x-frame-options'] || null,
        xContentTypeOptions: response.headers['x-content-type-options'] || null,
      },
      
      // Open Graph
      ogTitle: $('meta[property="og:title"]').attr('content') || null,
      ogDescription: $('meta[property="og:description"]').attr('content') || null,
      ogImage: $('meta[property="og:image"]').attr('content') || null,
      ogType: $('meta[property="og:type"]').attr('content') || null,
      ogUrl: $('meta[property="og:url"]').attr('content') || null,
      ogSiteName: $('meta[property="og:site_name"]').attr('content') || null,
      
      // Twitter Cards
      twitterCard: $('meta[name="twitter:card"]').attr('content') || null,
      twitterTitle: $('meta[name="twitter:title"]').attr('content') || null,
      twitterDescription: $('meta[name="twitter:description"]').attr('content') || null,
      twitterImage: $('meta[name="twitter:image"]').attr('content') || null,
      twitterSite: $('meta[name="twitter:site"]').attr('content') || null,
      
      // Structured Data (JSON-LD)
      structuredData: extractStructuredData($),
      
      // Heading Structure
      headings: analyzeHeadings($),
      
      // Images Analysis
      images: analyzeImages($),
      
      // Links Analysis
      links: analyzeLinks($, baseUrl),
      
      // Extracted Page Content (for use in recommendations)
      extractedText: extractPageText($),
    };
    
    // Check robots.txt and sitemap (non-blocking - failures don't stop analysis)
    try {
      seoData.robotsTxt = await checkRobotsTxt(baseUrl);
    } catch (error) {
      seoData.robotsTxt = {
        exists: false,
        accessible: false,
        error: error.message
      };
    }
    
    try {
      seoData.sitemap = await checkSitemap(baseUrl);
    } catch (error) {
      seoData.sitemap = {
        exists: false,
        accessible: false,
        error: error.message
      };
    }
    
    // Validation warnings (enhanced for premium users)
    seoData.warnings = generateWarnings(seoData, $, isPremium);
    
    // Premium: Add enhanced analysis
    if (isPremium) {
      seoData.premiumAnalysis = {
        enhanced: true,
        // Additional checks for premium users
        contentQuality: analyzeContentQuality($),
        accessibilityScore: calculateAccessibilityScore(seoData),
        mobileOptimization: analyzeMobileOptimization(seoData, $),
        semanticHTML: analyzeSemanticHTML($)
      };
    }
    
    return seoData;
    
  } catch (error) {
    // Handle different error types
    if (error.code === 'ENOTFOUND') {
      throw new Error('Domain not found (DNS resolution failed)');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused (server not responding)');
    } else if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      throw new Error('Our servers are temporarily experiencing high load. Please try again in a few moments.');
    } else {
      throw new Error(`SEO analysis failed: ${error.message}`);
    }
  }
}

/**
 * Extract structured data (JSON-LD, Microdata)
 */
function extractStructuredData($) {
  const structuredData = [];
  
  // JSON-LD
  $('script[type="application/ld+json"]').each((i, elem) => {
    try {
      const data = JSON.parse($(elem).html());
      structuredData.push({
        type: 'JSON-LD',
        schema: data['@type'] || 'Unknown',
        valid: true
      });
    } catch (e) {
      structuredData.push({
        type: 'JSON-LD',
        schema: 'Invalid',
        valid: false
      });
    }
  });
  
  return {
    count: structuredData.length,
    schemas: structuredData
  };
}

/**
 * Analyze heading structure
 */
function analyzeHeadings($) {
  const headings = {
    h1: [],
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0
  };
  
  // Extract all H1 tags (should typically be only one)
  $('h1').each((i, elem) => {
    headings.h1.push($(elem).text().trim());
  });
  
  // Count other headings
  headings.h2 = $('h2').length;
  headings.h3 = $('h3').length;
  headings.h4 = $('h4').length;
  headings.h5 = $('h5').length;
  headings.h6 = $('h6').length;
  
  return headings;
}

/**
 * Analyze images on the page
 */
function analyzeImages($) {
  const images = $('img');
  let withAlt = 0;
  let withoutAlt = 0;
  
  images.each((i, elem) => {
    const alt = $(elem).attr('alt');
    if (alt !== undefined && alt.trim() !== '') {
      withAlt++;
    } else {
      withoutAlt++;
    }
  });
  
  return {
    total: images.length,
    withAlt,
    withoutAlt,
    altCoverage: images.length > 0 ? Math.round((withAlt / images.length) * 100) : 0
  };
}

/**
 * Analyze links on the page
 */
function analyzeLinks($, baseUrl) {
  const links = $('a[href]');
  let internal = 0;
  let external = 0;
  let nofollow = 0;
  
  links.each((i, elem) => {
    const href = $(elem).attr('href');
    const rel = $(elem).attr('rel') || '';
    
    if (href) {
      // Check if link is internal or external
      if (href.startsWith('/') || href.startsWith(baseUrl) || href.startsWith('#')) {
        internal++;
      } else if (href.startsWith('http')) {
        external++;
      }
      
      // Check for nofollow
      if (rel.includes('nofollow')) {
        nofollow++;
      }
    }
  });
  
  return {
    total: links.length,
    internal,
    external,
    nofollow
  };
}

/**
 * Check robots.txt file
 */
async function checkRobotsTxt(baseUrl) {
  try {
    const robotsUrl = `${baseUrl}/robots.txt`;
    const response = await axios.get(robotsUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200) {
      const content = response.data;
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      return {
        exists: true,
        accessible: true,
        size: content.length,
        linesCount: lines.length,
        hasSitemap: content.toLowerCase().includes('sitemap:'),
        url: robotsUrl
      };
    } else {
      return {
        exists: false,
        accessible: false,
        url: robotsUrl
      };
    }
  } catch (error) {
    return {
      exists: false,
      accessible: false,
      error: error.message
    };
  }
}

/**
 * Extract clean text content from page (removes scripts, styles, etc.)
 * @param {Object} $ - Cheerio instance
 * @returns {Object} Extracted text content
 */
function extractPageText($) {
  // Remove script, style, and other non-content elements
  $('script, style, noscript, iframe, embed, object').remove();
  
  // Extract main content areas (prioritize semantic HTML)
  const mainContent = $('main, article, [role="main"]').first();
  const bodyContent = $('body');
  
  // Use main content if available, otherwise use body
  const contentElement = mainContent.length > 0 ? mainContent : bodyContent;
  
  // Get text content
  let fullText = contentElement.text();
  
  // Clean up text: remove extra whitespace, normalize line breaks
  fullText = fullText
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
  
  // Extract paragraphs separately (useful for context)
  const paragraphs = [];
  $('p').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text.length > 20) { // Only include substantial paragraphs
      paragraphs.push(text);
    }
  });
  
  // Extract headings with their text
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
    const tag = elem.tagName.toLowerCase();
    const text = $(elem).text().trim();
    if (text.length > 0) {
      headings.push({ level: tag, text: text });
    }
  });
  
  // Limit text size to avoid storing too much (keep first 10000 chars for summary)
  const textSummary = fullText.substring(0, 10000);
  const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
  
  return {
    fullText: fullText, // Full extracted text
    summary: textSummary, // First 10000 chars for quick reference
    wordCount: wordCount,
    paragraphs: paragraphs.slice(0, 50), // First 50 paragraphs
    headings: headings.slice(0, 20), // First 20 headings
    extractedAt: new Date().toISOString()
  };
}

/**
 * Check sitemap.xml file
 */
async function checkSitemap(baseUrl) {
  const sitemapUrls = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap1.xml`
  ];
  
  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await axios.get(sitemapUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        const content = response.data;
        // Count URLs in sitemap
        const urlMatches = content.match(/<url>/g);
        const urlCount = urlMatches ? urlMatches.length : 0;
        
        return {
          exists: true,
          accessible: true,
          url: sitemapUrl,
          urlCount,
          size: content.length
        };
      }
    } catch (error) {
      // Continue to next sitemap URL
      continue;
    }
  }
  
  return {
    exists: false,
    accessible: false,
    checked: sitemapUrls
  };
}

/**
 * Generate SEO warnings (enhanced for premium users)
 */
function generateWarnings(seoData, $, isPremium = false) {
  const warnings = [];
  
  // Basic SEO
  if (!seoData.title) warnings.push('Missing <title> tag');
  if (!seoData.metaDescription) warnings.push('Missing meta description');
  if (seoData.title && seoData.title.length > 60) {
    warnings.push(`Title too long (${seoData.title.length} chars, recommended: 50-60)`);
  }
  if (seoData.title && seoData.title.length < 30) {
    warnings.push(`Title too short (${seoData.title.length} chars, recommended: 50-60)`);
  }
  if (seoData.metaDescription && seoData.metaDescription.length > 160) {
    warnings.push(`Meta description too long (${seoData.metaDescription.length} chars, recommended: 150-160)`);
  }
  if (seoData.metaDescription && seoData.metaDescription.length < 120) {
    warnings.push(`Meta description too short (${seoData.metaDescription.length} chars, recommended: 150-160)`);
  }
  if (!seoData.canonical) warnings.push('Missing canonical URL');
  
  // Technical
  if (!seoData.viewport) warnings.push('Missing viewport meta tag (mobile optimization)');
  if (!seoData.lang) warnings.push('Missing language attribute on <html> tag');
  if (!seoData.favicon) warnings.push('Missing favicon');
  if (!seoData.isHttps) warnings.push('⚠️ Not using HTTPS - Security and SEO risk');
  
  // Security Headers
  if (seoData.isHttps && !seoData.securityHeaders.strictTransportSecurity) {
    warnings.push('Missing HSTS security header');
  }
  
  // Open Graph
  if (!seoData.ogTitle) warnings.push('Missing Open Graph title');
  if (!seoData.ogDescription) warnings.push('Missing Open Graph description');
  if (!seoData.ogImage) warnings.push('Missing Open Graph image');
  
  // Twitter Cards
  if (!seoData.twitterCard) warnings.push('Missing Twitter Card type');
  
  // Structured Data
  const structuredDataCount = Array.isArray(seoData.structuredData) 
    ? seoData.structuredData.length 
    : (seoData.structuredData?.count || 0);
  if (structuredDataCount === 0) {
    warnings.push('No structured data (Schema.org) found');
  }
  
  // Headings
  if (seoData.headings.h1.length === 0) {
    warnings.push('Missing H1 heading');
  } else if (seoData.headings.h1.length > 1) {
    warnings.push(`Multiple H1 headings found (${seoData.headings.h1.length}), recommended: 1`);
  }
  
  // Images
  if (seoData.images.withoutAlt > 0) {
    warnings.push(`${seoData.images.withoutAlt} images missing alt text (accessibility issue)`);
  }
  
  // Performance
  if (seoData.loadTimeMs > 3000) {
    warnings.push(`Page load time is slow (${seoData.loadTimeMs}ms, recommended: <3000ms)`);
  }
  
  // Robots.txt
  if (!seoData.robotsTxt.exists) {
    warnings.push('robots.txt file not found');
  }
  
  // Sitemap
  if (!seoData.sitemap.exists) {
    warnings.push('sitemap.xml file not found');
  }
  
  // Premium: Additional advanced checks
  if (isPremium) {
    // Content quality
    const wordCount = $('body').text().split(/\s+/).length;
    if (wordCount < 300) {
      warnings.push(`Low content volume (${wordCount} words, recommended: 300+)`);
    }
    
    // Internal linking
    const internalLinks = seoData.links?.internal || 0;
    if (internalLinks < 5) {
      warnings.push(`Low internal linking (${internalLinks} links, recommended: 5+)`);
    }
    
    // External linking
    const externalLinks = seoData.links?.external || 0;
    if (externalLinks === 0) {
      warnings.push('No external links found (authority building opportunity)');
    }
    
    // Schema validation
    const structuredDataArray = Array.isArray(seoData.structuredData) 
      ? seoData.structuredData 
      : (seoData.structuredData?.schemas || []);
    const invalidSchemas = structuredDataArray.filter(s => s && !s.valid) || [];
    if (invalidSchemas.length > 0) {
      warnings.push(`${invalidSchemas.length} invalid structured data schema(s) found`);
    }
    
    // Image optimization
    const largeImages = seoData.images?.largeImages || 0;
    if (largeImages > 0) {
      warnings.push(`${largeImages} large image(s) detected (affects page speed)`);
    }
  }
  
  return warnings;
}

/**
 * Analyze content quality (premium feature)
 */
function analyzeContentQuality($) {
  const bodyText = $('body').text();
  const wordCount = bodyText.split(/\s+/).length;
  const headingCount = $('h1, h2, h3, h4, h5, h6').length;
  const paragraphCount = $('p').length;
  
  return {
    wordCount,
    headingCount,
    paragraphCount,
    hasSubheadings: headingCount > 1,
    contentDensity: wordCount > 300 ? 'good' : wordCount > 150 ? 'fair' : 'low'
  };
}

/**
 * Calculate accessibility score (premium feature)
 */
function calculateAccessibilityScore(seoData) {
  let score = 100;
  let issues = [];
  
  if (!seoData.lang) {
    score -= 10;
    issues.push('Missing language attribute');
  }
  if (seoData.images?.withoutAlt > 0) {
    const altCoverage = seoData.images?.altCoverage || 0;
    score -= (100 - altCoverage) * 0.3;
    issues.push(`${seoData.images.withoutAlt} images missing alt text`);
  }
  if (!seoData.headings?.h1 || seoData.headings.h1.length === 0) {
    score -= 15;
    issues.push('Missing H1 heading');
  }
  
  return {
    score: Math.max(0, Math.round(score)),
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
    issues
  };
}

/**
 * Analyze mobile optimization (premium feature)
 */
function analyzeMobileOptimization(seoData, $) {
  const hasViewport = !!seoData.viewport;
  const hasResponsiveMeta = seoData.viewport?.includes('width=device-width');
  const imageCount = seoData.images?.total || 0;
  const responsiveImages = $('img[srcset], img[sizes]').length;
  
  return {
    hasViewport,
    hasResponsiveMeta,
    imageCount,
    responsiveImages,
    responsiveImageRatio: imageCount > 0 ? (responsiveImages / imageCount) * 100 : 0,
    mobileFriendly: hasViewport && hasResponsiveMeta
  };
}

/**
 * Analyze semantic HTML usage (premium feature)
 */
function analyzeSemanticHTML($) {
  const semanticElements = {
    header: $('header').length,
    nav: $('nav').length,
    main: $('main').length,
    article: $('article').length,
    section: $('section').length,
    aside: $('aside').length,
    footer: $('footer').length
  };
  
  const totalSemantic = Object.values(semanticElements).reduce((a, b) => a + b, 0);
  
  return {
    elements: semanticElements,
    totalSemantic,
    hasSemanticStructure: totalSemantic > 0,
    score: totalSemantic >= 3 ? 'good' : totalSemantic >= 1 ? 'fair' : 'poor'
  };
}

module.exports = { analyzeSEO };

