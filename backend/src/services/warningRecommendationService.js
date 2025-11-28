/**
 * Warning Recommendation Service
 * Generates detailed AI recommendations for specific SEO warnings
 */

const axios = require('axios');
const { getHealthyModels, isModelHealthy } = require('./modelHealthCheckService');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model priority list (will skip unhealthy models)
// Based on health check: 7/18 models are healthy
// Working OpenRouter models: mistral, deepseek-chimera, sherlock-dash, sherlock-think, kat-coder
// Working HuggingFace models: BGE (embeddings model, not for text generation)
// Removed: gemini-exp (deprecated), deepseek-r1 (deprecated), qwen-coder (deprecated)
// Removed: All other HuggingFace models (404 - not available on router endpoint)
const MODEL_PRIORITY = [
  // Working OpenRouter models (fastest first, based on response times)
  'openrouter/sherlock-dash-alpha', // ~1261ms - Fastest
  'mistralai/mistral-7b-instruct:free', // ~2765ms
  'openrouter/sherlock-think-alpha', // ~2545ms
  'kwaipilot/kat-coder-pro:free', // ~2226ms
  'tngtech/deepseek-r1t2-chimera:free' // ~19186ms - Slowest but reliable
  // Note: HuggingFace BGE is working but it's an embeddings model, not suitable for text generation
  // All other HuggingFace text generation models return 404 on router endpoint
];

/**
 * Generate detailed recommendation for a specific SEO warning
 * @param {string} warning - The SEO warning message
 * @param {Object} context - Additional context about the website
 * @returns {Promise<Object>} Detailed recommendation
 */
async function generateWarningRecommendation(warning, context = {}) {
  if (!OPENROUTER_API_KEY) {
    console.warn('⚠️ OPENROUTER_API_KEY not set, using fallback recommendations');
    return getFallbackRecommendation(warning);
  }
  
  // Find a healthy model to use
  let selectedModel = null;
  for (const modelName of MODEL_PRIORITY) {
    if (isModelHealthy(modelName)) {
      selectedModel = modelName;
      break;
    }
  }
  
  // If no healthy model found, try the first one anyway (will fail gracefully)
  if (!selectedModel) {
    selectedModel = MODEL_PRIORITY[0];
    console.warn(`⚠️ No healthy models found in cache, trying ${selectedModel}`);
  }
  
  console.log(`🤖 Generating recommendation for: "${warning}"`);
  console.log(`📊 Using model: ${selectedModel}`);
  
  const prompt = `As an SEO expert, provide a detailed, actionable recommendation for the following SEO issue:

Issue: "${warning}"
${context.brandName ? `Brand: ${context.brandName}` : ''}
${context.industry ? `Industry: ${context.industry}` : ''}

Provide your response in the following JSON format:
{
  "summary": "Brief 1-2 sentence summary of why this matters",
  "impact": "Explain the impact on SEO and user experience",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "resources": ["Resource or tool 1", "Resource or tool 2"],
  "timeEstimate": "Estimated time to fix (e.g., '15 minutes', '1-2 hours')"
}

Be specific, actionable, and concise.`;

  // Try each model with retry logic for 429 errors
  for (const modelName of MODEL_PRIORITY) {
    try {
      const response = await tryModelRequest(modelName, prompt);
      
      if (response) {
        console.log(`✅ Recommendation generated successfully with ${modelName}`);
        
        let responseText = response.data.choices[0].message.content.trim();
        
        // Clean up markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
          const parsed = JSON.parse(responseText);
          return {
            ...parsed,
            model: modelName,
            warning: warning
          };
        } catch (parseError) {
          console.warn('⚠️ Failed to parse JSON, using fallback');
          return getFallbackRecommendation(warning);
        }
      }
    } catch (error) {
      const is429 = error.response?.status === 429 || 
                    error.message?.includes('429') ||
                    error.message?.includes('rate limit');
      
      if (is429) {
        console.warn(`⚠️ Rate limit hit for ${modelName}, trying next model...`);
        // Continue to next model
        continue;
      } else {
        console.error(`❌ Error with ${modelName}:`, error.message);
        // Continue to next model
        continue;
      }
    }
  }
  
  // All models failed, use fallback
  console.warn('⚠️ All models failed, using fallback recommendation');
  return getFallbackRecommendation(warning);
}

/**
 * Try to make a request to a model with retry logic for 429 errors
 */
async function tryModelRequest(modelName, prompt, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': 'OptiSenseAI'
          },
          timeout: 15000
        }
      );
      
      return response;
    } catch (error) {
      const is429 = error.response?.status === 429 || 
                    error.message?.includes('429') ||
                    error.message?.includes('rate limit');
      
      if (is429 && attempt < maxRetries - 1) {
        // Exponential backoff for rate limits: 2s, 4s
        const delay = 2000 * Math.pow(2, attempt);
        console.log(`  ⏳ Rate limited, retrying ${modelName} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        throw error;
      }
    }
  }
  
  return null;
}

/**
 * Get fallback recommendation when AI generation fails
 */
function getFallbackRecommendation(warning) {
  const warningLower = warning.toLowerCase();
  
  // HTTPS warnings
  if (warningLower.includes('https') || warningLower.includes('ssl')) {
    return {
      summary: 'HTTPS is essential for security and SEO rankings.',
      impact: 'Without HTTPS, browsers mark your site as "Not Secure", users lose trust, and search engines may rank you lower.',
      steps: [
        'Purchase or get a free SSL certificate (e.g., Let\'s Encrypt)',
        'Install the certificate on your web server',
        'Update all internal links to use HTTPS',
        'Set up 301 redirects from HTTP to HTTPS',
        'Update your sitemap and submit to Google Search Console'
      ],
      resources: [
        'Let\'s Encrypt - Free SSL certificates',
        'Cloudflare - Free SSL with CDN',
        'Google Search Console - Monitor HTTPS migration'
      ],
      timeEstimate: '1-2 hours',
      model: 'fallback',
      warning: warning
    };
  }
  
  // Title tag warnings
  if (warningLower.includes('title')) {
    return {
      summary: 'Page titles are critical for SEO and appear in search results.',
      impact: 'Missing or poor titles reduce click-through rates and make it harder for search engines to understand your content.',
      steps: [
        'Write a unique, descriptive title (50-60 characters)',
        'Include your primary keyword near the beginning',
        'Add your brand name at the end',
        'Make it compelling to encourage clicks',
        'Test with Google\'s SERP Simulator'
      ],
      resources: [
        'Moz Title Tag Guide',
        'Google SERP Simulator',
        'Yoast SEO Plugin (WordPress)'
      ],
      timeEstimate: '10-15 minutes',
      model: 'fallback',
      warning: warning
    };
  }
  
  // Meta description warnings
  if (warningLower.includes('meta description')) {
    return {
      summary: 'Meta descriptions provide context in search results.',
      impact: 'Good meta descriptions improve click-through rates by 5-15% and help search engines understand your content.',
      steps: [
        'Write a unique description (150-160 characters)',
        'Include your target keywords naturally',
        'Make it compelling and benefit-focused',
        'Add a call-to-action',
        'Avoid duplicate descriptions across pages'
      ],
      resources: [
        'SERP Preview Tool',
        'Screaming Frog - Audit meta descriptions',
        'Google Search Console - Impressions data'
      ],
      timeEstimate: '15-20 minutes',
      model: 'fallback',
      warning: warning
    };
  }
  
  // Images alt text
  if (warningLower.includes('alt') || warningLower.includes('image')) {
    return {
      summary: 'Alt text makes images accessible and improves SEO.',
      impact: 'Missing alt text hurts accessibility, image SEO, and can cost you valuable organic traffic from image search.',
      steps: [
        'Audit all images without alt text',
        'Write descriptive alt text for each image',
        'Include relevant keywords naturally',
        'Keep it concise (125 characters or less)',
        'Don\'t start with "image of" or "picture of"'
      ],
      resources: [
        'WebAIM Alt Text Guide',
        'Google Image SEO Best Practices',
        'Bulk Alt Text Checker Tools'
      ],
      timeEstimate: '30 minutes - 2 hours',
      model: 'fallback',
      warning: warning
    };
  }
  
  // Structured data
  if (warningLower.includes('structured data') || warningLower.includes('schema')) {
    return {
      summary: 'Structured data helps search engines understand your content.',
      impact: 'Schema markup can lead to rich snippets in search results, improving visibility and click-through rates by up to 30%.',
      steps: [
        'Identify appropriate schema types for your content',
        'Use Schema.org markup (JSON-LD format recommended)',
        'Add schema to key pages (homepage, products, articles)',
        'Test with Google\'s Rich Results Test',
        'Monitor in Google Search Console'
      ],
      resources: [
        'Schema.org Documentation',
        'Google Rich Results Test',
        'Schema Markup Generator Tools'
      ],
      timeEstimate: '1-3 hours',
      model: 'fallback',
      warning: warning
    };
  }
  
  // Generic fallback
  return {
    summary: 'This SEO issue needs attention to improve your site\'s performance.',
    impact: 'Addressing this issue will help improve your search visibility and user experience.',
    steps: [
      'Review the issue details carefully',
      'Research best practices for this specific issue',
      'Implement the recommended changes',
      'Test the changes thoroughly',
      'Monitor the impact over time'
    ],
    resources: [
      'Google Search Central Documentation',
      'Moz SEO Guide',
      'Web.dev Best Practices'
    ],
    timeEstimate: '30 minutes - 2 hours',
    model: 'fallback',
    warning: warning
  };
}

module.exports = {
  generateWarningRecommendation
};

