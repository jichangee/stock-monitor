import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // 简化的权限验证 - 在实际使用中应该使用proper authentication
    // 这里暂时允许所有访问，在生产环境中应该添加proper authentication

    // 获取所有用户信息（不包含密码）
    const users = await sql`
      SELECT 
        id, 
        name, 
        email, 
        role,
        "createdAt",
        "updatedAt"
      FROM "User" 
      ORDER BY "createdAt" DESC
    `;

    // 获取每个用户的监控数量
    const userStats = await sql`
      SELECT 
        "userId",
        COUNT(*) as monitor_count
      FROM "StockMonitor" 
      GROUP BY "userId"
    `;

    // 合并用户信息和统计
    const usersWithStats = users.map(user => {
      const stats = userStats.find(stat => stat.userId === user.id);
      return {
        ...user,
        monitorCount: stats ? parseInt(stats.monitor_count) : 0
      };
    });

    return NextResponse.json({ users: usersWithStats });
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
