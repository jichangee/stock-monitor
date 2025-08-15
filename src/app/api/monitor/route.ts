import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

export async function GET() {
  const session:any = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const monitorsWithMetrics = await sql`
      SELECT m.*, COALESCE(
        json_agg(row_to_json(mm)) FILTER (WHERE mm.id IS NOT NULL), '[]'
      ) AS metrics
      FROM "StockMonitor" m
      LEFT JOIN "MonitorMetric" mm ON mm."monitorId" = m.id
      WHERE m."userId" = ${session.user.id}
      GROUP BY m.id
      ORDER BY m."updatedAt" DESC;
    `;

    return NextResponse.json(monitorsWithMetrics);
  } catch (error) {
    console.error('Failed to fetch monitors:', error);
    return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session:any = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code, name, metrics } = await req.json();

    if (!code || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newMonitorId = randomUUID();

    const [newMonitor] = await sql`
      INSERT INTO "StockMonitor" (id, code, name, "userId", "isActive", "createdAt", "updatedAt")
      VALUES (${newMonitorId}, ${code}, ${name}, ${session.user.id}, true, NOW(), NOW())
      RETURNING *;
    `;

    if (metrics && metrics.length > 0) {
      for (const metric of metrics) {
        await sql`
          INSERT INTO "MonitorMetric" (id, "monitorId", type, "targetPrice", condition, "premiumThreshold", "changePercentThreshold", "isActive", "notificationSent")
          VALUES (${metric.id}, ${newMonitor.id}, ${metric.type}, ${metric.targetPrice}, ${metric.condition}, ${metric.premiumThreshold}, ${metric.changePercentThreshold}, ${metric.isActive}, false);
        `;
      }
    }

    const finalMonitor = await sql`
      SELECT m.*, COALESCE(
        json_agg(row_to_json(mm)) FILTER (WHERE mm.id IS NOT NULL), '[]'
      ) AS metrics
      FROM "StockMonitor" m
      LEFT JOIN "MonitorMetric" mm ON mm."monitorId" = m.id
      WHERE m.id = ${newMonitor.id}
      GROUP BY m.id;
    `;
    
    return NextResponse.json(finalMonitor[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create monitor:', error);
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session:any = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing monitor ID' }, { status: 400 });
    }

    await sql`
      UPDATE "StockMonitor"
      SET "updatedAt" = NOW(),
          code = ${updates.code},
          name = ${updates.name},
          "isActive" = ${updates.isActive}
      WHERE id = ${id} AND "userId" = ${session.user.id}
      RETURNING *;
    `;

    if (updates.metrics) {
      await sql`
        DELETE FROM "MonitorMetric" WHERE "monitorId" = ${id};
      `;

      for (const metric of updates.metrics) {
        await sql`
          INSERT INTO "MonitorMetric" (id, "monitorId", type, "targetPrice", condition, "premiumThreshold", "changePercentThreshold", "isActive", "notificationSent")
          VALUES (${metric.id}, ${id}, ${metric.type}, ${metric.targetPrice}, ${metric.condition}, ${metric.premiumThreshold}, ${metric.changePercentThreshold}, ${metric.isActive}, ${metric.notificationSent});
        `;
      }
    }
    
    const finalMonitor = await sql`
      SELECT m.*, COALESCE(
        json_agg(row_to_json(mm)) FILTER (WHERE mm.id IS NOT NULL), '[]'
      ) AS metrics
      FROM "StockMonitor" m
      LEFT JOIN "MonitorMetric" mm ON mm."monitorId" = m.id
      WHERE m.id = ${id}
      GROUP BY m.id;
    `;

    return NextResponse.json(finalMonitor[0]);
  } catch (error) {
    console.error('Failed to update monitor:', error);
    return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session:any = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing monitor ID' }, { status: 400 });
    }

    await sql`
      DELETE FROM "MonitorMetric" WHERE "monitorId" = ${id};
    `;
    
    await sql`
      DELETE FROM "StockMonitor" WHERE id = ${id} AND "userId" = ${session.user.id};
    `;

    return NextResponse.json({ message: 'Monitor deleted successfully' });
  } catch (error) {
    console.error('Failed to delete monitor:', error);
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }
}
