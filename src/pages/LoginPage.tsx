import { useState, type FormEvent } from 'react';

import { useAuth } from '@features/auth';

export const LoginPage = () => {
  const { login, status, error } = useAuth();
  const [email, setEmail] = useState('ahmed@netpulse.dev');
  const [password, setPassword] = useState('password123');

  const isSubmitting = status === 'authenticating';

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>NetPulse</h1>
      <p>Sign in to continue</p>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>

      {error && <div role="alert">{error}</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};
