require('dotenv').config({ path: '.env.development.local' });
const { sql } = require('./src/lib/db.ts');

async function setupDatabase() {
  console.log('Starting database setup...');

  try {
    console.log('Creating User table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID PRIMARY KEY,
        "name" TEXT,
        "email" TEXT UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        "image" TEXT,
        "password" TEXT,
        "role" TEXT DEFAULT 'user',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log('User table created successfully.');

    console.log('Creating Account table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT
      );
    `;
    console.log('Account table created successfully.');

    console.log('Creating Stock table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "Stock" (
        "id" UUID PRIMARY KEY,
        "symbol" TEXT NOT NULL,
        "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        UNIQUE("userId", "symbol")
      );
    `;
    console.log('Stock table created successfully.');

    console.log('Creating StockMonitor table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "StockMonitor" (
        "id" UUID PRIMARY KEY,
        "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "symbol" TEXT NOT NULL,
        "targetPrice" DECIMAL(10,2),
        "targetPremium" DECIMAL(5,2),
        "targetChangePercent" DECIMAL(5,2),
        "notificationEnabled" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("userId", "symbol")
      );
    `;
    console.log('StockMonitor table created successfully.');

    console.log('Creating VerificationToken table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "VerificationToken" (
        "identifier" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expires" TIMESTAMPTZ NOT NULL,
        PRIMARY KEY ("identifier", "token")
      );
    `;
    console.log('VerificationToken table created successfully.');

    console.log('Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();