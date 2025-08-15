import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // 简化的权限验证 - 在实际使用中应该使用proper authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 删除用户相关的所有数据
    await sql`BEGIN`;
    
    try {
      // 删除监控数据
      await sql`DELETE FROM "StockMonitor" WHERE "userId" = ${userId}`;
      
      // 删除账户关联
      await sql`DELETE FROM "Account" WHERE "userId" = ${userId}`;
      
      // 删除用户
      const result = await sql`DELETE FROM "User" WHERE id = ${userId} RETURNING id`;
      
      if (result.length === 0) {
        await sql`ROLLBACK`;
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }
      
      await sql`COMMIT`;
      
      return NextResponse.json({ 
        message: '用户删除成功',
        deletedUserId: userId 
      });
      
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
    
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
