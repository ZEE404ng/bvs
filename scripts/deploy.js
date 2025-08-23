const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");
  
  // Get the contract factory
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  
  // Deploy the contract
  console.log("📦 Deploying VotingSystem contract...");
  const votingSystem = await VotingSystem.deploy();
  
  // Wait for deployment to complete
  await votingSystem.waitForDeployment();
  
  console.log("✅ VotingSystem deployed to:", await votingSystem.getAddress());
  console.log("🔑 Deployed by:", await votingSystem.owner());
  
  // Add some sample candidates
  console.log("\n🗳️  Adding sample candidates...");
  await votingSystem.addCandidate("Alice Johnson", "Experienced leader focused on education reform");
  await votingSystem.addCandidate("Bob Smith", "Tech entrepreneur promoting digital innovation");
  await votingSystem.addCandidate("Carol Williams", "Community organizer advocating for social justice");
  
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
    address: await votingSystem.getAddress(),
    owner: await votingSystem.owner(),
    network: "localhost",
    timestamp: new Date().toISOString()
  };
  
  console.log("\n💾 Save this deployment info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });