/**
 * Model Health Check Service
 * Tests all available models and tracks their health status
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Model configurations
const MODELS = {
  gemini: {
    name: 'gemini-2.5-flash',
    provider: 'google',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  geminiExp: {
    name: 'google/gemini-2.0-flash-exp:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // Internal Server Error, not reliable
  },
  huggingfaceQwen: {
    name: 'Qwen/Qwen2.5-7B-Instruct',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // Mark as deprecated
  },
  huggingfaceGemma: {
    name: 'google/gemma-2-9b-it',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // Mark as deprecated
  },
  huggingfaceLlama: {
    name: 'meta-llama/Llama-3.1-8B-Instruct',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  huggingfaceMistral7B: {
    name: 'mistralai/Mistral-7B-Instruct-v0.3',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  huggingfaceMixtral: {
    name: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  huggingfaceLayoutLM: {
    name: 'microsoft/layoutlmv3-base',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  huggingfaceDistilBERT: {
    name: 'distilbert/distilbert-base-uncased',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  huggingfaceBGE: {
    name: 'BAAI/bge-large-en-v1.5',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  huggingfaceFlanT5: {
    name: 'google/flan-t5-base',
    provider: 'huggingface',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // 404 - Not available on router endpoint
  },
  openrouterDeepSeek: {
    name: 'deepseek/deepseek-r1:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // Rate limited, not reliable
  },
  openrouterMistral: {
    name: 'mistralai/mistral-7b-instruct:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  openrouterQwenCoder: {
    name: 'qwen/qwen3-coder:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}',
    deprecated: true // Rate limited, not reliable
  },
  openrouterDeepSeekChimera: {
    name: 'tngtech/deepseek-r1t2-chimera:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  openrouterSherlockDash: {
    name: 'openrouter/sherlock-dash-alpha',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  openrouterSherlockThink: {
    name: 'openrouter/sherlock-think-alpha',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  },
  openrouterKatCoder: {
    name: 'kwaipilot/kat-coder-pro:free',
    provider: 'openrouter',
    free: true,
    testPrompt: 'Say "OK" in JSON format: {"status": "ok"}'
  }
};

// Health status cache (in-memory, resets on server restart)
const healthStatus = {
  lastChecked: null,
  models: {}
};

/**
 * Test a Gemini model
 */
async function testGeminiModel(modelName) {
  if (!GEMINI_API_KEY) {
    return { healthy: false, error: 'API key not configured' };
  }

  try {
    const startTime = Date.now();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const testPrompt = MODELS.gemini.testPrompt;
    const result = await model.generateContent(testPrompt);
    const response = result.response.text();
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
      response: response.substring(0, 100)
    };
  } catch (error) {
    const is429 = error.message?.includes('429') || 
                  error.message?.includes('rate limit') ||
                  error.message?.includes('quota');
    
    return {
      healthy: false,
      error: error.message,
      isRateLimit: is429,
      retryAfter: is429 ? 60 : null // Suggest 60s wait for rate limits
    };
  }
}

/**
 * Test a HuggingFace model
 */
async function testHuggingFaceModel(modelName) {
  if (!HUGGINGFACE_API_KEY) {
    return { healthy: false, error: 'API key not configured' };
  }

  try {
    const startTime = Date.now();
    
    // Use the new HuggingFace Router API endpoint (old endpoint deprecated with 410)
    // Try multiple endpoint formats as fallback
    const endpoints = [
      `https://router.huggingface.co/hf-inference/models/${modelName}`, // Format 1: /hf-inference/models/{model}
      `https://router.huggingface.co/hf-inference/${modelName}`, // Format 2: /hf-inference/{model}
      `https://router.huggingface.co/models/${modelName}` // Format 3: /models/{model}
    ];
    
    // Use BGE model's test prompt (only working HuggingFace model)
    const testPrompt = MODELS.huggingfaceBGE?.testPrompt ||
                       'Say "OK" in JSON format: {"status": "ok"}';
    
    // Try each endpoint format, with retries for 503 (model loading) errors
    let response;
    let lastError;
    const maxRetries = 2;
    
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await axios.post(
            endpoint,
          {
            inputs: testPrompt,
            parameters: {
              max_new_tokens: 50,
              temperature: 0.7,
              return_full_text: false
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // Increased timeout for HuggingFace models
          }
        );
          break; // Success, exit both loops
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          // If 503 (model loading), wait and retry same endpoint
          if (status === 503 && attempt < maxRetries) {
            const waitTime = (attempt + 1) * 5000; // 5s, 10s
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry same endpoint
          }
          // If 410 (Gone) or 404, try next endpoint format
          if (status === 410 || status === 404) {
            break; // Try next endpoint format
          }
          // If 401/403, don't try other endpoints (auth issue)
          if (status === 401 || status === 403) {
            throw error;
          }
          // For other errors, try next endpoint if not last attempt
          if (endpoints.indexOf(endpoint) < endpoints.length - 1) {
            break; // Try next endpoint
          }
          throw error; // Last endpoint failed
        }
      }
      if (response) break; // Success, exit outer loop
    }
    
    if (!response) {
      throw lastError || new Error('All HuggingFace router endpoint formats failed');
    }
    
    const responseTime = Date.now() - startTime;
    const text = response.data[0]?.generated_text || '';
    
    return {
      healthy: true,
      responseTime,
      response: text.substring(0, 100)
    };
  } catch (error) {
    const statusCode = error.response?.status;
    const responseData = error.response?.data;
    const is429 = statusCode === 429 || 
                  error.message?.includes('429') ||
                  error.message?.includes('rate limit');
    
    // Check for various error conditions
    const is404 = statusCode === 404;
    const is403 = statusCode === 403;
    const is401 = statusCode === 401;
    const is410 = statusCode === 410; // Gone (deprecated endpoint)
    const is503 = statusCode === 503; // Model loading
    
    // Check for deprecated endpoint messages
    const errorText = JSON.stringify(responseData || {}) + ' ' + error.message;
    const isDeprecated = is410 || // 410 Gone means endpoint is deprecated
                         errorText.includes('no longer supported') ||
                         errorText.includes('deprecated') ||
                         errorText.includes('Gone');
    
    // Build error message with actual details
    let errorMessage;
    if (is410) {
      errorMessage = 'Endpoint deprecated (410 Gone) - Using new router endpoint';
    } else if (is401) {
      errorMessage = 'Unauthorized - Check HUGGINGFACE_API_KEY';
    } else if (is403) {
      errorMessage = 'Forbidden - API key may not have access to this model';
    } else if (is404) {
      errorMessage = `Model not found (404) - Model: ${modelName}`;
    } else if (is503) {
      errorMessage = 'Model is loading - Please wait and retry';
    } else if (is429) {
      errorMessage = 'Rate limited - Please wait before retrying';
    } else if (isDeprecated) {
      errorMessage = 'HuggingFace endpoint deprecated. Please check HuggingFace API documentation.';
    } else if (responseData?.error) {
      errorMessage = responseData.error;
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = `Unknown error (Status: ${statusCode || 'N/A'})`;
    }
    
    // Log detailed error for debugging
    if (process.env.DEBUG_MODELS === 'true') {
      console.error(`HuggingFace Error for ${modelName}:`, {
        status: statusCode,
        error: responseData,
        message: error.message
      });
    }
    
    return {
      healthy: false,
      error: errorMessage,
      isRateLimit: is429,
      isDeprecated: isDeprecated || is404, // Treat 404 as deprecated
      retryAfter: is429 ? 60 : null,
      statusCode: statusCode
    };
  }
}

/**
 * Test an OpenRouter model
 */
async function testOpenRouterModel(modelName) {
  if (!OPENROUTER_API_KEY) {
    return { healthy: false, error: 'API key not configured' };
  }

  try {
    const startTime = Date.now();
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: MODELS.openrouterDeepSeek.testPrompt
          }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5000',
          'X-Title': 'OptiSenseAI'
        },
        timeout: 15000
      }
    );
    
    const responseTime = Date.now() - startTime;
    const content = response.data.choices[0]?.message?.content || '';
    
    return {
      healthy: true,
      responseTime,
      response: content.substring(0, 100)
    };
  } catch (error) {
    const is429 = error.response?.status === 429 || 
                  error.message?.includes('429') ||
                  error.message?.includes('rate limit');
    
    return {
      healthy: false,
      error: error.response?.data?.error?.message || error.message,
      isRateLimit: is429,
      retryAfter: is429 ? 60 : null
    };
  }
}

/**
 * Test all models and update health status
 */
async function checkAllModels() {
  console.log('🔍 Starting model health check...');
  const results = {};
  
  // Test Gemini
  if (GEMINI_API_KEY) {
    console.log('  Testing Gemini...');
    results.gemini = await testGeminiModel(MODELS.gemini.name);
  } else {
    results.gemini = { healthy: false, error: 'API key not configured' };
  }
  
  // Test HuggingFace models
  if (HUGGINGFACE_API_KEY) {
    // Test deprecated models (skip if marked deprecated)
    if (!MODELS.huggingfaceQwen.deprecated) {
      console.log('  Testing HuggingFace Qwen...');
      results.huggingfaceQwen = await testHuggingFaceModel(MODELS.huggingfaceQwen.name);
    } else {
      results.huggingfaceQwen = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.huggingfaceGemma.deprecated) {
      console.log('  Testing HuggingFace Gemma...');
      results.huggingfaceGemma = await testHuggingFaceModel(MODELS.huggingfaceGemma.name);
    } else {
      results.huggingfaceGemma = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    // Test new HuggingFace models (skip deprecated ones)
    if (!MODELS.huggingfaceLlama.deprecated) {
      console.log('  Testing HuggingFace Llama 3.1...');
      results.huggingfaceLlama = await testHuggingFaceModel(MODELS.huggingfaceLlama.name);
    } else {
      results.huggingfaceLlama = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.huggingfaceMistral7B.deprecated) {
      console.log('  Testing HuggingFace Mistral 7B...');
      results.huggingfaceMistral7B = await testHuggingFaceModel(MODELS.huggingfaceMistral7B.name);
    } else {
      results.huggingfaceMistral7B = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.huggingfaceMixtral.deprecated) {
      console.log('  Testing HuggingFace Mixtral...');
      results.huggingfaceMixtral = await testHuggingFaceModel(MODELS.huggingfaceMixtral.name);
    } else {
      results.huggingfaceMixtral = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.huggingfaceLayoutLM.deprecated) {
      console.log('  Testing HuggingFace LayoutLM...');
      results.huggingfaceLayoutLM = await testHuggingFaceModel(MODELS.huggingfaceLayoutLM.name);
    } else {
      results.huggingfaceLayoutLM = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.huggingfaceDistilBERT.deprecated) {
      console.log('  Testing HuggingFace DistilBERT...');
      results.huggingfaceDistilBERT = await testHuggingFaceModel(MODELS.huggingfaceDistilBERT.name);
    } else {
      results.huggingfaceDistilBERT = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    console.log('  Testing HuggingFace BGE Large...');
    results.huggingfaceBGE = await testHuggingFaceModel(MODELS.huggingfaceBGE.name);
    
    if (!MODELS.huggingfaceFlanT5.deprecated) {
      console.log('  Testing HuggingFace Flan-T5...');
      results.huggingfaceFlanT5 = await testHuggingFaceModel(MODELS.huggingfaceFlanT5.name);
    } else {
      results.huggingfaceFlanT5 = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
  } else {
    results.huggingfaceQwen = { healthy: false, error: 'API key not configured' };
    results.huggingfaceGemma = { healthy: false, error: 'API key not configured' };
    results.huggingfaceLlama = { healthy: false, error: 'API key not configured' };
    results.huggingfaceMistral7B = { healthy: false, error: 'API key not configured' };
    results.huggingfaceMixtral = { healthy: false, error: 'API key not configured' };
    results.huggingfaceLayoutLM = { healthy: false, error: 'API key not configured' };
    results.huggingfaceDistilBERT = { healthy: false, error: 'API key not configured' };
    results.huggingfaceBGE = { healthy: false, error: 'API key not configured' };
    results.huggingfaceFlanT5 = { healthy: false, error: 'API key not configured' };
  }
  
  // Test OpenRouter models (skip deprecated ones)
  if (OPENROUTER_API_KEY) {
    // Skip deprecated models
    if (!MODELS.geminiExp.deprecated) {
      console.log('  Testing OpenRouter Gemini Exp...');
      results.geminiExp = await testOpenRouterModel(MODELS.geminiExp.name);
    } else {
      results.geminiExp = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.openrouterDeepSeek.deprecated) {
      console.log('  Testing OpenRouter DeepSeek...');
      results.openrouterDeepSeek = await testOpenRouterModel(MODELS.openrouterDeepSeek.name);
    } else {
      results.openrouterDeepSeek = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    if (!MODELS.openrouterQwenCoder.deprecated) {
      console.log('  Testing OpenRouter Qwen Coder...');
      results.openrouterQwenCoder = await testOpenRouterModel(MODELS.openrouterQwenCoder.name);
    } else {
      results.openrouterQwenCoder = { healthy: false, error: 'Model deprecated', deprecated: true };
    }
    
    // Test working models
    console.log('  Testing OpenRouter Mistral...');
    results.openrouterMistral = await testOpenRouterModel(MODELS.openrouterMistral.name);
    
    console.log('  Testing OpenRouter DeepSeek Chimera...');
    results.openrouterDeepSeekChimera = await testOpenRouterModel(MODELS.openrouterDeepSeekChimera.name);
    
    console.log('  Testing OpenRouter Sherlock Dash...');
    results.openrouterSherlockDash = await testOpenRouterModel(MODELS.openrouterSherlockDash.name);
    
    console.log('  Testing OpenRouter Sherlock Think...');
    results.openrouterSherlockThink = await testOpenRouterModel(MODELS.openrouterSherlockThink.name);
    
    console.log('  Testing OpenRouter Kat Coder...');
    results.openrouterKatCoder = await testOpenRouterModel(MODELS.openrouterKatCoder.name);
  } else {
    results.geminiExp = { healthy: false, error: 'API key not configured' };
    results.openrouterDeepSeek = { healthy: false, error: 'API key not configured' };
    results.openrouterMistral = { healthy: false, error: 'API key not configured' };
    results.openrouterQwenCoder = { healthy: false, error: 'API key not configured' };
    results.openrouterDeepSeekChimera = { healthy: false, error: 'API key not configured' };
    results.openrouterSherlockDash = { healthy: false, error: 'API key not configured' };
    results.openrouterSherlockThink = { healthy: false, error: 'API key not configured' };
    results.openrouterKatCoder = { healthy: false, error: 'API key not configured' };
  }
  
  // Update cache
  healthStatus.lastChecked = new Date();
  healthStatus.models = results;
  
  // Log summary
  const healthyCount = Object.values(results).filter(r => r.healthy).length;
  const totalCount = Object.keys(results).length;
  console.log(`✅ Health check complete: ${healthyCount}/${totalCount} models healthy`);
  
  // Log unhealthy models
  Object.entries(results).forEach(([name, result]) => {
    if (!result.healthy) {
      console.log(`  ❌ ${name}: ${result.error}${result.isRateLimit ? ' (Rate Limited)' : ''}`);
    } else {
      console.log(`  ✅ ${name}: OK (${result.responseTime}ms)`);
    }
  });
  
  return results;
}

/**
 * Get current health status
 */
function getHealthStatus() {
  return healthStatus;
}

/**
 * Get list of healthy models for a specific provider
 */
function getHealthyModels(provider = null) {
  const models = healthStatus.models || {};
  const healthy = [];
  
  for (const [name, result] of Object.entries(models)) {
    if (result.healthy) {
      // Find matching model config by key name
      const modelConfig = MODELS[name];
      if (!provider || (modelConfig && modelConfig.provider === provider)) {
        healthy.push({
          name,
          config: modelConfig || { provider: 'unknown' },
          status: result
        });
      }
    }
  }
  
  return healthy;
}

/**
 * Check if a specific model is healthy
 */
function isModelHealthy(modelName) {
  // Check exact match first (by config key)
  if (healthStatus.models[modelName]) {
    return healthStatus.models[modelName].healthy;
  }
  
  // Map full model names to config keys
  // MODEL_PRIORITY uses full names like 'openrouter/sherlock-dash-alpha'
  // but health status uses keys like 'openrouterSherlockDash'
  const modelNameMap = {
    'mistralai/mistral-7b-instruct:free': 'openrouterMistral',
    'openrouter/sherlock-dash-alpha': 'openrouterSherlockDash',
    'openrouter/sherlock-think-alpha': 'openrouterSherlockThink',
    'kwaipilot/kat-coder-pro:free': 'openrouterKatCoder',
    'tngtech/deepseek-r1t2-chimera:free': 'openrouterDeepSeekChimera'
    // Note: All HuggingFace text generation models are deprecated (404)
  };
  
  // Check mapped name
  const mappedKey = modelNameMap[modelName];
  if (mappedKey && healthStatus.models[mappedKey]) {
    return healthStatus.models[mappedKey].healthy;
  }
  
  // Check partial match by model name (e.g., "sherlock-dash" matches "openrouterSherlockDash")
  const normalizedModelName = modelName.toLowerCase().replace(/[\/:]/g, '-');
  for (const [key, config] of Object.entries(MODELS)) {
    if (config.name && config.name.toLowerCase() === modelName.toLowerCase()) {
      if (healthStatus.models[key]) {
        return healthStatus.models[key].healthy;
      }
    }
  }
  
  // Check partial match (e.g., "gemini" matches "gemini-2.5-flash")
  for (const [name, result] of Object.entries(healthStatus.models)) {
    const modelConfig = MODELS[name];
    if (modelConfig && modelConfig.name) {
      if (modelConfig.name.toLowerCase().includes(modelName.toLowerCase()) || 
          modelName.toLowerCase().includes(modelConfig.name.toLowerCase())) {
        return result.healthy;
      }
    }
  }
  
  // If not checked yet, assume healthy (will fail gracefully if not)
  return true;
}

module.exports = {
  checkAllModels,
  getHealthStatus,
  getHealthyModels,
  isModelHealthy,
  testGeminiModel,
  testHuggingFaceModel,
  testOpenRouterModel
};

