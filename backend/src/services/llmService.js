const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini Model Configuration
 * Model: gemini-2.5-flash (ONLY)
 * - Latest, fastest, most cost-effective
 * - Free tier: 60 requests/minute
 * - Used for all Gemini-based analysis
 */

// Predefined prompts for MVP
const PROMPT_TEMPLATES = [
  {
    id: 'brand-knowledge',
    template: 'Describe what the brand {brand} is, based only on what you already know. What type of entity is it, what does it do, and how would an AI categorize it?',
    category: 'brand-awareness'
  },
  {
    id: 'website-understanding',
    template: 'Explain what someone would understand about {brand} from visiting {domain}. Summarize the mission, audience, and main offering.',
    category: 'website-analysis'
  },
  {
    id: 'authoritative-sources',
    template: 'If someone asked where to find reliable, official information about {brand}, what sources would you recommend? Explain why these sources appear authoritative.',
    category: 'citation-capture'
  }
];

/**
 * Analyzes LLM visibility for a given URL
 * @param {string} url - The URL to analyze
 * @param {Object} options - Analysis options
 * @param {boolean} options.isPremium - Whether user is premium
 * @param {Object} options.businessInfo - Business information for context-based prompts
 * @param {string} options.businessInfo.brandName - Brand name
 * @param {string} options.businessInfo.industry - Industry
 * @param {string} options.businessInfo.brandSummary - Brand summary
 * @returns {Promise<Object>} LLM visibility data
 */
async function analyzeLLMVisibility(url, options = {}) {
  const { isPremium = false, businessInfo = {} } = options;
  const domain = extractDomain(url);
  const brand = extractBrand(domain);
  const topic = guessTopic(brand);
  
  const results = [];
  let totalScore = 0;
  let totalTokens = 0;
  
  console.log(`🤖 Starting LLM analysis for: ${domain}${isPremium ? ' (Premium)' : ''}`);
  
  // For premium users, generate context-based prompts
  let promptsToUse = PROMPT_TEMPLATES;
  if (isPremium && businessInfo) {
    try {
      const { generateBusinessPrompts } = require('./promptGenerationService');
      const customPrompts = await generateBusinessPrompts({
        brandName: businessInfo.brandName || brand,
        industry: businessInfo.industry || topic,
        brandSummary: businessInfo.brandSummary || '',
        url: url
      });
      
      // Convert to prompt template format
      promptsToUse = customPrompts.map((prompt, index) => ({
        id: `custom-${index + 1}`,
        template: prompt,
        category: 'custom'
      }));
      console.log(`  📝 Generated ${promptsToUse.length} context-based prompts for premium user`);
    } catch (error) {
      // This is non-fatal - we fall back to default prompts
      if (process.env.NODE_ENV === 'development') {
        console.warn(`  ⚠️ Failed to generate custom prompts (using defaults): ${error.message}`);
      }
    }
  }
  
  for (const promptTemplate of promptsToUse) {
    try {
      // Replace variables in prompt
      const prompt = promptTemplate.template
        .replace('{domain}', domain)
        .replace('{brand}', brand)
        .replace('{topic}', topic);
      
      console.log(`  📝 Prompt: ${promptTemplate.id}`);
      
      // For premium users, use multi-LLM analysis (3 models)
      let analysisResult;
      if (isPremium) {
        try {
          const { analyzeWithMultipleLLMs } = require('./multiLLMService');
          const multiLLMResult = await analyzeWithMultipleLLMs(prompt, domain);
          
          // Aggregate results from 3 LLMs (Gemini + 2 OpenRouter models)
          const llmResults = [];
          if (multiLLMResult.gemini) {
            llmResults.push({ provider: 'gemini', ...multiLLMResult.gemini });
          }
          if (multiLLMResult.openrouter1) {
            llmResults.push({ provider: 'openrouter1', ...multiLLMResult.openrouter1 });
          }
          if (multiLLMResult.openrouter2) {
            llmResults.push({ provider: 'openrouter2', ...multiLLMResult.openrouter2 });
          }
          
          // Use Gemini as primary response, aggregate citations from all
          const primaryResponse = multiLLMResult.gemini || multiLLMResult.openrouter1 || multiLLMResult.openrouter2 || {};
          const allCitations = [
            ...(multiLLMResult.gemini?.citations || []),
            ...(multiLLMResult.openrouter1?.citations || []),
            ...(multiLLMResult.openrouter2?.citations || [])
          ];
          const uniqueCitations = [...new Set(allCitations)];
          
          analysisResult = {
            response: JSON.stringify(primaryResponse),
            parsedResponse: primaryResponse,
            citations: uniqueCitations,
            mentioned: uniqueCitations.length > 0 || primaryResponse.mentionsDomain || false,
            llmResults: llmResults,
            tokensUsed: Math.ceil((prompt.length + JSON.stringify(primaryResponse).length) / 4)
          };
        } catch (multiLLMError) {
          // This is non-fatal - we fall back to single model
          if (process.env.NODE_ENV === 'development') {
            console.warn(`  ⚠️ Multi-LLM analysis failed, falling back to single model: ${multiLLMError.message}`);
          }
          // Fall through to single model analysis
          analysisResult = null;
        }
      }
      
      // Single model analysis (free users or fallback)
      if (!analysisResult) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const fullPrompt = `You are a helpful assistant providing factual information about websites and companies. 

IMPORTANT: Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just pure JSON):
{
  "description": "Brief description or answer to the question",
  "citations": ["url1", "url2"],
  "mentionsDomain": true or false,
  "reasoning": "Brief explanation of your response"
}

Include specific URLs in the citations array when relevant. If you mention the domain ${domain} or any of its pages, set mentionsDomain to true.

Question: ${prompt}`;
        
        // Retry logic for 503 errors (service unavailable)
        let result;
        let lastError;
        const maxRetries = 3;
        const baseDelay = 1000; // Start with 1 second
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            result = await model.generateContent(fullPrompt);
            lastError = null;
            break; // Success, exit retry loop
          } catch (error) {
            lastError = error;
            const is503Error = error.message?.includes('503') || 
                             error.message?.includes('Service Unavailable') ||
                             error.message?.includes('overloaded');
            
            if (is503Error && attempt < maxRetries - 1) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = baseDelay * Math.pow(2, attempt);
              console.log(`  ⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
              await sleep(delay);
              continue;
            } else {
              // Not a 503 error or max retries reached
              throw error;
            }
          }
        }
        
        if (!result) {
          throw lastError || new Error('Failed to get response after retries');
        }
        let responseText = result.response.text();
        
        // Clean up response - remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to parse JSON response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.warn(`  ⚠️ JSON parse failed, using text fallback: ${parseError.message}`);
          parsedResponse = null;
        }
        
        const tokensUsed = Math.ceil((fullPrompt.length + responseText.length) / 4);
        const analysis = analyzeResponse(responseText, domain, parsedResponse);
        
        analysisResult = {
          response: responseText,
          parsedResponse: parsedResponse,
          citations: analysis.citations,
          mentioned: analysis.mentioned,
          tokensUsed: tokensUsed
        };
      }
      
      totalTokens += analysisResult.tokensUsed;
      
      // Analyze response
      const analysis = analyzeResponse(analysisResult.response, domain, analysisResult.parsedResponse);
      
      // If no citations found, get recommendations (only for premium users - will be filtered later)
      let recommendations = [];
      if (analysis.citations.length === 0 && !analysis.mentioned) {
        try {
          recommendations = await getRecommendations(domain, brand, promptTemplate.id);
        } catch (recError) {
          console.warn(`  ⚠️ Failed to get recommendations: ${recError.message}`);
        }
      }
      
      results.push({
        promptId: promptTemplate.id,
        prompt: prompt,
        response: analysisResult.response,
        parsedResponse: analysisResult.parsedResponse,
        domainMentioned: analysis.mentioned,
        score: analysis.score,
        citations: analysis.citations,
        recommendations: recommendations,
        confidence: analysis.confidence,
        tokensUsed: analysisResult.tokensUsed,
        ...(isPremium && analysisResult.llmResults ? { multiLLMResults: analysisResult.llmResults } : {})
      });
      
      totalScore += analysis.score;
      
      console.log(`  ✓ Score: ${analysis.score}/3 | Mentioned: ${analysis.mentioned}${isPremium ? ' (Multi-LLM)' : ''}`);
      
      // Rate limiting: wait 500ms between requests
      await sleep(500);
      
    } catch (error) {
      // Log as warning since we continue with other prompts - this is non-fatal
      if (process.env.NODE_ENV === 'development') {
        console.warn(`  ⚠️ LLM call failed for prompt ${promptTemplate.id} (continuing): ${error.message}`);
      }
      
      results.push({
        promptId: promptTemplate.id,
        prompt: promptTemplate.template,
        response: null,
        domainMentioned: false,
        score: 0,
        citations: [],
        confidence: 'low',
        tokensUsed: 0,
        error: error.message
      });
    }
  }
  
  const maxScore = promptsToUse.length * 3;
  const percentage = Math.round((totalScore / maxScore) * 100);
  
  console.log(`✅ LLM Analysis Complete: ${totalScore}/${maxScore} (${percentage}%)${isPremium ? ' (Premium)' : ''}`);
  console.log(`📊 Total tokens used (estimated): ${totalTokens}`);
  
  return {
    totalScore,
    maxScore,
    percentage,
    details: results,
    isPremium: isPremium,
    metadata: {
      totalTokens,
      estimatedCost: (totalTokens / 1000) * 0.0005, // Rough estimate for Gemini Pro (free tier available)
      promptsUsed: promptsToUse.length,
      multiLLMEnabled: isPremium
    }
  };
}

/**
 * Analyzes if and how a domain is mentioned in LLM response
 */
function analyzeResponse(response, domain, parsedResponse = null) {
  const normalizedDomain = normalizeDomain(domain);
  const responseLower = response.toLowerCase();
  
  let citations = [];
  let mentioned = false;
  
  // If we have parsed JSON, use it
  if (parsedResponse && typeof parsedResponse === 'object') {
    // Extract citations from JSON
    if (Array.isArray(parsedResponse.citations)) {
      citations = parsedResponse.citations.filter(url => {
        if (typeof url !== 'string') return false;
        const urlDomain = normalizeDomain(url);
        return urlDomain.includes(normalizedDomain) || normalizedDomain.includes(urlDomain);
      });
    }
    
    // Check mentionsDomain flag
    if (parsedResponse.mentionsDomain === true) {
      mentioned = true;
    }
    
    // Also check description text
    if (parsedResponse.description) {
      const descLower = parsedResponse.description.toLowerCase();
      const domainVariants = [
        normalizedDomain,
        `www.${normalizedDomain}`,
        normalizedDomain.replace(/\./g, ' '),
        normalizedDomain.replace(/\./g, ' dot ')
      ];
      if (domainVariants.some(variant => descLower.includes(variant))) {
        mentioned = true;
      }
    }
  } else {
    // Fallback: parse from plain text
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const urls = response.match(urlRegex) || [];
    citations = urls.filter(url => 
      normalizeDomain(url).includes(normalizedDomain)
    );
    
    // Check for domain mentions
    const domainVariants = [
      normalizedDomain,
      `www.${normalizedDomain}`,
      normalizedDomain.replace(/\./g, ' '),
      normalizedDomain.replace(/\./g, ' dot ')
    ];
    
    mentioned = domainVariants.some(variant => 
      responseLower.includes(variant)
    );
  }
  
  // Scoring logic
  let score = 0;
  let confidence = 'low';
  
  if (citations.length > 0) {
    // Explicit citation found (highest value)
    score = 3;
    confidence = 'high';
  } else if (mentioned) {
    // Domain mentioned but no direct link
    score = 2;
    confidence = 'medium';
    
    // Check if it's in the first sentence (higher value)
    const firstSentence = response.split(/[.!?]/)[0];
    if (firstSentence.toLowerCase().includes(normalizedDomain)) {
      score = 2.5;
    }
  } else {
    // Not mentioned
    score = 0;
    confidence = 'low';
  }
  
  return {
    mentioned,
    score: Math.round(score),
    citations,
    confidence
  };
}

/**
 * Get recommendations when citations are missing
 */
async function getRecommendations(domain, brand, promptId) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const recommendationPrompt = `Based on your analysis of ${brand} (${domain}), provide 3-5 specific, actionable recommendations to improve their visibility in AI search results. Focus on:
1. Content improvements
2. Technical SEO enhancements
3. Authority building strategies
4. Citation opportunities

Respond in JSON format:
{
  "recommendations": [
    {"title": "Recommendation title", "description": "Detailed explanation", "priority": "high|medium|low"},
    ...
  ]
}`;
    
    const result = await model.generateContent(recommendationPrompt);
    let responseText = result.response.text();
    
    // Clean up response
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(responseText);
      return parsed.recommendations || [];
    } catch (parseError) {
      // Fallback: extract recommendations from text
      const lines = responseText.split('\n').filter(line => 
        line.trim().length > 0 && 
        (line.match(/^\d+\./) || line.match(/^[-*]/))
      );
      return lines.slice(0, 5).map((line, idx) => ({
        title: `Recommendation ${idx + 1}`,
        description: line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim(),
        priority: 'medium'
      }));
    }
  } catch (error) {
    console.error(`Recommendation generation failed: ${error.message}`);
    return [];
  }
}

/**
 * Extract clean domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

/**
 * Extract brand name from domain
 */
function extractBrand(domain) {
  // Remove TLD and capitalize
  const brand = domain.split('.')[0];
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/**
 * Guess topic from brand (simple heuristic)
 */
function guessTopic(brand) {
  // TODO: Could use GPT to infer topic, but for MVP just use brand
  return `${brand} and similar services`;
}

/**
 * Normalize domain for comparison
 */
function normalizeDomain(domain) {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '')
    .split('/')[0];
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { analyzeLLMVisibility };

