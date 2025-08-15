import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sql } from '@/lib/db';
import { VerificationEmail } from '@/components/emails/VerificationEmail';
import { renderAsync } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { 
          error: 'MISSING_EMAIL',
          message: '缺少邮箱地址' 
        }, 
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'INVALID_EMAIL',
          message: '邮箱格式不正确' 
        }, 
        { status: 400 }
      );
    }

    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes from now

      // Delete any existing tokens for this email and insert the new one
      await sql`DELETE FROM "VerificationToken" WHERE "identifier" = ${email}`;
      await sql`INSERT INTO "VerificationToken" (identifier, token, expires) VALUES (${email}, ${verificationCode}, ${expires.toISOString()})`;

      // IMPORTANT: Replace with your verified domain in Resend
      const fromEmail = 'onboarding@resend.dev'; 

      const emailHtml = await renderAsync(VerificationEmail({ code: verificationCode }));

      const { error: resendError } = await resend.emails.send({
        from: `Stock Monitor <${fromEmail}>`,
        to: [email],
        subject: '您的登录验证码',
        html: emailHtml,
        text: `您的验证码是: ${verificationCode}`
      });

      if (resendError) {
        console.error('RESEND_ERROR', resendError);
        
        // 根据 Resend 错误类型返回不同的错误信息
        let errorMessage = '发送邮件失败';
        if (resendError.message?.includes('API key')) {
          errorMessage = '邮件服务配置错误，请联系管理员';
        } else if (resendError.message?.includes('rate limit')) {
          errorMessage = '发送频率过高，请稍后再试';
        } else if (resendError.message?.includes('domain')) {
          errorMessage = '邮件域名未验证，请联系管理员';
        }
        
        return NextResponse.json(
          { 
            error: 'EMAIL_SEND_FAILED',
            message: errorMessage,
            details: resendError.message 
          }, 
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        message: '验证码已发送，请查收邮件。',
        expiresAt: expires.toISOString()
      });
      
    } catch (dbError) {
      console.error('DATABASE_ERROR', dbError);
      return NextResponse.json(
        { 
          error: 'DATABASE_ERROR',
          message: '数据库操作失败，请稍后重试' 
        }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('SEND_VERIFICATION_EMAIL_ERROR', error);
    
    // 检查是否是 JSON 解析错误
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'INVALID_JSON',
          message: '请求格式错误' 
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误，请稍后重试' 
      }, 
      { status: 500 }
    );
  }
}
