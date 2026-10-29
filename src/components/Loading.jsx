import React from 'react';

function Loading({ message = 'Loading data...', size = 'medium' }) {
  return (
    <div className={`loading-container loading-${size}`}>
      <div className="spinner"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
}

export default Loading;
