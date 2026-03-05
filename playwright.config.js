const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  webServer: {
    command: 'node server.js',
    port: 3001,
    env: {
      PORT: '3001',
      JWT_SECRET: 'test-secret-for-e2e-tests',
      ALLOWED_EMAILS: 'test@example.com,admin@example.com',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
    },
    reuseExistingServer: !process.env.CI,
  },
});
