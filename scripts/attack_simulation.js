const { ethers } = require("hardhat");

class AttackSimulator {
  constructor(contractAddress, contractABI) {
    this.contractAddress = contractAddress;
    this.contractABI = contractABI;
    this.attackResults = [];
    
    // 🧠 LEARNING POINT: Why do we need these parameters?
    // Think: What data would help us measure attack success?
  }

  /**
   * 🎯 ATTACK TYPE 1: Rapid Fire Voting
   * 
   * LEARNING QUESTIONS:
   * - What makes this "suspicious"?
   * - How might legitimate users behave differently?
   * - What patterns should your AI look for?
   */
  async rapidFireAttack(targetCandidate, votesCount = 10, delayMs = 100) {
    console.log(`🚨 STARTING ATTACK: Rapid Fire (${votesCount} votes, ${delayMs}ms delay)`);
    
    try {
      // Get signers (these represent different wallet accounts)
      const signers = await ethers.getSigners();
      
      // 🤔 THINK: Why do we slice to get multiple accounts?
      const attackAccounts = signers.slice(1, votesCount + 1); // Skip owner account
      
      const startTime = Date.now();
      const promises = []; // Store all vote promises
      
      // 🏗️ BUILD UP: Start with understanding this loop
      for (let i = 0; i < attackAccounts.length; i++) {
        const account = attackAccounts[i];
        
        // Create contract instance for this specific account
        const contract = new ethers.Contract(
          this.contractAddress, 
          this.contractABI, 
          account
        );
        
        // 🎯 KEY LEARNING: Why do we add artificial delay?
        const attackPromise = new Promise(async (resolve, reject) => {
          try {
            // Simulate delay between votes
            await this.sleep(i * delayMs);
            
            console.log(`👤 Account ${i + 1} voting for candidate ${targetCandidate}...`);
            
            const tx = await contract.vote(targetCandidate);
            const receipt = await tx.wait();
            
            resolve({
              accountIndex: i,
              txHash: receipt.hash,
              timestamp: Date.now(),
              gasUsed: receipt.gasUsed.toString()
            });
            
          } catch (error) {
            reject({
              accountIndex: i,
              error: error.message,
              timestamp: Date.now()
            });
          }
        });
        
        promises.push(attackPromise);
      }
      
      // Execute all votes simultaneously
      console.log(`⚡ Executing ${promises.length} rapid votes...`);
      const results = await Promise.allSettled(promises);
      
      const endTime = Date.now();
      const attackDuration = endTime - startTime;
      
      // Analyze attack results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      const attackSummary = {
        type: 'rapid_fire',
        duration: attackDuration,
        attempted: votesCount,
        successful: successful,
        failed: failed,
        averageDelay: delayMs,
        votesPerSecond: (successful / (attackDuration / 1000)).toFixed(2)
      };
      
      this.attackResults.push(attackSummary);
      
      console.log(`📊 ATTACK COMPLETE:`, attackSummary);
      
      return attackSummary;
      
    } catch (error) {
      console.error(`❌ Attack failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * 🎯 ATTACK TYPE 2: Coordinated Bot Attack
   * 
   * LEARNING FOCUS: Pattern-based attacks
   * - All accounts vote for same candidate
   * - Similar timing patterns
   * - Identical behavior signatures
   */
  async coordinatedBotAttack(targetCandidate, botCount = 5) {
    console.log(`🤖 STARTING ATTACK: Coordinated Bots (${botCount} bots)`);
    
    // 🤔 LEARNING QUESTION: How is this different from rapid fire?
    // Think about the behavioral patterns...
    
    const signers = await ethers.getSigners();
    const botAccounts = signers.slice(1, botCount + 1);
    
    const results = [];
    
    // 🏗️ PATTERN: All bots behave identically
    for (let i = 0; i < botAccounts.length; i++) {
      try {
        const account = botAccounts[i];
        const contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          account
        );
        
        // 🎯 SUSPICIOUS PATTERN: Identical delay between actions
        await this.sleep(1000); // Exactly 1 second delay
        
        console.log(`🤖 Bot ${i + 1} executing coordinated vote...`);
        
        const tx = await contract.vote(targetCandidate);
        const receipt = await tx.wait();
        
        results.push({
          botId: i + 1,
          success: true,
          timestamp: Date.now(),
          txHash: receipt.hash
        });
        
      } catch (error) {
        results.push({
          botId: i + 1,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    const attackSummary = {
      type: 'coordinated_bots',
      totalBots: botCount,
      successful: results.filter(r => r.success).length,
      pattern: 'identical_timing',
      targetCandidate: targetCandidate
    };
    
    this.attackResults.push(attackSummary);
    console.log(`🤖 BOT ATTACK COMPLETE:`, attackSummary);
    
    return attackSummary;
  }
  
  /**
   * 🎯 ATTACK TYPE 3: Stealth Attack (Harder to Detect)
   * 
   * ADVANCED LEARNING: How to make attacks look more natural
   * - Random delays
   * - Mixed candidates
   * - Spread over time
   */
  async stealthAttack(primaryCandidate, stealthVotes = 8) {
    console.log(`🥷 STARTING ATTACK: Stealth Mode (${stealthVotes} votes)`);
    
    const signers = await ethers.getSigners();
    const accounts = signers.slice(1, stealthVotes + 1);
    
    const results = [];
    
    for (let i = 0; i < accounts.length; i++) {
      try {
        const account = accounts[i];
        const contract = new ethers.Contract(
          this.contractAddress,
          this.contractABI,
          account
        );
        
        // 🥷 STEALTH TECHNIQUE: Random delays (looks more human)
        const randomDelay = Math.random() * 5000 + 2000; // 2-7 seconds
        await this.sleep(randomDelay);
        
        // 🥷 STEALTH TECHNIQUE: Occasionally vote for different candidates
        let candidateToVote = primaryCandidate;
        if (Math.random() < 0.2) { // 20% chance to vote for someone else
          candidateToVote = primaryCandidate === 1 ? 2 : 1;
        }
        
        console.log(`🥷 Stealth vote ${i + 1} for candidate ${candidateToVote} (delay: ${randomDelay.toFixed(0)}ms)`);
        
        const tx = await contract.vote(candidateToVote);
        const receipt = await tx.wait();
        
        results.push({
          accountIndex: i,
          candidate: candidateToVote,
          delay: randomDelay,
          timestamp: Date.now(),
          txHash: receipt.hash
        });
        
      } catch (error) {
        console.log(`🥷 Stealth vote ${i + 1} failed:`, error.message);
      }
    }
    
    const attackSummary = {
      type: 'stealth_attack',
      totalVotes: stealthVotes,
      successful: results.length,
      primaryCandidate: primaryCandidate,
      diversityRate: results.filter(r => r.candidate !== primaryCandidate).length / results.length
    };
    
    this.attackResults.push(attackSummary);
    console.log(`🥷 STEALTH ATTACK COMPLETE:`, attackSummary);
    
    return attackSummary;
  }
  
  /**
   * 🔧 UTILITY: Sleep function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 📊 ANALYSIS: Get attack summary for AI testing
   */
  getAttackSummary() {
    return {
      totalAttacks: this.attackResults.length,
      attacks: this.attackResults,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 🎯 MAIN TEST RUNNER: Execute all attack types
   */
  async runFullAttackSuite(targetCandidate = 1) {
    console.log(`\n🎯 STARTING COMPREHENSIVE ATTACK SIMULATION\n`);
    
    try {
      // Test 1: Rapid Fire
      console.log(`\n=== TEST 1: RAPID FIRE ATTACK ===`);
      await this.rapidFireAttack(targetCandidate, 5, 200);
      
      // Wait between attacks
      console.log(`\n⏱️  Waiting 10 seconds before next attack...`);
      await this.sleep(10000);
      
      // Test 2: Coordinated Bots
      console.log(`\n=== TEST 2: COORDINATED BOT ATTACK ===`);
      await this.coordinatedBotAttack(targetCandidate, 4);
      
      // Wait between attacks
      console.log(`\n⏱️  Waiting 15 seconds before stealth attack...`);
      await this.sleep(15000);
      
      // Test 3: Stealth Attack
      console.log(`\n=== TEST 3: STEALTH ATTACK ===`);
      await this.stealthAttack(targetCandidate, 6);
      
      // Final summary
      console.log(`\n📊 FINAL ATTACK SUMMARY:`);
      console.log(JSON.stringify(this.getAttackSummary(), null, 2));
      
    } catch (error) {
      console.error(`❌ Attack suite failed:`, error.message);
    }
  }
}

// 🎓 USAGE EXAMPLE AND LEARNING EXERCISE
async function main() {
  // Your contract details
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const contractABI = [
    "function vote(uint256 _candidateId) public",
    "function hasVoted(address _voter) public view returns (bool)"
  ];
  
  // Create attack simulator
  const attacker = new AttackSimulator(contractAddress, contractABI);
  
  // 🎯 LEARNING EXERCISE: Try different parameters
  console.log(`🎓 LEARNING TIP: Try modifying these values to see different attack patterns:`);
  console.log(`- Change target candidate`);
  console.log(`- Adjust vote counts`);
  console.log(`- Modify delays`);
  console.log(`- Add new attack types\n`);
  
  // Run the attack simulation
  await attacker.runFullAttackSuite(1); // Target candidate 1
}

// Export for use in other files
module.exports = { AttackSimulator };

// 🤔 REFLECTION QUESTIONS FOR YOU:
// 1. Which attack type would be hardest for AI to detect? Why?
// 2. What additional data would help detect these attacks?
// 3. How would you make the stealth attack even more sophisticated?
// 4. What legitimate user behaviors might get falsely flagged?

if (require.main === module) {
  main().catch(console.error);
}