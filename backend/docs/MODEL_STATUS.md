# Model Status & Priority

## Current Status (Based on Health Check)

### ✅ Working Models (6/11)

#### Google
- **gemini-2.5-flash** - Response time: ~1345ms
  - Status: ✅ Healthy
  - Provider: Google (direct API)

#### OpenRouter (Free Tier)
- **mistralai/mistral-7b-instruct:free** - Response time: ~1944ms
  - Status: ✅ Healthy
  - Priority: **HIGH** (fastest working model)
  
- **openrouter/sherlock-dash-alpha** - Response time: ~2540ms
  - Status: ✅ Healthy
  - Priority: **HIGH**
  
- **openrouter/sherlock-think-alpha** - Response time: ~2482ms
  - Status: ✅ Healthy
  - Priority: **HIGH**
  
- **kwaipilot/kat-coder-pro:free** - Response time: ~2472ms
  - Status: ✅ Healthy
  - Priority: **MEDIUM**
  
- **tngtech/deepseek-r1t2-chimera:free** - Response time: ~4304ms
  - Status: ✅ Healthy
  - Priority: **MEDIUM** (slower but reliable)

### ❌ Unhealthy Models (5/11)

#### OpenRouter
- **google/gemini-2.0-flash-exp:free** - Internal Server Error
  - Status: ❌ Deprecated (removed from priority)
  
- **deepseek/deepseek-r1:free** - Rate Limited
  - Status: ❌ Deprecated (removed from priority)
  
- **qwen/qwen3-coder:free** - Rate Limited
  - Status: ❌ Deprecated (removed from priority)

#### HuggingFace
- **Qwen/Qwen2.5-7B-Instruct** - Endpoint deprecated
  - Status: ❌ Deprecated
  
- **google/gemma-2-9b-it** - Endpoint deprecated
  - Status: ❌ Deprecated

### 🔍 New HuggingFace Models (Testing)

The following models have been added and will be tested:

1. **meta-llama/Llama-3.1-8B-Instruct** - Main insight engine for SEO
2. **mistralai/Mistral-7B-Instruct-v0.3** - Alternative to OpenRouter Mistral
3. **mistralai/Mixtral-8x7B-Instruct-v0.1** - More powerful variant
4. **microsoft/layoutlmv3-base** - Document layout analysis
5. **distilbert/distilbert-base-uncased** - Fast classification
6. **BAAI/bge-large-en-v1.5** - Embeddings for brand visibility
7. **google/flan-t5-base** - Structured extraction

## Model Priority List

The recommendation service uses models in this order (skips unhealthy ones):

1. `mistralai/mistral-7b-instruct:free` (OpenRouter) - **Fastest working**
2. `openrouter/sherlock-dash-alpha` - **Fast & reliable**
3. `openrouter/sherlock-think-alpha` - **Fast & reliable**
4. `kwaipilot/kat-coder-pro:free` (OpenRouter) - **Reliable**
5. `tngtech/deepseek-r1t2-chimera:free` (OpenRouter) - **Reliable but slower**
6. `meta-llama/Llama-3.1-8B-Instruct` (HuggingFace) - **If available**
7. `mistralai/Mistral-7B-Instruct-v0.3` (HuggingFace) - **If available**
8. `mistralai/Mixtral-8x7B-Instruct-v0.1` (HuggingFace) - **If available**

## Removed from Priority

These models are no longer used due to reliability issues:
- ❌ `google/gemini-2.0-flash-exp:free` - Internal Server Error
- ❌ `deepseek/deepseek-r1:free` - Rate Limited
- ❌ `qwen/qwen3-coder:free` - Rate Limited

## Usage Recommendations

### For SEO Recommendations
- **Primary**: Use working OpenRouter models (Mistral, Sherlock models)
- **Fallback**: HuggingFace Llama 3.1 or Mistral if OpenRouter fails
- **Last Resort**: Static fallback recommendations

### For Brand Visibility Analysis
- **Primary**: Gemini 2.5 Flash (direct API)
- **Embeddings**: BGE Large (HuggingFace) - for comparing LLM output with brand keywords

### For Structured Extraction
- **Primary**: Flan-T5 Base (HuggingFace) - extract meta tags, headings, schema
- **Fast Checks**: DistilBERT (HuggingFace) - detect missing alt text, classify warnings

## Running Health Checks

```bash
# Check all models
npm run check-models

# Check via API
curl http://localhost:5000/api/health/models?refresh=true

# Run tests
npm test -- modelHealthCheck.test.js
```

## Notes

- Models marked as `deprecated: true` are skipped during health checks
- Rate-limited models are automatically retried with exponential backoff
- The system automatically falls back to the next model in priority if one fails
- All unhealthy models are skipped to save time and improve reliability

