import React, { useState, useEffect } from 'react';

const FraudDetectionPanel = ({ isAdmin }) => {
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudStats, setFraudStats] = useState({});
  const [wsConnection, setWsConnection] = useState(null);

  useEffect(() => {
    // Connect to fraud detection websocket
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://127.0.0.1:8001/ws/alerts');
      
      ws.onopen = () => {
        console.log('🔗 Connected to fraud detection system');
        setWsConnection(ws);
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'fraud_alert') {
          setFraudAlerts(prev => [message.data, ...prev.slice(0, 49)]);
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification('🚨 Voting Fraud Alert', {
              body: `Vote ${message.data.vote_id} flagged as suspicious`,
              icon: '/fraud-alert-icon.png'
            });
          }
        }
      };
      
      ws.onclose = () => {
        console.log('🔌 Fraud detection connection closed, reconnecting...');
        setTimeout(connectWebSocket, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('❌ Fraud detection WebSocket error:', error);
      };
    };

    connectWebSocket();
    
    // Load initial stats
    loadFraudStats();
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const loadFraudStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8001/stats');
      const stats = await response.json();
      setFraudStats(stats);
    } catch (error) {
      console.error('Failed to load fraud stats:', error);
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

  if (!isAdmin) {
    // Show limited view for non-admin users
    return (
      <div className="fraud-detection-status">
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span>Fraud Detection: Active</span>
        </div>
        {fraudAlerts.length > 0 && (
          <div className="fraud-alert-count">
            ⚠️ {fraudAlerts.length} recent alerts
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fraud-detection-panel">
      <div className="fraud-header">
        <h3>🛡️ Fraud Detection System</h3>
        <div className="fraud-status">
          <span className={`status ${fraudStats.model_loaded ? 'active' : 'inactive'}`}>
            {fraudStats.model_loaded ? '✅ Active' : '❌ Inactive'}
          </span>
        </div>
      </div>

      <div className="fraud-stats">
        <div className="stat-card">
          <h4>{fraudStats.total_alerts || 0}</h4>
          <p>Total Alerts</p>
        </div>
        <div className="stat-card">
          <h4>{fraudStats.connected_clients || 0}</h4>
          <p>Connected Monitors</p>
        </div>
      </div>

      <div className="fraud-alerts-section">
        <h4>🚨 Recent Fraud Alerts</h4>
        
        {fraudAlerts.length === 0 ? (
          <div className="no-alerts">
            <p>No fraud alerts detected</p>
            <small>All votes appear legitimate</small>
          </div>
        ) : (
          <div className="alerts-list">
            {fraudAlerts.slice(0, 10).map((alert, index) => (
              <div 
                key={index} 
                className="alert-item"
                style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}
              >
                <div className="alert-header">
                  <span className="vote-id">Vote: {alert.vote_id}</span>
                  <span className={`severity ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                
                <div className="alert-details">
                  <div className="fraud-probability">
                    Fraud Probability: {(alert.fraud_probability * 100).toFixed(1)}%
                  </div>
                  
                  <div className="fraud-indicators">
                    {alert.indicators.map((indicator, idx) => (
                      <span key={idx} className="indicator-tag">
                        {indicator}
                      </span>
                    ))}
                  </div>
                  
                  <div className="alert-timestamp">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .fraud-detection-panel {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .fraud-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .fraud-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }

        .stat-card h4 {
          font-size: 2rem;
          margin: 0;
          color: #4caf50;
        }

        .alerts-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .alert-item {
          background: rgba(255, 255, 255, 0.1);
          margin: 0.5rem 0;
          padding: 1rem;
          border-radius: 8px;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .severity {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .severity.critical { background: #ff4757; }
        .severity.high { background: #ff6b6b; }
        .severity.medium { background: #ffa502; }
        .severity.low { background: #26de81; }

        .indicator-tag {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          margin: 0.25rem 0.25rem 0 0;
          display: inline-block;
        }

        .status.active {
          color: #4caf50;
        }

        .status.inactive {
          color: #f44336;
        }

        .no-alerts {
          text-align: center;
          padding: 2rem;
          opacity: 0.7;
        }

        .fraud-detection-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4caf50;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FraudDetectionPanel;