const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...");
  
  // Get the contract factory
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  
  // Deploy the contract
  console.log("📦 Deploying VotingSystem contract...");
  const votingSystem = await VotingSystem.deploy();
  
  // Wait for deployment to complete
  await votingSystem.waitForDeployment();
  
  const contractAddress = await votingSystem.getAddress();
  const ownerAddress = await votingSystem.owner();
  
  console.log("✅ VotingSystem deployed to:", contractAddress);
  console.log("🔑 Deployed by:", ownerAddress);
  //last updated 11th september
  
  // Add some sample candidates
  console.log("\n🗳️  Adding sample candidates...");
  await votingSystem.addCandidate("Ugbonna Prince", "Experienced leader focused on education reform");
  await votingSystem.addCandidate("Zainab Abdulwahab", "New Monet with a philantropic side and a love for justice");
  await votingSystem.addCandidate("Basit Adetunde", "Tech entrepreneur promoting digital innovation");
  await votingSystem.addCandidate("Ngbede Comfort", "Community organizer advocating for social justice");
  
  console.log("✅ Sample candidates added!");
  
  // Activate voting
  await votingSystem.toggleVoting();
  console.log("✅ Voting activated!");
  
  // Display contract info
  const stats = await votingSystem.getVotingStats();
  console.log("\n📊 Contract Status:");
  console.log(`- Total Candidates: ${stats.totalCandidates}`);
  console.log(`- Total Votes: ${stats.totalVotesCast}`);
  console.log(`- Voting Active: ${stats.isVotingActive}`);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    ownerAddress: ownerAddress,
    network: network.name,
    chainId: network.config.chainId || 31337,
    timestamp: new Date().toISOString(),
    contractABI: [
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
    ]
  };
  
  // Save to file for frontend use
  const deploymentPath = path.join(__dirname, '..', 'src', 'contracts', 'deployment.json');
  const contractsDir = path.dirname(deploymentPath);
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to: src/contracts/deployment.json");
  console.log("\n📋 Copy this address for your frontend:");
  console.log(`CONTRACT_ADDRESS = "${contractAddress}"`);
  
  // Generate environment file update
  const envUpdate = `
# Add this to your .env file:
REACT_APP_CONTRACT_ADDRESS=${contractAddress}
REACT_APP_OWNER_ADDRESS=${ownerAddress}
REACT_APP_NETWORK_NAME=${network.name}
`;
  
  console.log("\n🔧 Environment variables:");
  console.log(envUpdate);
  
  // Verify contract is working
  console.log("\n🔍 Verifying contract functionality...");
  const candidateCount = await votingSystem.candidateCount();
  const isActive = await votingSystem.votingActive();
  
  console.log(`✅ Contract verification complete:`);
  console.log(`   - Candidates: ${candidateCount}`);
  console.log(`   - Voting Active: ${isActive}`);
  console.log(`   - Owner: ${ownerAddress}`);
}

main()
  .then(() => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });