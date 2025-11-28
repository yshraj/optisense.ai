/**
 * Model Health Check Tests
 * Tests all available models to verify they're working
 */

const {
  checkAllModels,
  testGeminiModel,
  testHuggingFaceModel,
  testOpenRouterModel,
  getHealthStatus,
  getHealthyModels
} = require('../../src/services/modelHealthCheckService');

describe('Model Health Check Service', () => {
  jest.setTimeout(60000); // 60 seconds for all tests
  
  describe('checkAllModels', () => {
    it('should check all configured models', async () => {
      const results = await checkAllModels();
      
      expect(results).toBeDefined();
      expect(typeof results).toBe('object');
      
      // Check that we got results for at least some models
      const resultCount = Object.keys(results).length;
      expect(resultCount).toBeGreaterThan(0);
      
      // Log results for debugging
      console.log('\n📊 Model Health Check Results:');
      Object.entries(results).forEach(([name, result]) => {
        if (result.healthy) {
          console.log(`  ✅ ${name}: OK`);
        } else {
          console.log(`  ❌ ${name}: ${result.error}`);
          if (result.isRateLimit) {
            console.log(`     ⚠️  Rate Limited - wait ${result.retryAfter}s`);
          }
        }
      });
    });
  });
  
  describe('Individual Model Tests', () => {
    it('should test Gemini model if API key is configured', async () => {
      if (process.env.GEMINI_API_KEY) {
        const result = await testGeminiModel('gemini-2.5-flash');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`Gemini test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited - this is expected for free tier');
          }
        }
      } else {
        console.log('⚠️  GEMINI_API_KEY not set, skipping test');
      }
    });
    
    it('should test HuggingFace Llama 3.1 model if API key is configured', async () => {
      if (process.env.HUGGINGFACE_API_KEY) {
        const result = await testHuggingFaceModel('meta-llama/Llama-3.1-8B-Instruct');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`HuggingFace Llama 3.1 test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited');
          }
        }
      } else {
        console.log('⚠️  HUGGINGFACE_API_KEY not set, skipping test');
      }
    });
    
    it('should test HuggingFace Mistral 7B model if API key is configured', async () => {
      if (process.env.HUGGINGFACE_API_KEY) {
        const result = await testHuggingFaceModel('mistralai/Mistral-7B-Instruct-v0.3');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`HuggingFace Mistral 7B test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited');
          }
        }
      } else {
        console.log('⚠️  HUGGINGFACE_API_KEY not set, skipping test');
      }
    });
    
    it('should test OpenRouter DeepSeek model if API key is configured', async () => {
      if (process.env.OPENROUTER_API_KEY) {
        const result = await testOpenRouterModel('deepseek/deepseek-r1:free');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`OpenRouter DeepSeek test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited - this is expected for free tier');
          }
        }
      } else {
        console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
      }
    });
    
    it('should test OpenRouter Gemini Exp model if API key is configured', async () => {
      if (process.env.OPENROUTER_API_KEY) {
        const result = await testOpenRouterModel('google/gemini-2.0-flash-exp:free');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`OpenRouter Gemini Exp test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited - this is expected for free tier');
          }
        }
      } else {
        console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
      }
    });
    
    it('should test OpenRouter Qwen Coder model if API key is configured', async () => {
      if (process.env.OPENROUTER_API_KEY) {
        const result = await testOpenRouterModel('qwen/qwen3-coder:free');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`OpenRouter Qwen Coder test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited - this is expected for free tier');
          }
        }
      } else {
        console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
      }
    });
    
    it('should test OpenRouter DeepSeek Chimera model if API key is configured', async () => {
      if (process.env.OPENROUTER_API_KEY) {
        const result = await testOpenRouterModel('tngtech/deepseek-r1t2-chimera:free');
        expect(result).toBeDefined();
        expect(result).toHaveProperty('healthy');
        
        if (result.healthy) {
          expect(result.responseTime).toBeDefined();
        } else {
          console.log(`OpenRouter DeepSeek Chimera test failed: ${result.error}`);
          if (result.isRateLimit) {
            console.log('  ⚠️  Rate limited - this is expected for free tier');
          }
        }
      } else {
        console.log('⚠️  OPENROUTER_API_KEY not set, skipping test');
      }
    });
  });
  
  describe('Health Status', () => {
    it('should return health status after check', async () => {
      await checkAllModels();
      const status = getHealthStatus();
      
      expect(status).toBeDefined();
      expect(status).toHaveProperty('lastChecked');
      expect(status).toHaveProperty('models');
    });
    
    it('should return list of healthy models', async () => {
      await checkAllModels();
      const healthy = getHealthyModels();
      
      expect(Array.isArray(healthy)).toBe(true);
      
      if (healthy.length > 0) {
        console.log(`\n✅ Found ${healthy.length} healthy models:`);
        healthy.forEach(model => {
          console.log(`  - ${model.name} (${model.config?.provider})`);
        });
      } else {
        console.log('\n⚠️  No healthy models found - check API keys and rate limits');
      }
    });
  });
});

