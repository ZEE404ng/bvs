import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import components
import WalletConnection from './components/WalletConnection';
import AdminPanel from './components/Admin/AdminPanel';
import VotingPanel from './components/Voting/VotingPanel';
import ResultsPanel from './components/Results/ResultsPanel';

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

function App() {
  // State management
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

  // Initialize web3 connection
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

  // Load contract statistics
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

  // Handle account changes
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

  // Auto-connect if previously connected
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

    checkConnection();
  }, []);

  // Refresh data function
  const refreshData = async () => {
    await loadContractStats();
  };

  // Network info
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
          <h1>🗳️ Blockchain Voting System</h1>
          <p>Secure • Transparent • Decentralized</p>
        </div>
        <WalletConnection 
          account={account} 
          onConnect={initializeWeb3}
          loading={loading}
          error={connectionError}
        />
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
              <button 
                className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                ⚙️ Admin
              </button>
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
          </div>
        </div>
      )}

      {!account && !connectionError && (
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>Welcome to the Blockchain Voting System</h2>
            <p>Connect your MetaMask wallet to participate in secure, transparent voting.</p>
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
              <div className="feature-item">
                <span className="feature-icon">🛡️</span>
                <div>
                  <h4>Fraud Detection</h4>
                  <p>Advanced algorithms monitor for suspicious activity</p>
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
          </small>
        </p>
      </footer>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}

export default App;