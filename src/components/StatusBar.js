// src/components/StatusBar.js
import React from 'react';
import './StatusBar.css';

function StatusBar({ isOnline, onManualSync }) {
  return (
    <div className={`status-bar ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-indicator">
        <span className="status-dot"></span>
        <span className="status-text">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {!isOnline && (
  <div className="offline-message">
    Changes will sync once you're back online.
  </div>
)}

      
      {isOnline && (
        <button 
          className="sync-button"
          onClick={onManualSync}
          title="수동 동기화"
        >
          Sync
        </button>
      )}
    </div>
  );
}

export default StatusBar;