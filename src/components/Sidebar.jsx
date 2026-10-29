import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ isOpen, onCloseMobile }) {
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: '📊',
      end: true,
    },
    {
      to: '/vehicles',
      label: 'Vehicles',
      icon: '🚘',
      end: false,
    },
    {
      to: '/customers',
      label: 'Customers',
      icon: '👥',
      end: false,
    },
    {
      to: '/rentals',
      label: 'Rentals',
      icon: '📑',
      end: false,
    },
  ];

  const actionItems = [
    {
      to: '/vehicles/add',
      label: 'Add Vehicle',
      icon: '➕',
    },
    {
      to: '/customers/add',
      label: 'Add Customer',
      icon: '👤',
    },
    {
      to: '/rentals/add',
      label: 'Book Rental',
      icon: '🗓️',
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-section">
          <p className="sidebar-section-title">MAIN NAVIGATION</p>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={onCloseMobile}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-title">QUICK ACTIONS</p>
          <nav className="sidebar-nav">
            {actionItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={onCloseMobile}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-info-box">
            <span className="info-icon">⚡</span>
            <div>
              <p className="info-title">Vehicle Rental Portal</p>
              <p className="info-desc">B.Tech Capstone Project</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
