import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div>
      <h1>404</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
};
