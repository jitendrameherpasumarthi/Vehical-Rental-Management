import React from 'react';

function StatCard({
  title,
  value,
  icon,
  colorVariant = 'blue',
  subtitle,
  onClick,
}) {
  return (
    <div
      className={`stat-card stat-${colorVariant} ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-header">
        <div className="stat-info">
          <span className="stat-title">{title}</span>
          <h3 className="stat-value">{value}</h3>
        </div>
        <div className="stat-icon-wrapper">
          <span className="stat-icon">{icon}</span>
        </div>
      </div>
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </div>
  );
}

export default StatCard;
