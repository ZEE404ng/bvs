import React, { useState, useEffect } from 'react';

const AdminPanel = ({ contract, isVotingActive, onUpdate }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [candidateName, setCandidateName] = useState('');
  const [candidateDescription, setCandidateDescription] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [togglingVoting, setTogglingVoting] = useState(false);

  useEffect(() => {
    if (contract) {
      loadCandidates();
    }
  }, [contract]);

  const loadCandidates = async () => {
    try {
      setError('');
      const candidateList = await contract.getAllCandidates();
      setCandidates(candidateList.map(candidate => ({
        id: Number(candidate.id),
        name: candidate.name,
        description: candidate.description,
        voteCount: Number(candidate.voteCount),
        exists: candidate.exists
      })));
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError('Failed to load candidates.');
    }
  };

  const addCandidate = async (e) => {
    e.preventDefault();
    
    if (!candidateName.trim() || !candidateDescription.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setAddingCandidate(true);
      setError('');
      setSuccess('');

      console.log('Adding candidate:', candidateName, candidateDescription);
      
      const tx = await contract.addCandidate(candidateName.trim(), candidateDescription.trim());
      
      setSuccess('Transaction submitted! Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('Candidate added:', receipt);
      
      // Clear form
      setCandidateName('');
      setCandidateDescription('');
      
      // Reload data
      await loadCandidates();
      
      setSuccess('Candidate added successfully! 🎉');
      
      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('Error adding candidate:', error);
      
      let errorMessage = 'Failed to add candidate. ';
      
      if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        if (error.message.includes('user rejected')) {
          errorMessage += 'Transaction was cancelled.';
        } else {
          errorMessage += 'Please try again.';
        }
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setAddingCandidate(false);
    }
  };

  const toggleVoting = async () => {
    try {
      setTogglingVoting(true);
      setError('');
      setSuccess('');

      const action = isVotingActive ? 'stopping' : 'starting';
      console.log(`${action} voting...`);
      
      const tx = await contract.toggleVoting();
      
      setSuccess(`Transaction submitted! ${action === 'starting' ? 'Starting' : 'Stopping'} voting...`);
      
      const receipt = await tx.wait();
      console.log('Voting toggled:', receipt);
      
      setSuccess(`Voting ${isVotingActive ? 'stopped' : 'started'} successfully! 🎉`);
      
      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('Error toggling voting:', error);
      
      let errorMessage = 'Failed to toggle voting. ';
      
      if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        if (error.message.includes('user rejected')) {
          errorMessage += 'Transaction was cancelled.';
        } else {
          errorMessage += 'Please try again.';
        }
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setTogglingVoting(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>⚙️ Admin Panel</h2>
        <p>Manage candidates and control voting</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button 
            className="close-btn"
            onClick={clearMessages}
            style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button 
            className="close-btn"
            onClick={clearMessages}
            style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="admin-sections">
        {/* Voting Control Section */}
        <div className="admin-section">
          <h3>🗳️ Voting Control</h3>
          <div className="voting-status">
            <div className="status-indicator">
              <span className={`status-dot ${isVotingActive ? 'active' : 'inactive'}`}></span>
              <span className="status-text">
                Voting is currently <strong>{isVotingActive ? 'ACTIVE' : 'INACTIVE'}</strong>
              </span>
            </div>
            
            <button
              className={`btn ${isVotingActive ? 'btn-danger' : 'btn-success'}`}
              onClick={toggleVoting}
              disabled={togglingVoting}
            >
              {togglingVoting ? (
                <>
                  <span className="loading-spinner"></span>
                  {isVotingActive ? 'Stopping...' : 'Starting...'}
                </>
              ) : (
                <>
                  {isVotingActive ? '⏸️ Stop Voting' : '▶️ Start Voting'}
                </>
              )}
            </button>
          </div>
          
          <div className="voting-info">
            <p>
              <strong>Note:</strong> {isVotingActive 
                ? 'Users can currently cast votes. Stop voting to prevent new votes.' 
                : 'Users cannot vote while voting is inactive. Start voting to allow participation.'
              }
            </p>
          </div>
        </div>

        {/* Add Candidate Section */}
        <div className="admin-section">
          <h3>➕ Add New Candidate</h3>
          <form onSubmit={addCandidate} className="candidate-form">
            <div className="form-group">
              <label htmlFor="candidateName" className="form-label">
                Candidate Name *
              </label>
              <input
                type="text"
                id="candidateName"
                className="form-input"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter candidate's full name"
                maxLength={100}
                disabled={addingCandidate}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="candidateDescription" className="form-label">
                Description/Platform *
              </label>
              <textarea
                id="candidateDescription"
                className="form-input"
                value={candidateDescription}
                onChange={(e) => setCandidateDescription(e.target.value)}
                placeholder="Brief description of the candidate's platform or qualifications"
                rows={3}
                maxLength={500}
                disabled={addingCandidate}
              />
              <small className="char-count">
                {candidateDescription.length}/500 characters
              </small>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addingCandidate || !candidateName.trim() || !candidateDescription.trim()}
            >
              {addingCandidate ? (
                <>
                  <span className="loading-spinner"></span>
                  Adding Candidate...
                </>
              ) : (
                '➕ Add Candidate'
              )}
            </button>
          </form>
        </div>

        {/* Current Candidates Section */}
        <div className="admin-section">
          <h3>👥 Current Candidates ({candidates.length})</h3>
          
          {candidates.length === 0 ? (
            <div className="no-candidates">
              <p>No candidates have been added yet.</p>
              <p><small>Add candidates using the form above before starting voting.</small></p>
            </div>
          ) : (
            <div className="candidates-list">
              {candidates.map((candidate, index) => (
                <div key={candidate.id} className="candidate-item">
                  <div className="candidate-info">
                    <div className="candidate-header">
                      <span className="candidate-number">#{index + 1}</span>
                      <h4 className="candidate-name">{candidate.name}</h4>
                    </div>
                    <p className="candidate-description">{candidate.description}</p>
                  </div>
                  
                  <div className="candidate-stats">
                    <div className="vote-count">
                      <strong>{candidate.voteCount}</strong>
                      <small>vote{candidate.voteCount !== 1 ? 's' : ''}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="admin-section">
          <h3>ℹ️ System Information</h3>
          <div className="system-info">
            <div className="info-item">
              <span className="info-label">Total Candidates:</span>
              <span className="info-value">{candidates.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Votes Cast:</span>
              <span className="info-value">{candidates.reduce((sum, c) => sum + c.voteCount, 0)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Voting Status:</span>
              <span className={`info-value ${isVotingActive ? 'active' : 'inactive'}`}>
                {isVotingActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-panel {
          width: 100%;
        }

        .admin-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .admin-header h2 {
          margin-bottom: 0.5rem;
        }

        .admin-header p {
          opacity: 0.8;
          margin: 0;
        }

        .admin-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .admin-section {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .admin-section h3 {
          margin: 0 0 1rem 0;
          color: white;
        }

        /* Voting Control Styles */
        .voting-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.active {
          background: #4caf50;
        }

        .status-dot.inactive {
          background: #f44336;
        }

        .voting-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 1rem;
          border-left: 3px solid rgba(255, 255, 255, 0.3);
        }

        .voting-info p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        /* Form Styles */
        .candidate-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .char-count {
          opacity: 0.6;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        /* Candidates List */
        .no-candidates {
          text-align: center;
          padding: 2rem;
          opacity: 0.7;
        }

        .candidates-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .candidate-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .candidate-info {
          flex: 1;
        }

        .candidate-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .candidate-number {
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .candidate-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .candidate-description {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .candidate-stats {
          text-align: center;
        }

        .vote-count strong {
          display: block;
          font-size: 1.2rem;
        }

        .vote-count small {
          opacity: 0.7;
          font-size: 0.8rem;
        }

        /* System Info */
        .system-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        }

        .info-value {
          font-weight: 600;
        }

        .info-value.active {
          color: #4caf50;
        }

        .info-value.inactive {
          color: #f44336;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .voting-status {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .candidate-item {
            flex-direction: column;
            align-items: stretch;
          }

          .candidate-stats {
            align-self: flex-end;
          }

          .system-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;