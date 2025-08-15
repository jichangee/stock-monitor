import AuthForm from '@/components/AuthForm';

const AuthPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <AuthForm />
      </div>
    </div>
  );
};

export default AuthPage;
