import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ onToggleSidebar, isSidebarOpen, theme = 'dark', onToggleTheme, onSetTheme }) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          <span className="hamburger-icon">☰</span>
        </button>
        <Link to="/" className="navbar-brand">
          <span className="brand-logo-icon">🚗</span>
          <span className="brand-title">
            RentWheels <span className="brand-badge">Portal</span>
          </span>
        </Link>
      </div>

      <div className="navbar-right">
        {/* Dark & Light Modes Switcher */}
        <div className="theme-switch-wrapper" role="group" aria-label="Theme mode switcher">
          <button
            type="button"
            className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => onSetTheme ? onSetTheme('dark') : onToggleTheme()}
            title="Switch to Dark Mode"
            aria-label="Dark Mode"
          >
            <span className="theme-switch-icon">🌙</span>
            <span className="theme-switch-label">Dark</span>
          </button>
          <button
            type="button"
            className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => onSetTheme ? onSetTheme('light') : onToggleTheme()}
            title="Switch to Light Mode"
            aria-label="Light Mode"
          >
            <span className="theme-switch-icon">☀️</span>
            <span className="theme-switch-label">Light</span>
          </button>
        </div>

        <Link to="/rentals/add" className="btn btn-sm btn-new-rental">
          + New Rental
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
