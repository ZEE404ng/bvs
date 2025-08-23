import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import components
import WalletConnection from './components/WalletConnection';
import AdminPanel from './components/Admin/AdminPanel';
import VotingPanel from './components/Voting/VotingPanel';
import ResultsPanel from './components/Results/ResultsPanel';

// Contract configuration
const CONTRACT_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Update this after deployment
const CONTRACT_ABI = [
  // Add your contract ABI here - we'll update this after deployment
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
  "function votingActive() public view returns (bool)"
];

function App() {
  // State management
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('voting');
  const [contractStats, setContractStats] = useState({
    totalCandidates: 0,
    totalVotesCast: 0,
    isVotingActive: false
  });

  // Initialize web3 connection
  const initializeWeb3 = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setLoading(true);
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const address = await signer.getAddress();
        
        // Create contract instance
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        // Set state
        setProvider(web3Provider);
        setAccount(address);
        setContract(contractInstance);
        
        // Check if user is owner
        const owner = await contractInstance.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
        
        // Load contract stats
        await loadContractStats(contractInstance);
        
        console.log('Web3 initialized successfully');
      } catch (error) {
        console.error('Error initializing Web3:', error);
        alert('Failed to connect to wallet. Please make sure MetaMask is installed and connected.');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please install MetaMask to use this application');
    }
  };

  // Load contract statistics
  const loadContractStats = async (contractInstance = contract) => {
    if (!contractInstance) return;
    
    try {
      const stats = await contractInstance.getVotingStats();
      setContractStats({
        totalCandidates: Number(stats.totalCandidates),
        totalVotesCast: Number(stats.totalVotesCast),
        isVotingActive: stats.isVotingActive
      });
    } catch (error) {
      console.error('Error loading contract stats:', error);
    }
  };

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          initializeWeb3();
        } else {
          setAccount('');
          setContract(null);
          setProvider(null);
          setIsOwner(false);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Refresh data function
  const refreshData = async () => {
    await loadContractStats();
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
        />
      </header>

      {account && (
        <div className="main-container">
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
              <h3>{contractStats.isVotingActive ? 'Active' : 'Inactive'}</h3>
              <p>Voting Status</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'voting' ? 'active' : ''}`}
              onClick={() => setActiveTab('voting')}
            >
              Vote
            </button>
            <button 
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
            {isOwner && (
              <button 
                className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin
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

      {!account && (
        <div className="welcome-container">
          <div className="welcome-content">
            <h2>Welcome to the Blockchain Voting System</h2>
            <p>Connect your MetaMask wallet to participate in secure, transparent voting.</p>
            <ul>
              <li>✅ Tamper-proof voting records</li>
              <li>✅ Real-time results</li>
              <li>✅ Complete transparency</li>
              <li>✅ Fraud detection algorithms</li>
            </ul>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>Built with ❤️ using React, Ethereum, and Hardhat</p>
      </footer>
    </div>
  );
}

export default App;