import React, { useState, useEffect } from 'react';

const ResultsPanel = ({ contract, totalVotes }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (contract) {
      loadResults();
    }
  }, [contract]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    let interval = null;
    if (autoRefresh && contract) {
      interval = setInterval(() => {
        loadResults();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, contract]);

  const loadResults = async () => {
    try {
      setError('');
      
      const candidateList = await contract.getAllCandidates();
      
      // Sort candidates by vote count (descending)
      const sortedCandidates = candidateList
        .map(candidate => ({
          id: Number(candidate.id),
          name: candidate.name,
          description: candidate.description,
          voteCount: Number(candidate.voteCount),
          exists: candidate.exists
        }))
        .sort((a, b) => b.voteCount - a.voteCount);

      setCandidates(sortedCandidates);
    } catch (error) {
      console.error('Error loading results:', error);
      setError('Failed to load results. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const getLeader = () => {
    if (candidates.length === 0) return null;
    const maxVotes = Math.max(...candidates.map(c => c.voteCount));
    return candidates.filter(c => c.voteCount === maxVotes);
  };

  const handleRefresh = () => {
    setLoading(true);
    loadResults();
  };

  if (loading) {
    return (
      <div className="results-panel">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-panel">
        <div className="alert alert-error">
          {error}
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            style={{ marginTop: '1rem' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const leaders = getLeader();
  const isTie = leaders && leaders.length > 1 && leaders[0].voteCount > 0;

  return (
    <div className="results-panel">
      <div className="results-header">
        <div className="header-content">
          <h2>📊 Live Results</h2>
          <p>Real-time voting results from the blockchain</p>
        </div>
        
        <div className="results-controls">
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            disabled={loading}
          >
            🔄 Refresh
          </button>
          
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="results-summary">
        <div className="summary-card">
          <h3>{totalVotes}</h3>
          <p>Total Votes</p>
        </div>
        <div className="summary-card">
          <h3>{candidates.length}</h3>
          <p>Candidates</p>
        </div>
        <div className="summary-card">
          <h3>{leaders && leaders.length > 0 ? leaders[0].voteCount : 0}</h3>
          <p>Leading Votes</p>
        </div>
      </div>

      {/* Leader Announcement */}
      {totalVotes > 0 && leaders && (
        <div className={`leader-announcement ${isTie ? 'tie' : 'single-leader'}`}>
          {isTie ? (
            <div>
              <h3>🤝 Current Tie</h3>
              <p>
                Multiple candidates are tied with {leaders[0].voteCount} vote{leaders[0].voteCount !== 1 ? 's' : ''} each:
              </p>
              <div className="tied-candidates">
                {leaders.map(leader => (
                  <span key={leader.id} className="leader-name">{leader.name}</span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3>👑 Current Leader</h3>
              <p>
                <strong>{leaders[0].name}</strong> is leading with{' '}
                {leaders[0].voteCount} vote{leaders[0].voteCount !== 1 ? 's' : ''} 
                ({calculatePercentage(leaders[0].voteCount)}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* No votes message */}
      {totalVotes === 0 && (
        <div className="no-votes-message">
          <h3>📭 No Votes Cast Yet</h3>
          <p>Be the first to vote! Results will appear here as votes are cast.</p>
        </div>
      )}

      {/* Results List */}
      {candidates.length > 0 && (
        <div className="results-list">
          {candidates.map((candidate, index) => {
            const percentage = calculatePercentage(candidate.voteCount);
            const isLeader = leaders && leaders.some(l => l.id === candidate.id) && candidate.voteCount > 0;
            
            return (
              <div 
                key={candidate.id} 
                className={`result-item ${isLeader ? 'leader' : ''}`}
              >
                <div className="candidate-info">
                  <div className="candidate-rank">
                    {isLeader ? '👑' : `#${index + 1}`}
                  </div>
                  <div className="candidate-details">
                    <h4 className="candidate-name">{candidate.name}</h4>
                    <p className="candidate-description">{candidate.description}</p>
                  </div>
                </div>
                
                <div className="vote-stats">
                  <div className="vote-numbers">
                    <span className="vote-count">{candidate.voteCount}</span>
                    <span className="vote-percentage">{percentage}%</span>
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="results-footer">
        <p>
          <small>
            Results are updated in real-time from the blockchain. 
            Last updated: {new Date().toLocaleTimeString()}
          </small>
        </p>
      </div>

      <style jsx>{`
        .results-panel {
          width: 100%;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-content h2 {
          margin-bottom: 0.5rem;
        }

        .header-content p {
          opacity: 0.8;
          margin: 0;
        }

        .results-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .auto-refresh-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .auto-refresh-toggle input[type="checkbox"] {
          margin: 0;
        }

        .results-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
        }

        .summary-card h3 {
          font-size: 2rem;
          margin: 0 0 0.5rem 0;
          font-weight: 700;
        }

        .summary-card p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .leader-announcement {
          background: linear-gradient(45deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2));
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .leader-announcement.tie {
          background: linear-gradient(45deg, rgba(255, 152, 0, 0.2), rgba(255, 111, 97, 0.2));
          border-color: rgba(255, 152, 0, 0.3);
        }

        .leader-announcement h3 {
          margin-bottom: 0.5rem;
        }

        .tied-candidates {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          margin-top: 1rem;
        }

        .leader-name {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .no-votes-message {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .no-votes-message h3 {
          margin-bottom: 1rem;
          opacity: 0.8;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .result-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .result-item.leader {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 193, 7, 0.1));
          border-color: rgba(255, 215, 0, 0.3);
        }

        .result-item:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .candidate-info {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .candidate-rank {
          font-size: 1.5rem;
          font-weight: bold;
          min-width: 40px;
          text-align: center;
        }

        .candidate-details {
          flex: 1;
        }

        .candidate-name {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .candidate-description {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .vote-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .vote-numbers {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 80px;
        }

        .vote-count {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .vote-percentage {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .progress-bar {
          flex: 1;
          height: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(45deg, #667eea, #764ba2);
          transition: width 0.5s ease;
          min-width: 2px;
        }

        .result-item.leader .progress-fill {
          background: linear-gradient(45deg, #ffd700, #ffb300);
        }

        .results-footer {
          margin-top: 2rem;
          text-align: center;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .results-controls {
            justify-content: center;
          }

          .results-summary {
            grid-template-columns: 1fr;
          }

          .candidate-info {
            flex-direction: column;
            gap: 0.5rem;
          }

          .candidate-rank {
            align-self: flex-start;
          }

          .vote-stats {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }

          .vote-numbers {
            align-items: center;
            flex-direction: row;
            justify-content: space-between;
          }

          .tied-candidates {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ResultsPanel;