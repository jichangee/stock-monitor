import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, name, code } = body

    // 验证必填字段
    if (!email || !password || !code) {
      const missingFields = []
      if (!email) missingFields.push('邮箱')
      if (!password) missingFields.push('密码')
      if (!code) missingFields.push('验证码')
      
      return NextResponse.json({
        error: 'MISSING_FIELDS',
        message: `缺少必要信息：${missingFields.join('、')}`,
        missingFields
      }, { status: 400 })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'INVALID_EMAIL',
        message: '邮箱格式不正确'
      }, { status: 400 })
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json({
        error: 'PASSWORD_TOO_SHORT',
        message: '密码长度至少6位'
      }, { status: 400 })
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({
        error: 'INVALID_CODE',
        message: '验证码格式不正确，请输入6位数字'
      }, { status: 400 })
    }

    try {
      // 1. Verify the code
      const verificationTokens = await sql`SELECT * FROM "VerificationToken" WHERE "identifier" = ${email} AND "token" = ${code}`;
      if (verificationTokens.length === 0) {
        return NextResponse.json({
          error: 'INVALID_CODE',
          message: '验证码错误，请检查后重新输入'
        }, { status: 400 });
      }
      const verificationToken = verificationTokens[0];

      // 2. Check if the code has expired
      if (new Date(verificationToken.expires) < new Date()) {
        return NextResponse.json({
          error: 'CODE_EXPIRED',
          message: '验证码已过期，请重新获取'
        }, { status: 400 });
      }

      // 3. Check if user already exists
      const existingUsers = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;
      if (existingUsers.length > 0) {
        return NextResponse.json({
          error: 'USER_EXISTS',
          message: '该邮箱已被注册，请直接登录或使用其他邮箱'
        }, { status: 409 })
      }

      // 4. Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10)
      const userId = randomUUID();

      await sql`
        INSERT INTO "User" ("id", "name", "email", "password", "emailVerified") 
        VALUES (${userId}, ${name}, ${email}, ${hashedPassword}, ${new Date().toISOString()})
      `;

      // 5. Delete the verification token after use
      await sql`DELETE FROM "VerificationToken" WHERE "identifier" = ${email}`;

      const newUser = {
        id: userId,
        name,
        email
      }

      return NextResponse.json({
        success: true,
        message: '注册成功！',
        user: newUser
      })
      
    } catch (dbError) {
      console.error('DATABASE_ERROR', dbError)
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: '数据库操作失败，请稍后重试'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('REGISTRATION_ERROR', error)
    
    // 检查是否是 JSON 解析错误
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        error: 'INVALID_JSON',
        message: '请求格式错误'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: '服务器内部错误，请稍后重试'
    }, { status: 500 })
  }
}
