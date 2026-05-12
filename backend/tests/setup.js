import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll } from 'vitest';

let mongoServer;

process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET ||= 'a'.repeat(64);
process.env.REFRESH_TOKEN_SECRET ||= 'b'.repeat(64);
process.env.AI_SERVICE_SECRET ||= 'c'.repeat(64);
process.env.ALLOWED_ORIGINS ||= 'http://localhost:5173';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URL = mongoServer.getUri();

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URL, {
      dbName: process.env.MONGODB_DB || 'EgrievanceHubTest',
    });
  }
}, 30000);

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.connection.close().catch(() => {});
  await mongoServer?.stop();
}, 30000);
