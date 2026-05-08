import { Outlet } from 'react-router-dom';

import './AuthLayout.css';

export const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-layout-card">
        <Outlet />
      </div>
    </div>
  );
};
