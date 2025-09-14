import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import components (existing)
import WalletConnection from './components/WalletConnection';
import AdminPanel from './components/Admin/AdminPanel';
import VotingPanel from './components/Voting/VotingPanel';
import ResultsPanel from './components/Results/ResultsPanel';

// Import fraud detection component (NEW)
import FraudDetectionPanel from './components/FraudDetection/FraudDetectionPanel';

// Try to load deployment info, fallback to hardcoded address
let CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Default fallback
let CONTRACT_ABI = [
  "function addCandidate(string memory _name, string memory _description) public",
  "function vote(uint256 _candidateId) public",
  "function toggleVoting() public",
  "function getCandidate(uint256 _candidateId) public view returns (string memory name, string memory description, uint256 voteCount)",
  "function getAllCandidates() public view returns (tuple(uint256 id, string name, string description, uint256 voteCount, bool exists)[])",
  "function getResults() public view returns (uint256[] memory votes)",
  "function hasVoted(address _voter) public view returns (bool)",
  "function getVotingStats() public view returns (uint256 totalCandidates, uint256 totalVotesCast, bool isVotingActive)",
  "function owner() public view returns (address)",
  "function candidateCount() public view returns (uint256)",
  "function totalVotes() public view returns (uint256)",
  "function votingActive() public view returns (bool)",
  "event CandidateAdded(uint256 indexed candidateId, string name)",
  "event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp)",
  "event VotingStatusChanged(bool active)"
];

// Try to load from deployment file if available
try {
  const deploymentInfo = require('./contracts/deployment.json');
  if (deploymentInfo && deploymentInfo.contractAddress) {
    CONTRACT_ADDRESS = deploymentInfo.contractAddress;
    if (deploymentInfo.contractABI) {
      CONTRACT_ABI = deploymentInfo.contractABI;
    }
  }
} catch (error) {
  console.log('No deployment file found, using fallback address');
}

// NEW: Fraud Detection Utility Functions
const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return '127.0.0.1'; // Fallback
  }
};

const getDeviceFingerprint = () => {
  try {
    // Simple device fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Create simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    console.error('Device fingerprinting failed:', error);
    return 'unknown_device';
  }
};

// NEW: Fraud Detection API Functions
const analyzeFraudBeforeVoting = async (voteData) => {
  try {
    console.log('🔍 Analyzing vote for fraud patterns...');
    
    const response = await fetch('http://127.0.0.1:8001/analyze-vote', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(voteData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Fraud analysis completed:', result);
    return result;
    
  } catch (error) {
    console.warn('⚠️ Fraud detection service unavailable:', error.message);
    // Return safe defaults if fraud detection fails
    return {
      vote_id: voteData.vote_id,
      is_fraud: false,
      fraud_probability: 0.0,
      confidence: 'unavailable',
      fraud_indicators: [],
      error: error.message
    };
  }
};

function App() {
  // Existing state management
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('voting');
  const [contractStats, setContractStats] = useState({
    totalCandidates: 0,
    totalVotesCast: 0,
    isVotingActive: false
  });
  const [connectionError, setConnectionError] = useState('');

  // NEW: Fraud Detection State
  const [sessionStartTime] = useState(Date.now());
  const [fraudDetectionEnabled, setFraudDetectionEnabled] = useState(true);
  const [fraudStats, setFraudStats] = useState({
    totalAlertsToday: 0,
    systemStatus: 'checking'
  });

  // NEW: Check Fraud Detection System Status
  const checkFraudDetectionStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8001/stats');
      if (response.ok) {
        const stats = await response.json();
        setFraudStats({
          totalAlertsToday: stats.total_alerts || 0,
          systemStatus: stats.model_loaded ? 'active' : 'inactive'
        });
        setFraudDetectionEnabled(true);
      }
    } catch (error) {
      console.log('Fraud detection system not available');
      setFraudStats({
        totalAlertsToday: 0,
        systemStatus: 'unavailable'
      });
      setFraudDetectionEnabled(false);
    }
  };

  // Initialize web3 connection (EXISTING FUNCTION - UNCHANGED)
  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setLoading(true);
        setConnectionError('');
        
        console.log('Initializing Web3 connection...');
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
          throw new Error('No accounts found. Please connect your wallet.');
        }
        
        // Create provider and signer
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        const address = await web3Signer.getAddress();
        
        console.log('Connected to account:', address);
        console.log('Using contract address:', CONTRACT_ADDRESS);
        
        // Create contract instance
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Signer);
        
        // Test contract connection
        try {
          const owner = await contractInstance.owner();
          console.log('Contract owner:', owner);
          
          // Set state
          setProvider(web3Provider);
          setSigner(web3Signer);
          setAccount(address);
          setContract(contractInstance);
          
          // Check if user is owner
          setIsOwner(owner.toLowerCase() === address.toLowerCase());
          
          // Load contract stats
          await loadContractStats(contractInstance);
          
          console.log('Web3 initialized successfully');
          
        } catch (contractError) {
          console.error('Contract connection error:', contractError);
          throw new Error(`Failed to connect to smart contract. Please check if the contract is deployed at ${CONTRACT_ADDRESS}`);
        }
        
      } catch (error) {
        console.error('Error initializing Web3:', error);
        
        let errorMessage = 'Failed to connect to wallet. ';
        
        if (error.message.includes('No accounts')) {
          errorMessage = 'No wallet accounts found. Please connect your wallet.';
        } else if (error.message.includes('smart contract')) {
          errorMessage = error.message;
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Connection was rejected. Please approve the connection request.';
        } else {
          errorMessage += 'Please make sure MetaMask is installed and connected to the correct network.';
        }
        
        setConnectionError(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      setConnectionError('MetaMask is not installed. Please install MetaMask to use this application.');
    }
  };

  // Load contract statistics (EXISTING FUNCTION - UNCHANGED)
  const loadContractStats = async (contractInstance = contract) => {
    if (!contractInstance) return;
    
    try {
      console.log('Loading contract stats...');
      const stats = await contractInstance.getVotingStats();
      
      const newStats = {
        totalCandidates: Number(stats.totalCandidates),
        totalVotesCast: Number(stats.totalVotesCast),
        isVotingActive: stats.isVotingActive
      };
      
      console.log('Contract stats:', newStats);
      setContractStats(newStats);
    } catch (error) {
      console.error('Error loading contract stats:', error);
    }
  };

  // NEW: Enhanced Vote Handler with Fraud Detection
  const handleVoteWithFraudDetection = async (candidateId, candidateName = 'Unknown') => {
    if (!contract || !account) return;
    
    try {
      setLoading(true);
      
      // Generate unique vote ID
      const voteId = `VOTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare vote data for fraud analysis
      const voteData = {
        vote_id: voteId,
        voter_id: account,
        candidate_id: candidateId,
        location_id: 1, // Default location - you can make this dynamic
        timestamp: new Date().toISOString(),
        voting_method: 'electronic',
        ip_address: await getUserIP(),
        session_duration: Math.floor((Date.now() - sessionStartTime) / 1000),
        device_fingerprint: getDeviceFingerprint(),
        transaction_hash: '' // Will be filled after blockchain transaction
      };
      
      console.log(`🗳️ Voting for ${candidateName} (ID: ${candidateId})`);
      
      // Analyze for fraud if system is available
      if (fraudDetectionEnabled) {
        console.log('🔍 Running fraud detection analysis...');
        
        const fraudResult = await analyzeFraudBeforeVoting(voteData);
        
        if (fraudResult && !fraudResult.error) {
          const fraudProbability = fraudResult.fraud_probability || 0;
          const indicators = fraudResult.fraud_indicators || [];
          
          console.log(`📊 Fraud analysis result: ${(fraudProbability * 100).toFixed(1)}% fraud probability`);
          
          // Show fraud warning for medium to high probability
          if (fraudProbability > 0.5) {
            const severityLevel = fraudProbability > 0.8 ? 'HIGH' : 'MEDIUM';
            const indicatorText = indicators.length > 0 ? `\n\nReasons:\n• ${indicators.join('\n• ')}` : '';
            
            const warningMessage = `⚠️ FRAUD ALERT - ${severityLevel} RISK\n\nThis vote has been flagged as potentially suspicious:\n\n🚨 Fraud Probability: ${(fraudProbability * 100).toFixed(1)}%${indicatorText}\n\nThis could be due to:\n• Multiple voting attempts\n• Unusual timing or location\n• Network-based irregularities\n\nDo you want to proceed with voting anyway?`;
            
            if (!window.confirm(warningMessage)) {
              console.log('❌ Vote cancelled by user due to fraud warning');
              return;
            }
          }
          
          // Block vote if extremely high fraud probability
          if (fraudProbability > 0.9) {
            const blockMessage = `🚫 VOTE BLOCKED\n\nThis vote has been automatically blocked due to very high fraud probability (${(fraudProbability * 100).toFixed(1)}%).\n\nReasons: ${indicators.join(', ')}\n\nIf you believe this is an error, please contact the election administrator.`;
            alert(blockMessage);
            console.log('🚫 Vote blocked due to high fraud probability');
            return;
          }
          
          // Log successful fraud check
          if (fraudProbability < 0.3) {
            console.log('✅ Vote passed fraud detection checks');
          }
        }
      }
      
      console.log('🔗 Submitting vote to blockchain...');
      
      // Proceed with blockchain transaction
      const tx = await contract.vote(candidateId);
      console.log('📤 Transaction submitted:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);
      
      // Update vote data with transaction hash for final logging
      if (fraudDetectionEnabled) {
        voteData.transaction_hash = receipt.hash;
        // Optionally log the successful vote (don't await to avoid blocking UI)
        analyzeFraudBeforeVoting(voteData).catch(console.warn);
      }
      
      // Update UI state
      await loadContractStats();
      
      // Success message
      alert(`✅ Vote Successfully Cast!\n\nCandidate: ${candidateName}\nTransaction: ${receipt.hash}\nBlock: ${receipt.blockNumber}`);
      
    } catch (error) {
      console.error('❌ Voting error:', error);
      
      let errorMessage = 'Failed to cast vote. ';
      
      if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        if (error.message.includes('user rejected')) {
          errorMessage += 'Transaction was cancelled by user.';
        } else if (error.message.includes('already voted')) {
          errorMessage += 'You have already voted in this election.';
        } else if (error.message.includes('not active')) {
          errorMessage += 'Voting is currently not active.';
        } else {
          errorMessage += 'Please try again or contact support.';
        }
      }
      
      alert(`❌ Voting Failed\n\n${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle account changes (EXISTING - UNCHANGED)
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length > 0) {
          initializeWeb3();
        } else {
          // User disconnected
          setAccount('');
          setContract(null);
          setProvider(null);
          setSigner(null);
          setIsOwner(false);
          setConnectionError('');
        }
      };

      const handleChainChanged = (chainId) => {
        console.log('Chain changed:', chainId);
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Auto-connect and check fraud detection status (ENHANCED)
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            console.log('Auto-connecting to previously connected account');
            initializeWeb3();
          }
        } catch (error) {
          console.log('Auto-connect failed:', error);
        }
      }
    };

    // Check both blockchain and fraud detection status
    checkConnection();
    checkFraudDetectionStatus();

    // Recheck fraud detection status every 30 seconds
    const fraudCheckInterval = setInterval(checkFraudDetectionStatus, 30000);
    
    return () => clearInterval(fraudCheckInterval);
  }, []);

  // Refresh data function (EXISTING - UNCHANGED)
  const refreshData = async () => {
    await loadContractStats();
  };

  // Network info (EXISTING - UNCHANGED)
  const getNetworkInfo = () => {
    return {
      contractAddress: CONTRACT_ADDRESS,
      isTestnet: true
    };
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🗳️ <span className="TRIAL">Blockchain</span> Voting <span className="TRIAL">System</span></h1>
          <p>Secure • Transparent • Decentralized {fraudDetectionEnabled && '• Fraud Protected'}</p>
        </div>
        <div className="header-controls">
          <WalletConnection 
            account={account} 
            onConnect={initializeWeb3}
            loading={loading}
            error={connectionError}
          />
          {/* NEW: Fraud Detection Status Indicator */}
          {!isOwner && account && (
            <div className="fraud-status-mini">
              <span className={`status-dot ${fraudStats.systemStatus}`}></span>
              <span className="status-text">
                {fraudStats.systemStatus === 'active' ? 'Protected' : 
                 fraudStats.systemStatus === 'inactive' ? 'Limited Protection' : 'Checking...'}
              </span>
            </div>
          )}
        </div>
      </header>

      {connectionError && !account && (
        <div className="main-container">
          <div className="alert alert-error">
            <h3>⚠️ Connection Error</h3>
            <p>{connectionError}</p>
            {!window.ethereum && (
              <div style={{ marginTop: '1rem' }}>
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Install MetaMask
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {account && contract && (
        <div className="main-container">
          {/* Network Info */}
          <div className="network-info">
            <small>
              Connected to contract: <code>{getNetworkInfo().contractAddress}</code>
              {isOwner && <span className="owner-badge">👑 Owner</span>}
              {fraudDetectionEnabled && (
                <span className="fraud-badge">🛡️ Fraud Detection Active</span>
              )}
            </small>
          </div>

          {/* Stats Display */}
          <div className="stats-container">
            <div className="stat-card">
              <h3>{contractStats.totalCandidates}</h3>
              <p>Total Candidates</p>
            </div>
            <div className="stat-card">
              <h3>{contractStats.totalVotesCast}</h3>
              <p>Votes Cast</p>
            </div>
            <div className="stat-card">
              <h3>
                <span className={`status-indicator ${contractStats.isVotingActive ? 'active' : 'inactive'}`}>
                  {contractStats.isVotingActive ? 'Active' : 'Inactive'}
                </span>
              </h3>
              <p>Voting Status</p>
            </div>
            {/* NEW: Fraud Detection Stats */}
            {fraudDetectionEnabled && (
              <div className="stat-card">
                <h3>{fraudStats.totalAlertsToday}</h3>
                <p>Fraud Alerts Today</p>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'voting' ? 'active' : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              🗳️ Vote
            </button>
            <button 
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              📊 Results
            </button>
            {isOwner && (
              <>
                <button 
                  className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  ⚙️ Admin
                </button>
                {/* NEW: Fraud Detection Tab for Admins */}
                <button 
                  className={`tab-button ${activeTab === 'fraud' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fraud')}
                >
                  🛡️ Fraud Detection
                </button>
              </>
            )}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'voting' && (
              <VotingPanel 
                contract={contract}
                account={account}
                isVotingActive={contractStats.isVotingActive}
                onVoteSuccess={refreshData}
                // NEW: Pass fraud detection handler
                onVote={handleVoteWithFraudDetection}
                fraudDetectionEnabled={fraudDetectionEnabled}
              />
            )}
            
            {activeTab === 'results' && (
              <ResultsPanel 
                contract={contract}
                totalVotes={contractStats.totalVotesCast}
              />
            )}
            
            {activeTab === 'admin' && isOwner && (
              <AdminPanel 
                contract={contract}
                isVotingActive={contractStats.isVotingActive}
                onUpdate={refreshData}
              />
            )}
            
            {/* NEW: Fraud Detection Panel for Admins */}
            {activeTab === 'fraud' && isOwner && (
              <FraudDetectionPanel 
                isAdmin={true}
                fraudDetectionEnabled={fraudDetectionEnabled}
                onRefreshStatus={checkFraudDetectionStatus}
              />
            )}
          </div>
        </div>
      )}

      {!account && !connectionError && (
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>Welcome to the Nigerian Blockchain Voting System</h2>
            <p>Connect any Ethereum based wallet to participate in secure, transparent voting, using Blockchain technology</p>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <div>
                  <h4>Tamper-proof Records</h4>
                  <p>All votes are permanently recorded on the blockchain</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <div>
                  <h4>Real-time Results</h4>
                  <p>See live vote counts as they happen</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <div>
                  <h4>Complete Transparency</h4>
                  <p>All voting activity is publicly verifiable</p>
                </div>
              </div>
              {/* NEW: Fraud Detection Feature */}
              <div className="feature-item">
                <span className="feature-icon">🛡️</span>
                <div>
                  <h4>AI Fraud Detection</h4>
                  <p>Advanced machine learning monitors for suspicious voting patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>Built with ❤️ using React, Ethereum, and Hardhat</p>
        <p>
          <small>
            Smart Contract: <code>{CONTRACT_ADDRESS}</code>
            {fraudDetectionEnabled && <span> • Fraud Detection: Active 🛡️</span>}
          </small>
        </p>
      </footer>

      {/* NEW: Additional Styles for Fraud Detection */}
      <style jsx>{`
        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .fraud-status-mini {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 0.8rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.active {
          background: #4caf50;
          animation: pulse 2s infinite;
        }

        .status-dot.inactive {
          background: #ff9800;
        }

        .status-dot.unavailable {
          background: #f44336;
        }

        .fraud-badge {
          margin-left: 1rem;
          background: linear-gradient(45deg, #4caf50, #8bc34a);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .network-info {
          text-align: center;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          font-family: monospace;
        }

        .owner-badge {
          margin-left: 1rem;
          background: linear-gradient(45deg, #ffd700, #ffb300);
          color: #333;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .status-indicator.active {
          color: #4caf50;
        }

        .status-indicator.inactive {
          color: #f44336;
        }

        .features-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feature-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .feature-item h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
        }

        .feature-item p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .header-controls {
            flex-direction: column;
            gap: 0.5rem;
          }

          .fraud-status-mini {
            display: none; /* Hide on mobile for space */
          }
        }
      `}</style>
    </div>
  );
}

export default App;