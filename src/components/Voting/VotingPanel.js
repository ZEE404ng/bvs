import React, { useState, useEffect } from 'react';

const VotingPanel = ({ contract, account, isVotingActive, onVoteSuccess }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load candidates when component mounts or contract changes
  useEffect(() => {
    if (contract) {
      loadCandidates();
      checkVotingStatus();
    }
  }, [contract, account]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      
      const candidateList = await contract.getAllCandidates();
      setCandidates(candidateList);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError('Failed to load candidates. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkVotingStatus = async () => {
    try {
      if (account) {
        const voted = await contract.hasVoted(account);
        setHasVoted(voted);
      }
    } catch (error) {
      console.error('Error checking voting status:', error);
    }
  };

  const handleVote = async (candidateId) => {
    if (!contract || !account) return;
    
    try {
      setVoting(true);
      setError('');
      setSuccess('');
      
      console.log(`Voting for candidate ${candidateId}...`);
      
      // Call the vote function
      const tx = await contract.vote(candidateId);
      
      setSuccess('Transaction submitted! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log('Vote transaction confirmed:', receipt);
      
      // Update local state
      setHasVoted(true);
      setSuccess('Vote cast successfully! 🎉');
      
      // Reload data
      await loadCandidates();
      
      // Notify parent component
      if (onVoteSuccess) {
        onVoteSuccess();
      }
      
    } catch (error) {
      console.error('Voting error:', error);
      
      let errorMessage = 'Failed to cast vote. ';
      
      if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        if (error.message.includes('user rejected')) {
          errorMessage += 'Transaction was cancelled.';
        } else if (error.message.includes('already voted')) {
          errorMessage += 'You have already voted.';
        } else if (error.message.includes('not active')) {
          errorMessage += 'Voting is currently inactive.';
        } else {
          errorMessage += 'Please try again.';
        }
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const confirmVote = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const cancelVote = () => {
    setSelectedCandidate(null);
  };

  const proceedWithVote = () => {
    if (selectedCandidate) {
      handleVote(selectedCandidate.id);
      setSelectedCandidate(null);
    }
  };

  if (loading) {
    return (
      <div className="voting-panel">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem' }}>Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (!isVotingActive) {
    return (
      <div className="voting-panel">
        <div className="alert alert-warning">
          <h3>⏸️ Voting is Currently Inactive</h3>
          <p>The administrator has not yet opened voting for this election. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="voting-panel">
        <div className="alert alert-success">
          <h3>✅ Thank You for Voting!</h3>
          <p>Your vote has been recorded on the blockchain. You can view the current results in the Results tab.</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="voting-panel">
        <div className="alert alert-warning">
          <h3>📝 No Candidates Available</h3>
          <p>There are currently no candidates in this election. Please contact the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-panel">
      <div className="panel-header">
        <h2>🗳️ Cast Your Vote</h2>
        <p>Select your preferred candidate below. Your vote will be permanently recorded on the blockchain.</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="candidates-grid">
        {candidates.map((candidate, index) => (
          <div key={candidate.id} className="candidate-card">
            <div className="candidate-header">
              <div className="candidate-number">#{index + 1}</div>
              <h3 className="candidate-name">{candidate.name}</h3>
            </div>
            
            <p className="candidate-description">{candidate.description}</p>
            
            <div className="candidate-stats">
              <span className="vote-count">
                {Number(candidate.voteCount)} vote{Number(candidate.voteCount) !== 1 ? 's' : ''}
              </span>
            </div>
            
            <button
              className="btn btn-primary vote-button"
              onClick={() => confirmVote(candidate)}
              disabled={voting}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {voting ? (
                <>
                  <span className="loading-spinner"></span>
                  Voting...
                </>
              ) : (
                `Vote for ${candidate.name}`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {selectedCandidate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>🗳️ Confirm Your Vote</h3>
            <p>
              You are about to vote for <strong>{selectedCandidate.name}</strong>.
              This action cannot be undone.
            </p>
            <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>
              Your vote will be recorded on the blockchain and will incur a small gas fee.
            </p>
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelVote}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={proceedWithVote}>
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .voting-panel {
          width: 100%;
          
        }

        .panel-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .panel-header h2 {
          margin-bottom: 0.5rem;
        }

        .panel-header p {
          opacity: 0.8;
          font-size: 1rem;
        }

        .candidates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .candidate-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .candidate-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
        }

        .candidate-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .candidate-number {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .candidate-name {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 600;
        }

        .candidate-description {
          margin: 1rem 0;
          opacity: 0.9;
          line-height: 1.5;
        }

        .candidate-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .vote-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .vote-button:hover {
          background: linear-gradient(45deg, #5a6fd8, #6b42a3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 400px;
          width: 90%;
          text-align: center;
        }

        .modal-content h3 {
          margin-bottom: 1rem;
        }

        .modal-content p {
          margin-bottom: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        @media (max-width: 768px) {
          .candidates-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .candidate-card {
            padding: 1rem;
          }

          .modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default VotingPanel;
