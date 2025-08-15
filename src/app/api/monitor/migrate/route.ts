import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "StockMonitor" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "lastNotificationDate" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "userId" UUID REFERENCES "User"(id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "MonitorMetric" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        "targetPrice" DOUBLE PRECISION,
        condition VARCHAR(50),
        "premiumThreshold" DOUBLE PRECISION,
        "changePercentThreshold" DOUBLE PRECISION,
        "isActive" BOOLEAN DEFAULT true,
        "notificationSent" BOOLEAN DEFAULT false,
        "monitorId" UUID REFERENCES "StockMonitor"(id) ON DELETE CASCADE
      );
    `;

    return NextResponse.json({ message: 'Migration completed' });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
