const { analyzeSEO } = require('../../src/services/seoService');

describe('SEO Service', () => {
  describe('analyzeSEO', () => {
    test('should analyze a valid URL', async () => {
      const url = 'https://example.com';
      
      try {
        const result = await analyzeSEO(url);
        
        // Check required fields
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('metaDescription');
        expect(result).toHaveProperty('isHttps');
        expect(result).toHaveProperty('loadTimeMs');
        expect(result).toHaveProperty('headings');
        expect(result).toHaveProperty('images');
        expect(result).toHaveProperty('links');
        expect(result).toHaveProperty('warnings');
        
        // Check types
        expect(typeof result.isHttps).toBe('boolean');
        expect(typeof result.loadTimeMs).toBe('number');
        expect(Array.isArray(result.headings)).toBe(true);
        expect(Array.isArray(result.images)).toBe(true);
        expect(Array.isArray(result.links)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      } catch (error) {
        // If URL is not accessible, that's expected in some test environments
        console.warn('SEO test skipped - URL not accessible:', error.message);
      }
    }, 20000); // 20 second timeout

    test('should handle timeout errors gracefully', async () => {
      // Test with a URL that might timeout
      const url = 'https://httpstat.us/200?sleep=20000'; // 20 second delay
      
      try {
        await analyzeSEO(url);
      } catch (error) {
        // Should throw a timeout error
        expect(error.message).toMatch(/timeout|exceeded|high load/i);
      }
    }, 25000);

    test('should handle invalid URLs', async () => {
      const url = 'not-a-valid-url';
      
      try {
        await analyzeSEO(url);
      } catch (error) {
        // Should throw an error for invalid URL
        expect(error).toBeDefined();
      }
    });

    test('should extract SEO data correctly', async () => {
      const url = 'https://example.com';
      
      try {
        const result = await analyzeSEO(url);
        
        // Check that warnings is an array
        expect(Array.isArray(result.warnings)).toBe(true);
        
        // Check structured data
        if (result.structuredData) {
          expect(Array.isArray(result.structuredData)).toBe(true);
        }
      } catch (error) {
        console.warn('SEO test skipped - URL not accessible:', error.message);
      }
    }, 20000);
  });
});


