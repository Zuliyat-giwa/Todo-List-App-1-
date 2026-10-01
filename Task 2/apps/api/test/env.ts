// Runs in every test worker before modules load: points the app at the isolated test database.
const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54329/modeza_test_utf8';
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.WEB_URL = 'http://localhost:3000';
process.env.PAYSTACK_SECRET_KEY = '';
process.env.MAILGUN_API_KEY = '';
