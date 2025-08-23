import React from 'react';

const WalletConnection = ({ account, onConnect, loading }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="wallet-connection">
      {account ? (
        <div className="wallet-info">
          <div className="wallet-status">
            <span className="status-dot"></span>
            Connected
          </div>
          <div className="wallet-address">
            {formatAddress(account)}
          </div>
        </div>
      ) : (
        <button 
          className="btn btn-primary"
          onClick={onConnect}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}
      
      <style jsx>{`
        .wallet-connection {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .wallet-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }
        
        .wallet-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: #4caf50;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .wallet-address {
          font-family: monospace;
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
          .wallet-info {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default WalletConnection;