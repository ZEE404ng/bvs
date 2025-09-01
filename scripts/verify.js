// Create this as scripts/verify.js
const { ethers } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  console.log(`🔍 Checking contract at: ${CONTRACT_ADDRESS}`);

  // Check if contract exists
  const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
  
  if (code === "0x") {
    console.error("❌ No contract found at this address!");
    return;
  }

  console.log("✅ Contract found!");

  // Connect to contract
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  const contract = VotingSystem.attach(CONTRACT_ADDRESS);

  try {
    const owner = await contract.owner();
    const candidateCount = await contract.candidateCount();
    const votingActive = await contract.votingActive();

    console.log("📊 Contract Status:");
    console.log(`👑 Owner: ${owner}`);
    console.log(`👥 Candidates: ${candidateCount}`);
    console.log(`🗳️ Voting Active: ${votingActive}`);
    console.log("✅ Contract is working!");
    
  } catch (error) {
    console.error("❌ Contract error:", error.message);
  }
}

main().catch(console.error);