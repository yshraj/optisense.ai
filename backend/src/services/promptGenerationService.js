/**
 * Prompt Generation Service
 * Uses HuggingFace Inference API to generate business-specific prompts
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generate 10 business-specific prompts for analysis
 * @param {Object} businessInfo - Business information
 * @param {string} businessInfo.brandName - Brand name
 * @param {string} businessInfo.brandSummary - Brand summary (1-2 sentences)
 * @param {string} businessInfo.industry - Industry/topic
 * @param {string} businessInfo.url - Website URL
 * @returns {Promise<Array>} Array of 10 prompts
 */
async function generateBusinessPrompts(businessInfo) {
  const { brandName, brandSummary, industry, url } = businessInfo;
  
  try {
    // Use Gemini to generate context-based prompts
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Generate 10 specific, actionable prompts that would help analyze the AI search visibility of a business. 

Business Information:
- Brand Name: ${brandName || 'Unknown'}
- Industry: ${industry || 'General'}
- Description: ${brandSummary || 'Not provided'}
- Website: ${url || 'Not provided'}

Generate prompts that:
1. Test brand awareness in AI models
2. Check citation likelihood
3. Assess authority and trustworthiness
4. Evaluate competitor positioning
5. Test topic-specific queries

Return ONLY a JSON array of 10 prompt strings, no other text:
["prompt 1", "prompt 2", ...]`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON array
    const jsonMatch = responseText.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const prompts = JSON.parse(jsonMatch[0]);
        if (Array.isArray(prompts) && prompts.length >= 10) {
          console.log(`✅ Generated ${prompts.length} context-based prompts using Gemini`);
          return prompts.slice(0, 10);
        }
      } catch (e) {
        // Fall through to default
      }
    }
    
    // Fallback: extract prompts from text
    const lines = responseText.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 20 && 
             (trimmed.match(/^\d+\./) || trimmed.match(/^[-*]/) || trimmed.startsWith('"'));
    });
    
    if (lines.length >= 10) {
      const extractedPrompts = lines.slice(0, 10).map(line => 
        line.replace(/^\d+\.\s*/, '')
            .replace(/^[-*]\s*/, '')
            .replace(/^["']|["']$/g, '')
            .trim()
      );
      console.log(`✅ Extracted ${extractedPrompts.length} prompts from Gemini response`);
      return extractedPrompts;
    }
    
    // If all else fails, use defaults
    console.log('⚠️ Using default prompts (AI generation failed)');
    return getDefaultPrompts(brandName, industry);
    
  } catch (error) {
    // Log as warning since we have a fallback - this is non-fatal
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Prompt generation failed (using defaults): ${error.message}`);
    }
    // Fallback to default prompts
    return getDefaultPrompts(brandName, industry);
  }
}

/**
 * Get default prompts if generation fails
 */
function getDefaultPrompts(brandName, industry) {
  const industryContext = industry ? ` in the ${industry} industry` : '';
  
  return [
    `Describe what the brand ${brandName} is${industryContext}. What type of entity is it, what does it do, and how would an AI categorize it?`,
    `Explain what someone would understand about ${brandName} from visiting their website. Summarize the mission, audience, and main offering.`,
    `If someone asked where to find reliable, official information about ${brandName}, what sources would you recommend? Explain why these sources appear authoritative.`,
    `What are the top 5 websites${industryContext}? List them with brief descriptions and explain why they are considered authoritative.`,
    `How would you describe ${brandName}'s position${industryContext}? What makes them stand out or unique?`,
    `If someone searched for "${industry || 'services'} like ${brandName}", what would you recommend?`,
    `What are the key features or benefits that ${brandName} offers${industryContext}?`,
    `Who is the target audience for ${brandName}${industryContext}?`,
    `What problems does ${brandName} solve${industryContext}?`,
    `How would you compare ${brandName} to other similar businesses${industryContext}?`
  ];
}

module.exports = { generateBusinessPrompts };

