const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clean up test users
    await User.deleteMany({ email: /test.*@example\.com/i });
  });

  describe('POST /api/auth/send-otp', () => {
    test('should send OTP for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com', mode: 'signup' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    }, 10000);

    test('should handle case-insensitive email', async () => {
      const email1 = 'Test@Example.com';
      const email2 = 'test@example.com';
      
      // Send OTP with uppercase
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email1, mode: 'signup' });
      
      // Try to verify with lowercase - should find same user
      const user1 = await User.findOne({ email: email1.toLowerCase() });
      const user2 = await User.findOne({ email: email2.toLowerCase() });
      
      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(user1._id.toString()).toBe(user2._id.toString());
    }, 10000);

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'invalid-email', mode: 'signup' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject empty email', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: '', mode: 'signup' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    test('should reject invalid OTP', async () => {
      // First send OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com', mode: 'signup' });
      
      // Try to verify with wrong OTP
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ 
          email: 'test@example.com', 
          otp: '000000' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    }, 10000);
  });

  describe('Email case insensitivity', () => {
    test('should treat emails as case-insensitive', async () => {
      const email1 = 'YASHRAJMEEN@GMAIL.COM';
      const email2 = 'yashrajmeen@gmail.com';
      
      // Create user with uppercase
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: email1, mode: 'signup' });
      
      // Try to find with lowercase
      const user1 = await User.findOne({ email: email1.toLowerCase() });
      const user2 = await User.findOne({ email: email2.toLowerCase() });
      
      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(user1._id.toString()).toBe(user2._id.toString());
    }, 10000);
  });
});


