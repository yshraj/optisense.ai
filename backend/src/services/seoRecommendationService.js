/**
 * SEO Recommendation Service for Premium Users
 * Generates actionable SEO recommendations based on analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate SEO recommendations based on analysis results
 * @param {Object} analysisData - Analysis results
 * @param {Object} analysisData.seo - SEO analysis data
 * @param {Object} analysisData.llmVisibility - LLM visibility data
 * @param {string} analysisData.url - Website URL
 * @param {Object} businessInfo - Business information
 * @returns {Promise<Array>} Array of SEO recommendations
 */
async function generateSEORecommendations(analysisData, businessInfo = {}) {
  const { seo, llmVisibility, url } = analysisData;
  const { brandName, industry, brandSummary } = businessInfo;
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Use extracted page text if available (first 5000 chars for context)
    const pageContent = seo.extractedText?.summary 
      ? `\n\nPage Content (first 5000 chars):\n${seo.extractedText.summary.substring(0, 5000)}`
      : '';
    
    const pageContext = seo.extractedText 
      ? `\n\nPage Content Analysis:
- Word Count: ${seo.extractedText.wordCount || 0} words
- Paragraphs: ${seo.extractedText.paragraphs?.length || 0} paragraphs
- Headings: ${seo.extractedText.headings?.length || 0} headings
${pageContent}`
      : '';
    
    const prompt = `Based on the following SEO and AI visibility analysis${pageContent ? ' and the actual page content' : ''}, provide 10-15 specific, actionable SEO recommendations to improve search visibility and AI citation likelihood.

Website: ${url}
Brand: ${brandName || 'Unknown'}
Industry: ${industry || 'General'}

SEO Analysis:
- Title: ${seo.title || 'Missing'}
- Meta Description: ${seo.metaDescription || 'Missing'}
- Warnings: ${seo.warnings?.length || 0} issues found
- Load Time: ${seo.loadTimeMs || 0}ms
- HTTPS: ${seo.isHttps ? 'Yes' : 'No'}
- Structured Data: ${Array.isArray(seo.structuredData) ? seo.structuredData.length : (seo.structuredData?.count || 0)} schemas
- Images Alt Coverage: ${seo.images?.altCoverage || 0}%
${pageContext}
AI Visibility Score: ${llmVisibility.percentage || 0}%
Citations Found: ${llmVisibility.details?.reduce((sum, d) => sum + (d.citations?.length || 0), 0) || 0}

Provide recommendations in JSON format:
{
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed explanation (reference specific content from the page when relevant)",
      "priority": "high|medium|low",
      "category": "technical|content|authority|ai-visibility",
      "actionItems": ["action 1", "action 2"]
    }
  ]
}

Focus on:
1. Technical SEO improvements
2. Content optimization for AI search (use the actual page content to suggest improvements)
3. Authority building strategies
4. Citation opportunities
5. Structured data enhancements
${pageContent ? '6. Content quality improvements based on the actual page text' : ''}`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(responseText);
      return parsed.recommendations || [];
    } catch (parseError) {
      // Fallback: extract from text
      return extractRecommendationsFromText(responseText);
    }
  } catch (error) {
    console.error('SEO recommendation generation failed:', error.message);
    return getDefaultRecommendations(seo, llmVisibility);
  }
}

/**
 * Extract recommendations from plain text
 */
function extractRecommendationsFromText(text) {
  const recommendations = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  let currentRec = null;
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if it's a title (numbered or bulleted)
    if (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/) || trimmed.match(/^[A-Z][^:]+:/)) {
      if (currentRec) {
        recommendations.push(currentRec);
      }
      currentRec = {
        title: trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').split(':')[0].trim(),
        description: trimmed.split(':').slice(1).join(':').trim() || trimmed,
        priority: 'medium',
        category: 'general',
        actionItems: []
      };
    } else if (currentRec && trimmed.length > 10) {
      // Add to description
      currentRec.description += ' ' + trimmed;
    }
  }
  
  if (currentRec) {
    recommendations.push(currentRec);
  }
  
  return recommendations.slice(0, 15);
}

/**
 * Get default recommendations based on analysis
 */
function getDefaultRecommendations(seo, llmVisibility) {
  const recommendations = [];
  
  // Technical SEO
  if (!seo.title) {
    recommendations.push({
      title: 'Add a Title Tag',
      description: 'Your website is missing a title tag, which is critical for SEO and AI search visibility.',
      priority: 'high',
      category: 'technical',
      actionItems: ['Add a descriptive title tag (50-60 characters)', 'Include your brand name']
    });
  }
  
  if (!seo.metaDescription) {
    recommendations.push({
      title: 'Add Meta Description',
      description: 'Meta descriptions help search engines and AI understand your content.',
      priority: 'high',
      category: 'content',
      actionItems: ['Write a compelling meta description (150-160 characters)', 'Include key benefits']
    });
  }
  
  if (!seo.isHttps) {
    recommendations.push({
      title: 'Enable HTTPS',
      description: 'HTTPS is required for security and improves search rankings.',
      priority: 'high',
      category: 'technical',
      actionItems: ['Install SSL certificate', 'Redirect HTTP to HTTPS']
    });
  }
  
  // AI Visibility
  if (llmVisibility.percentage < 50) {
    recommendations.push({
      title: 'Improve AI Search Visibility',
      description: 'Your website has low visibility in AI search results. Focus on authority building.',
      priority: 'high',
      category: 'ai-visibility',
      actionItems: ['Build backlinks from authoritative sites', 'Create comprehensive content', 'Get listed in directories']
    });
  }
  
  return recommendations;
}

module.exports = { generateSEORecommendations };

