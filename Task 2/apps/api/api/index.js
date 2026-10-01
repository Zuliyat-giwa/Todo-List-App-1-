// Vercel serverless entry: boots the Nest app once per warm instance and forwards requests to Express.
let server;
module.exports = async (req, res) => {
  if (!server) {
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('../dist/app.module');
    const { configureApp } = require('../dist/setup');
    const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn'] });
    configureApp(app);
    await app.init();
    server = app.getHttpAdapter().getInstance();
  }
  return server(req, res);
};
