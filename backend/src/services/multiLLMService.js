/**
 * Multi-LLM Analysis Service
 * Analyzes using multiple LLMs for premium users
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Analyze with multiple LLMs
 * @param {string} prompt - The prompt to analyze
 * @param {string} domain - Domain to check
 * @returns {Promise<Object>} Results from all LLMs
 */
async function analyzeWithMultipleLLMs(prompt, domain) {
  const results = {
    gemini: null,
    openrouter1: null, // First OpenRouter model (sherlock-dash-alpha)
    openrouter2: null, // Second OpenRouter model (mistral or sherlock-think)
    errors: []
  };
  
  // Run all LLMs in parallel (using only working models)
  const promises = [
    analyzeWithGemini(prompt, domain).catch(err => {
      results.errors.push({ provider: 'gemini', error: err.message });
      return null;
    }),
    analyzeWithOpenRouter(prompt, domain, 'openrouter/sherlock-dash-alpha').catch(err => {
      results.errors.push({ provider: 'openrouter1', error: err.message });
      return null;
    }),
    analyzeWithOpenRouter(prompt, domain, 'mistralai/mistral-7b-instruct:free').catch(err => {
      results.errors.push({ provider: 'openrouter2', error: err.message });
      return null;
    })
  ];
  
  const [geminiResult, openrouter1Result, openrouter2Result] = await Promise.all(promises);
  
  results.gemini = geminiResult;
  results.openrouter1 = openrouter1Result;
  results.openrouter2 = openrouter2Result;
  
  // For backward compatibility, also set openrouter to the first successful result
  results.openrouter = openrouter1Result || openrouter2Result;
  
  return results;
}

/**
 * Analyze with Google Gemini
 */
async function analyzeWithGemini(prompt, domain) {
  try {
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
    
    const result = await model.generateContent(fullPrompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      return { description: responseText, citations: [], mentionsDomain: false };
    }
  } catch (error) {
    throw new Error(`Gemini analysis failed: ${error.message}`);
  }
}

// HuggingFace text generation models are deprecated - removed from multi-LLM analysis
// Using only working models: Gemini + OpenRouter models

/**
 * Analyze with OpenRouter (optional, if API key provided)
 * Uses working free models: sherlock-dash-alpha, mistral-7b-instruct, sherlock-think-alpha, kat-coder-pro
 * @param {string} prompt - The prompt to analyze
 * @param {string} domain - Domain to check
 * @param {string} preferredModel - Optional: specific model to use (otherwise tries multiple)
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeWithOpenRouter(prompt, domain, preferredModel = null) {
  if (!OPENROUTER_API_KEY) {
    return null;
  }
  
  try {
    // Use working models only (deprecated models removed)
    const models = preferredModel 
      ? [preferredModel]
      : [
          'openrouter/sherlock-dash-alpha', // Fastest (~1143ms)
          'mistralai/mistral-7b-instruct:free', // Reliable (~4004ms)
          'openrouter/sherlock-think-alpha', // Good reasoning (~3182ms)
          'kwaipilot/kat-coder-pro:free' // Alternative (~1378ms)
        ];
    
    let response;
    let lastError;
    
    for (const model of models) {
      try {
        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model,
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant providing factual information about websites and companies. Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just pure JSON):
{
  "description": "Brief description or answer to the question",
  "citations": ["url1", "url2"],
  "mentionsDomain": true or false,
  "reasoning": "Brief explanation of your response"
}

Include specific URLs in the citations array when relevant. If you mention the domain ${domain} or any of its pages, set mentionsDomain to true.`
              },
              {
                role: 'user',
                content: `Question about ${domain}: ${prompt}`
              }
            ],
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.APP_URL || 'https://optisenseai.com'
            },
            timeout: 30000
          }
        );
        break; // Success
      } catch (error) {
        lastError = error;
        // If rate limited, try next model
        if (error.response?.status === 429 && models.indexOf(model) < models.length - 1) {
          continue;
        }
        // For other errors, try next model if available
        if (models.indexOf(model) < models.length - 1) {
          continue;
        }
        throw error; // Last model failed
      }
    }
    
    if (!response) {
      throw lastError || new Error('All OpenRouter models failed');
    }
    
    const content = response.data.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Fallback if JSON parsing fails
      parsed = {
        description: content,
        citations: [],
        mentionsDomain: content.toLowerCase().includes(domain.toLowerCase())
      };
    }
    return parsed;
  } catch (error) {
    throw new Error(`OpenRouter analysis failed: ${error.message}`);
  }
}

module.exports = { analyzeWithMultipleLLMs };

