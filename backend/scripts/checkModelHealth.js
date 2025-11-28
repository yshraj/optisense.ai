/**
 * Model Health Check Script
 * Run this script to test all models and see which are working
 * 
 * Usage: node scripts/checkModelHealth.js
 */

require('dotenv').config();
const { checkAllModels, getHealthStatus, getHealthyModels } = require('../src/services/modelHealthCheckService');

async function main() {
  console.log('🚀 Starting Model Health Check...\n');
  
  try {
    // Check all models
    const results = await checkAllModels();
    
    // Get summary
    const status = getHealthStatus();
    const healthy = getHealthyModels();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 HEALTH CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Last checked: ${status.lastChecked}`);
    console.log(`Healthy models: ${healthy.length}/${Object.keys(results).length}\n`);
    
    if (healthy.length > 0) {
      console.log('✅ HEALTHY MODELS:');
      healthy.forEach(model => {
        console.log(`  • ${model.name}`);
        console.log(`    Provider: ${model.config?.provider}`);
        console.log(`    Response time: ${model.status.responseTime}ms`);
        console.log('');
      });
    }
    
    const unhealthy = Object.entries(results).filter(([_, result]) => !result.healthy);
    if (unhealthy.length > 0) {
      console.log('❌ UNHEALTHY MODELS:');
      unhealthy.forEach(([name, result]) => {
        console.log(`  • ${name}`);
        console.log(`    Error: ${result.error}`);
        if (result.statusCode) {
          console.log(`    Status Code: ${result.statusCode}`);
        }
        if (result.isRateLimit) {
          console.log(`    ⚠️  Rate Limited - wait ${result.retryAfter}s before retrying`);
        }
        if (result.isDeprecated) {
          console.log(`    ⚠️  Deprecated/Not Available`);
        }
        console.log('');
      });
    }
    
    console.log('='.repeat(60));
    console.log('\n💡 TIP: Run this script periodically to check model availability');
    console.log('   Models with rate limits will be automatically skipped during recommendations\n');
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

main();

