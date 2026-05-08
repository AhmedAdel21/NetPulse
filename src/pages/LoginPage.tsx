import { useAuth } from '@features/auth';

export const LoginPage = () => {
  const { login } = useAuth();

  const handleLogin = (): void => {
    login();
  };

  return (
    <div className="login-page">
      <h1>NetPulse</h1>
      <p>Sign in to continue</p>
      <button onClick={handleLogin}>Sign in (mock)</button>
    </div>
  );
};
