import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth';

import './AppLayout.css';

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">NetPulse</div>
        <nav className="app-sidebar-nav">
          <NavLink to="/dashboard" className="app-sidebar-link">
            Dashboard
          </NavLink>
          <NavLink to="/incidents" className="app-sidebar-link">
            Incidents
          </NavLink>
          <NavLink to="/reports" className="app-sidebar-link">
            Reports
          </NavLink>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-user">
            {user?.name && <span>{user.name}</span>}
            <button onClick={logout}>Sign out</button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
