const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.development.local' });

if (!process.env.STOCK_DATABASE_URL) {
  console.error('STOCK_DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.STOCK_DATABASE_URL);

async function setupAdmin() {
  try {
    console.log('开始设置管理员模块...');

    // 1. 检查并添加role字段到User表
    console.log('检查User表结构...');
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" VARCHAR(10) DEFAULT 'user'`;
      console.log('✓ role字段已添加或已存在');
    } catch (error) {
      console.log('role字段可能已存在，继续...');
    }

    // 2. 检查管理员账号是否存在
    console.log('检查管理员账号...');
    const adminUsers = await sql`SELECT * FROM "User" WHERE "email" = 'moxuy'`;
    
    if (adminUsers.length === 0) {
      console.log('创建管理员账号...');
      const bcrypt = require('bcrypt');
      const { randomUUID } = require('crypto');
      
      const hashedPassword = await bcrypt.hash('Ging9597', 10);
      const adminId = randomUUID();
      
      await sql`
        INSERT INTO "User" ("id", "name", "email", "password", "emailVerified", "role") 
        VALUES (${adminId}, '管理员', 'moxuy', ${hashedPassword}, ${new Date().toISOString()}, 'admin')
      `;
      
      console.log('✓ 管理员账号创建成功');
      console.log('   - 邮箱: moxuy');
      console.log('   - 密码: Ging9597');
      console.log('   - 角色: admin');
    } else {
      // 更新现有账号为管理员
      if (adminUsers[0].role !== 'admin') {
        console.log('更新现有账号为管理员...');
        await sql`UPDATE "User" SET "role" = 'admin' WHERE "email" = 'moxuy'`;
        console.log('✓ 现有账号已更新为管理员');
      } else {
        console.log('✓ 管理员账号已存在');
      }
    }

    // 3. 为现有用户设置默认角色
    console.log('为现有用户设置默认角色...');
    await sql`UPDATE "User" SET "role" = 'user' WHERE "role" IS NULL`;
    console.log('✓ 现有用户角色已设置');

    // 4. 显示用户统计
    const userStats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "role" = 'admin' THEN 1 END) as admin_users,
        COUNT(CASE WHEN "role" = 'user' THEN 1 END) as regular_users
      FROM "User"
    `;
    
    console.log('\n用户统计:');
    console.log(`  - 总用户数: ${userStats[0].total_users}`);
    console.log(`  - 管理员数: ${userStats[0].admin_users}`);
    console.log(`  - 普通用户数: ${userStats[0].regular_users}`);

    console.log('\n✓ 管理员模块设置完成！');
    console.log('\n管理员账号信息:');
    console.log('  邮箱: moxuy');
    console.log('  密码: Ging9597');
    console.log('  角色: admin');
    console.log('\n请使用此账号登录系统，您将看到管理员面板。');

  } catch (error) {
    console.error('设置管理员模块失败:', error);
    process.exit(1);
  }
}

setupAdmin();
