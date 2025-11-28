# Model Health Check System

This system helps you debug and monitor which AI models are working and which are experiencing issues (like rate limits).

## Features

- ✅ Tests all configured models (Gemini, HuggingFace, OpenRouter)
- ✅ Detects rate limit errors (429)
- ✅ Tracks model health status
- ✅ Automatically skips unhealthy models during recommendations
- ✅ Provides fallback recommendations when all models fail

## Quick Start

### 1. Check Model Health via Script

```bash
npm run check-models
```

This will test all models and show you which are healthy and which are not.

### 2. Check Model Health via API

```bash
# Get current health status
curl http://localhost:5000/api/health/models

# Force refresh health status
curl http://localhost:5000/api/health/models?refresh=true
```

### 3. Run Tests

```bash
npm test -- modelHealthCheck.test.js
```

## How It Works

### Automatic Health Checks

- On server startup, models are automatically checked (can be disabled with `CHECK_MODELS_ON_STARTUP=false`)
- Health status is cached in memory
- Unhealthy models are automatically skipped during recommendation generation

### Model Priority

When generating recommendations, the system tries models in this order:

1. `google/gemini-2.0-flash-exp:free` (OpenRouter)
2. `deepseek/deepseek-r1:free` (OpenRouter)
3. `mistralai/mistral-7b-instruct:free` (OpenRouter)

If a model is rate-limited (429 error), it automatically tries the next one.

### Rate Limit Handling

- **429 errors** are detected and models are marked as unhealthy
- **Retry logic** with exponential backoff (2s, 4s delays)
- **Automatic fallback** to next model in priority list
- **Graceful degradation** to fallback recommendations if all models fail

## Models Tested

### Google Gemini
- `gemini-2.5-flash` (via Google API)

### HuggingFace
- `Qwen/Qwen2.5-7B-Instruct`
- `google/gemma-2-9b-it`

### OpenRouter
- `google/gemini-2.0-flash-exp:free`
- `deepseek/deepseek-r1:free`
- `mistralai/mistral-7b-instruct:free`

## Debugging Rate Limits

### Common Issues

1. **429 Rate Limit Errors**
   - Free tier models have rate limits
   - Wait 60 seconds and try again
   - Use the health check to see which models are available

2. **API Key Not Configured**
   - Check your `.env` file
   - Required keys: `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `OPENROUTER_API_KEY`

3. **Model Unavailable**
   - Some free models may be temporarily unavailable
   - The system will automatically use fallback models

### Example Output

```
🔍 Starting model health check...
  Testing Gemini...
  Testing HuggingFace Qwen...
  Testing HuggingFace Gemma...
  Testing OpenRouter Gemini Exp...
  Testing OpenRouter DeepSeek...
  Testing OpenRouter Mistral...
✅ Health check complete: 4/6 models healthy

✅ HEALTHY MODELS:
  • gemini
    Provider: google
    Response time: 1234ms
  
  • huggingfaceQwen
    Provider: huggingface
    Response time: 2345ms

❌ UNHEALTHY MODELS:
  • geminiExp
    Error: Request failed with status code 429
    ⚠️  Rate Limited - wait 60s before retrying
  
  • openrouterDeepSeek
    Error: Request failed with status code 429
    ⚠️  Rate Limited - wait 60s before retrying
```

## API Endpoints

### GET `/api/health/models`

Get current model health status.

**Query Parameters:**
- `refresh=true` - Force a new health check

**Response:**
```json
{
  "success": true,
  "lastChecked": "2024-01-15T10:30:00.000Z",
  "healthyCount": 4,
  "totalCount": 6,
  "healthyModels": [
    {
      "name": "gemini",
      "provider": "google",
      "responseTime": 1234
    }
  ],
  "allModels": {
    "gemini": {
      "healthy": true,
      "responseTime": 1234
    },
    "geminiExp": {
      "healthy": false,
      "error": "Request failed with status code 429",
      "isRateLimit": true,
      "retryAfter": 60
    }
  }
}
```

## Integration

The health check system is automatically integrated into:

- **Warning Recommendation Service** - Skips unhealthy models
- **Server Startup** - Initial health check (optional)
- **API Endpoint** - Manual health checks

## Best Practices

1. **Run health checks periodically** to monitor model availability
2. **Check before high-traffic periods** to ensure models are ready
3. **Monitor rate limits** - free tier models have strict limits
4. **Use multiple models** - the system automatically falls back

## Troubleshooting

### All Models Failing

1. Check API keys in `.env`
2. Verify network connectivity
3. Check rate limits - wait and retry
4. Review error messages in health check output

### Rate Limits

Free tier models have rate limits. Solutions:
- Wait for rate limit to reset (usually 60 seconds)
- Use paid tier models for higher limits
- Distribute requests across multiple models

### Model Not Responding

- Check if model is still available on provider
- Verify API key permissions
- Check provider status page

## Environment Variables

```env
# Required for model health checks
GEMINI_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here

# Optional
CHECK_MODELS_ON_STARTUP=true  # Set to false to disable startup check
```

