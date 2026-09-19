import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AppLayout = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />
      <div className="main-content-wrapper">
        <Navbar onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)} />
        <main style={{ flex: 1, paddingBottom: '40px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
