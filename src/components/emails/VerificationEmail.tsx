import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface VerificationEmailProps {
  code: string;
}

export const VerificationEmail = ({ code }: VerificationEmailProps): React.ReactElement => (
  <Html>
    <Head />
    <Preview>您的股票监控系统验证码</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>验证码</Heading>
        <Section style={section}>
          <Text style={text}>您好，感谢您使用股票监控系统。</Text>
          <Text style={text}>请使用以下验证码完成您的操作：</Text>
          <Text style={codeText}>{code}</Text>
          <Text style={text}>此验证码将在10分钟内失效。</Text>
          <Text style={text}>如果您没有请求此验证码，请忽略此邮件。</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const section = {
  padding: '24px',
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const codeText = {
  color: '#0070f3',
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '4px',
  border: '2px solid #0070f3',
};
