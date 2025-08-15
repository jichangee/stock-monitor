'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, RefreshCw, Mail } from 'lucide-react'

type Variant = 'LOGIN' | 'REGISTER'

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  field?: string;
}

const AuthForm = () => {
  const router = useRouter()
  const [variant, setVariant] = useState<Variant>('LOGIN')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'details'>('email')
  const [error, setError] = useState<ErrorState | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    code: '',
  })

  const toggleVariant = () => {
    setVariant(variant === 'LOGIN' ? 'REGISTER' : 'LOGIN')
    setStep('email')
    setError(null)
    setEmailSent(false)
    setCountdown(0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // 清除字段相关的错误
    if (error?.field === e.target.name) {
      setError(null)
    }
  }

  const socialAction = (action: string) => {
    setIsLoading(true)
    setError(null)
    signIn(action, { callbackUrl: '/' })
  }

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!formData.email) {
      setError({
        message: '请输入邮箱地址',
        type: 'error',
        field: 'email'
      })
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || '验证码已发送，请查收邮件。')
        setEmailSent(true)
        setStep('details')
        startCountdown()
      } else {
        let errorMessage = '发送验证码失败'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }

        setError({
          message: errorMessage,
          type: 'error'
        })
        
        toast.error(errorMessage)
      }
    } catch (error) {
      const errorMessage = '网络错误，请检查网络连接后重试'
      setError({
        message: errorMessage,
        type: 'error'
      })
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return
    await handleSendCode()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (variant === 'REGISTER') {
      if (step === 'email') {
        handleSendCode()
        return
      } else { // step === 'details'
        try {
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          })

          if (response.ok) {
            toast.success('注册成功！请登录。')
            toggleVariant()
          } else {
            let errorMessage = '注册失败'
            
            try {
              const errorData = await response.json()
              errorMessage = errorData.message || errorMessage
            } catch {
              const errorText = await response.text()
              errorMessage = errorText || errorMessage
            }

            setError({
              message: errorMessage,
              type: 'error'
            })
            
            toast.error(errorMessage)
          }
        } catch (error) {
          const errorMessage = '网络错误，请检查网络连接后重试'
          setError({
            message: errorMessage,
            type: 'error'
          })
          toast.error(errorMessage)
        } finally {
          setIsLoading(false)
        }
      }
    } else {
      // LOGIN
      signIn('credentials', {
        ...formData,
        redirect: false,
      })
        .then((callback) => {
          if (callback?.error) {
            let errorMessage = callback.error
            
            // 转换错误消息为用户友好的中文
            if (errorMessage.includes('CredentialsSignin')) {
              errorMessage = '邮箱或密码错误'
            } else if (errorMessage.includes('Email not verified')) {
              errorMessage = '邮箱未验证，请先验证邮箱'
            }
            
            setError({
              message: errorMessage,
              type: 'error'
            })
            
            toast.error(errorMessage)
          }

          if (callback?.ok && !callback?.error) {
            toast.success('登录成功！')
            router.push('/')
          }
        })
        .finally(() => setIsLoading(false))
    }
  }

  const getFieldError = (fieldName: string) => {
    return error?.field === fieldName ? error.message : null
  }

  const getFieldErrorClass = (fieldName: string) => {
    return getFieldError(fieldName) ? 'border-red-500 focus:border-red-500' : ''
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {variant === 'LOGIN' ? '登录您的账户' : '创建新账户'}
      </h2>
      
      {/* 错误信息显示 */}
      {error && (
        <div className={`mt-4 p-3 rounded-md border ${
          error.type === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200' :
          error.type === 'warning' ? 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
          'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
        }`}>
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">{error.message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {variant === 'REGISTER' && step === 'email' && (
          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={getFieldErrorClass('email')}
              placeholder="请输入您的邮箱地址"
            />
            {getFieldError('email') && (
              <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('email')}</p>
            )}
          </div>
        )}

        {variant === 'REGISTER' && step === 'details' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={true}
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="flex space-x-2">
                <Input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={getFieldErrorClass('code')}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isLoading || countdown > 0}
                  className="px-3 min-w-[100px]"
                >
                  {countdown > 0 ? `${countdown}s` : '重发'}
                </Button>
              </div>
              {getFieldError('code') && (
                <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('code')}</p>
              )}
              {emailSent && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  验证码已发送到您的邮箱
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className={getFieldErrorClass('name')}
                placeholder="请输入您的姓名"
              />
              {getFieldError('name') && (
                <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('name')}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={getFieldErrorClass('password')}
                placeholder="请输入密码（至少6位）"
                minLength={6}
              />
              {getFieldError('password') && (
                <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('password')}</p>
              )}
            </div>
          </>
        )}

        {variant === 'LOGIN' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                name="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={getFieldErrorClass('email')}
                placeholder="请输入您的邮箱地址"
              />
              {getFieldError('email') && (
                <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('email')}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={getFieldErrorClass('password')}
                placeholder="请输入密码"
              />
              {getFieldError('password') && (
                <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('password')}</p>
              )}
            </div>
          </>
        )}

        <div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                加载中...
              </div>
            ) : (
              variant === 'LOGIN' ? '登录' : (
                step === 'email' ? '发送验证码' : '注册'
              )
            )}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              使用其他方式登录
            </span>
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            disabled={isLoading}
          >
            Google
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-500 dark:text-gray-400">
          {variant === 'LOGIN' ? '还没有账户？' : '已经有账户了？'}
          <button 
            onClick={toggleVariant} 
            className="ml-2 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300" 
            disabled={isLoading}
          >
            {variant === 'LOGIN' ? '创建账户' : '立即登录'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthForm
