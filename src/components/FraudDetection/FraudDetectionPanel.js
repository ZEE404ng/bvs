// src/components/FraudDetection/FraudDetectionPanel.js

import React, { useState, useEffect } from 'react';

const FraudDetectionPanel = ({ isAdmin, fraudDetectionEnabled, onRefreshStatus }) => {
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudStats, setFraudStats] = useState({});
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Connect to fraud detection websocket
    const connectWebSocket = () => {
      if (!fraudDetectionEnabled) {
        setConnectionStatus('disabled');
        return;
      }

      try {
        const ws = new WebSocket('ws://127.0.0.1:8001/ws/alerts');
        
        ws.onopen = () => {
          console.log('🔗 Connected to fraud detection system');
          setWsConnection(ws);
          setConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'fraud_alert') {
              console.log('🚨 Fraud alert received:', message.data);
              
              setFraudAlerts(prev => [message.data, ...prev.slice(0, 49)]);
              
              // Show browser notification if permission granted
              if (Notification.permission === 'granted') {
                new Notification('🚨 Voting Fraud Alert', {
                  body: `Vote ${message.data.vote_id} flagged as suspicious (${(message.data.fraud_probability * 100).toFixed(1)}% confidence)`,
                  icon: '/favicon.ico'
                });
              }

              // Also show alert for admins
              if (isAdmin) {
                const alertMessage = `🚨 FRAUD ALERT\n\nVote: ${message.data.vote_id}\nProbability: ${(message.data.fraud_probability * 100).toFixed(1)}%\nIndicators: ${message.data.indicators.join(', ')}`;
                // Use setTimeout to avoid blocking
                setTimeout(() => alert(alertMessage), 100);
              }
              
            } else if (message.type === 'ping') {
              // Keep-alive ping, no action needed
              console.log('📡 Fraud detection system ping');
            }
          } catch (error) {
            console.error('❌ Error parsing fraud alert:', error);
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 Fraud detection connection closed, reconnecting...');
          setConnectionStatus('reconnecting');
          setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ Fraud detection WebSocket error:', error);
          setConnectionStatus('error');
        };
        
      } catch (error) {
        console.error('❌ Failed to connect to fraud detection WebSocket:', error);
        setConnectionStatus('error');
      }
    };

    connectWebSocket();
    
    // Load initial stats
    loadFraudStats();
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [fraudDetectionEnabled, isAdmin]);

  const loadFraudStats = async () => {
    if (!fraudDetectionEnabled) return;

    try {
      const response = await fetch('http://127.0.0.1:8001/stats', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const stats = await response.json();
        setFraudStats(stats);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to load fraud stats:', error);
      setFraudStats({
        total_alerts: 0,
        connected_clients: 0,
        model_loaded: false,
        error: error.message
      });
    }
  };

  const loadRecentAlerts = async () => {
    if (!fraudDetectionEnabled) return;

    try {
      const response = await fetch('http://127.0.0.1:8001/alerts/20');
      if (response.ok) {
        const data = await response.json();
        setFraudAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('❌ Failed to load recent alerts:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ff4757';
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa502';
      case 'low': return '#26de81';
      default: return '#7bed9f';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return '#4caf50';
      case 'reconnecting': return '#ff9800';
      case 'error': return '#f44336';
      case 'disabled': return '#757575';
      default: return '#2196f3';
    }
  };

  const refreshAll = () => {
    loadFraudStats();
    loadRecentAlerts();
    if (onRefreshStatus) {
      onRefreshStatus();
    }
  };

  // Non-admin view (simplified status display)
  if (!isAdmin) {
    return (
      <div className="fraud-detection-status">
        <div className="status-indicator">
          <span 
            className="status-dot" 
            style={{ backgroundColor: getStatusColor(connectionStatus) }}
          ></span>
          <span className="status-text">
            Fraud Detection: {
              connectionStatus === 'connected' ? 'Active' :
              connectionStatus === 'reconnecting' ? 'Reconnecting' :
              connectionStatus === 'error' ? 'Error' :
              connectionStatus === 'disabled' ? 'Unavailable' : 'Connecting'
            }
          </span>
        </div>
        {fraudAlerts.length > 0 && (
          <div className="fraud-alert-count">
            ⚠️ {fraudAlerts.length} recent alert{fraudAlerts.length !== 1 ? 's' : ''}
          </div>
        )}

        <style jsx>{`
          .fraud-detection-status {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            font-size: 0.9rem;
          }

          .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          .fraud-alert-count {
            color: #ff9800;
            font-weight: 500;
          }

          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Admin view (full dashboard)
  return (
    <div className="fraud-detection-panel">
      <div className="fraud-header">
        <div className="header-content">
          <h3>🛡️ Fraud Detection System</h3>
          <p>AI-powered fraud monitoring for blockchain voting</p>
        </div>
        <div className="header-controls">
          <div className="connection-status">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(connectionStatus) }}
            ></span>
            <span className="status-text">
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={refreshAll}
            disabled={!fraudDetectionEnabled}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {!fraudDetectionEnabled && (
        <div className="alert alert-warning">
          <h4>⚠️ Fraud Detection Unavailable</h4>
          <p>The fraud detection service is not running. To enable fraud protection:</p>
          <ol>
            <li>Open a terminal and navigate to the fraud_detection folder</li>
            <li>Run: <code>python realtime_api.py</code></li>
            <li>Refresh this page once the service is running</li>
          </ol>
        </div>
      )}

      {fraudDetectionEnabled && (
        <>
          <div className="fraud-stats">
            <div className="stat-card">
              <h4>{fraudStats.total_alerts || 0}</h4>
              <p>Total Alerts</p>
            </div>
            <div className="stat-card">
              <h4>{fraudStats.connected_clients || 0}</h4>
              <p>Connected Monitors</p>
            </div>
            <div className="stat-card">
              <h4>{fraudStats.model_loaded ? '✅' : '❌'}</h4>
              <p>AI Models</p>
            </div>
            <div className="stat-card">
              <h4>{connectionStatus === 'connected' ? '🟢' : '🔴'}</h4>
              <p>Real-time Status</p>
            </div>
          </div>

          <div className="fraud-alerts-section">
            <div className="section-header">
              <h4>🚨 Recent Fraud Alerts</h4>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={loadRecentAlerts}
              >
                Load Recent
              </button>
            </div>
            
            {fraudAlerts.length === 0 ? (
              <div className="no-alerts">
                <div className="no-alerts-icon">🛡️</div>
                <h4>No Fraud Detected</h4>
                <p>All voting activity appears legitimate</p>
                <small>The system is actively monitoring for suspicious patterns</small>
              </div>
            ) : (
              <div className="alerts-list">
                {fraudAlerts.slice(0, 10).map((alert, index) => (
                  <div 
                    key={alert.alert_id || index} 
                    className="alert-item"
                    style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}
                  >
                    <div className="alert-header">
                      <div className="alert-title">
                        <span className="vote-id">Vote: {alert.vote_id}</span>
                        <span className={`severity ${alert.severity}`}>
                          {alert.severity?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <div className="alert-timestamp">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="alert-details">
                      <div className="fraud-probability">
                        <strong>Fraud Probability: {(alert.fraud_probability * 100).toFixed(1)}%</strong>
                      </div>
                      
                      {alert.indicators && alert.indicators.length > 0 && (
                        <div className="fraud-indicators">
                          <span className="indicators-label">Reasons:</span>
                          {alert.indicators.map((indicator, idx) => (
                            <span key={idx} className="indicator-tag">
                              {indicator}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="system-info">
            <h4>📊 System Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Service Status:</span>
                <span className={`info-value status-${connectionStatus}`}>
                  {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Models Loaded:</span>
                <span className="info-value">
                  {fraudStats.model_loaded ? '✅ Active' : '❌ Not Loaded'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">API Endpoint:</span>
                <span className="info-value">http://127.0.0.1:8001</span>
              </div>
              <div className="info-item">
                <span className="info-label">Detection Types:</span>
                <span className="info-value">Multiple Voting, IP Clustering, Time Anomalies</span>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .fraud-detection-panel {
          width: 100%;
          color: white;
        }

        .fraud-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .header-content p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .fraud-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem 1rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-card h4 {
          font-size: 2rem;
          margin: 0 0 0.5rem 0;
          color: #4caf50;
        }

        .stat-card p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .fraud-alerts-section {
          margin-bottom: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-header h4 {
          margin: 0;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-sm {
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
        }

        .no-alerts {
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .no-alerts-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .no-alerts h4 {
          margin: 0 0 0.5rem 0;
          color: #4caf50;
        }

        .no-alerts p {
          margin: 0 0 0.5rem 0;
          opacity: 0.8;
        }

        .no-alerts small {
          opacity: 0.6;
        }

        .alerts-list {
          max-height: 500px;
          overflow-y: auto;
        }

        .alert-item {
          background: rgba(255, 255, 255, 0.05);
          margin: 0.5rem 0;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .alert-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .alert-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .vote-id {
          font-weight: 600;
          font-family: monospace;
        }

        .severity {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .severity.critical { background: #ff4757; color: white; }
        .severity.high { background: #ff6b6b; color: white; }
        .severity.medium { background: #ffa502; color: white; }
        .severity.low { background: #26de81; color: white; }

        .alert-timestamp {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .fraud-probability {
          margin-bottom: 0.75rem;
        }

        .fraud-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .indicators-label {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-right: 0.5rem;
        }

        .indicator-tag {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          border: 1px solid rgba(255, 152, 0, 0.3);
        }

        .system-info {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .system-info h4 {
          margin: 0 0 1rem 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .info-label {
          opacity: 0.8;
          font-weight: 500;
        }

        .info-value {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .info-value.status-connected {
          color: #4caf50;
        }

        .info-value.status-error {
          color: #f44336;
        }

        .info-value.status-reconnecting {
          color: #ff9800;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid;
        }

        .alert-warning {
          background: rgba(255, 152, 0, 0.1);
          border-color: rgba(255, 152, 0, 0.3);
          color: #ff9800;
        }

        .alert h4 {
          margin: 0 0 0.5rem 0;
        }

        .alert p {
          margin: 0.5rem 0;
        }

        .alert ol {
          margin: 0.5rem 0 0 1rem;
        }

        .alert code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .fraud-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-controls {
            justify-content: space-between;
          }

          .fraud-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .alert-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .alert-title {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default FraudDetectionPanel;