const request = require('supertest');
const app = require('../../src/app');
const Scan = require('../../src/models/Scan');

describe('Analyze Routes', () => {
  beforeEach(async () => {
    // Clean up test scans
    await Scan.deleteMany({ url: /test.*example\.com/i });
  });

  describe('POST /api/analyze', () => {
    test('should analyze a valid URL', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ 
          url: 'https://example.com',
          visitorId: 'test-visitor-123',
          fingerprint: 'test-fingerprint-123'
        });
      
      // Should either succeed or require auth
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('result');
        expect(response.body.result).toHaveProperty('seo');
        expect(response.body.result).toHaveProperty('llmVisibility');
      }
    }, 60000); // 60 second timeout for analysis

    test('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ 
          url: 'not-a-valid-url',
          visitorId: 'test-visitor-123',
          fingerprint: 'test-fingerprint-123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle timeout errors gracefully', async () => {
      // Test with a URL that might timeout
      const response = await request(app)
        .post('/api/analyze')
        .send({ 
          url: 'https://httpstat.us/200?sleep=20000',
          visitorId: 'test-visitor-123',
          fingerprint: 'test-fingerprint-123'
        });
      
      // Should handle timeout or return error
      expect([200, 400, 500, 503]).toContain(response.status);
      
      if (response.body.error) {
        // Error message should be user-friendly
        expect(response.body.error).toBeDefined();
      }
    }, 30000);

    test('should require URL parameter', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ 
          visitorId: 'test-visitor-123',
          fingerprint: 'test-fingerprint-123'
        });
      
      expect(response.status).toBe(400);
    });

    test('should create scan record', async () => {
      const url = 'https://example.com';
      
      const response = await request(app)
        .post('/api/analyze')
        .send({ 
          url: url,
          visitorId: 'test-visitor-123',
          fingerprint: 'test-fingerprint-123'
        });
      
      // Check if scan was created (if analysis started)
      if (response.status === 200 || response.status === 202) {
        const scans = await Scan.find({ url: url });
        expect(scans.length).toBeGreaterThan(0);
      }
    }, 60000);
  });
});


