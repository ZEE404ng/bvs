const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  // Get signers (test accounts)
  const [owner, voter1, voter2, voter3] = await ethers.getSigners();
  
  // Connect to the deployed contract
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const votingSystem = VotingSystem.attach(contractAddress);
  
  console.log("🔗 Connected to VotingSystem at:", contractAddress);
  
  // Display candidates
  console.log("\n📋 Current Candidates:");
  const candidates = await votingSystem.getAllCandidates();
  candidates.forEach((candidate, index) => {
    console.log(`${index + 1}. ${candidate.name} - ${candidate.description} (${candidate.voteCount} votes)`);
  });
  
  // Cast some votes
  console.log("\n🗳️  Casting votes...");
  
  try {
    await votingSystem.connect(voter1).vote(1);
    console.log("✅ Voter1 voted for candidate 1");
    
    await votingSystem.connect(voter2).vote(2);
    console.log("✅ Voter2 voted for candidate 2");
    
    await votingSystem.connect(voter3).vote(1);
    console.log("✅ Voter3 voted for candidate 1");
    
  } catch (error) {
    console.log("❌ Voting error:", error.reason);
  }
  
  // Display updated results
  console.log("\n📊 Updated Results:");
  const updatedCandidates = await votingSystem.getAllCandidates();
  updatedCandidates.forEach((candidate, index) => {
    console.log(`${index + 1}. ${candidate.name}: ${candidate.voteCount} votes`);
  });
  
  // Display voting statistics
  const stats = await votingSystem.getVotingStats();
  console.log("\n📈 Voting Statistics:");
  console.log(`- Total Candidates: ${stats.totalCandidates}`);
  console.log(`- Total Votes Cast: ${stats.totalVotesCast}`);
  console.log(`- Voting Active: ${stats.isVotingActive}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });