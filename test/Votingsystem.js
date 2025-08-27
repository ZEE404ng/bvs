const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let votingSystem;
  let owner;
  let voter1;
  let voter2;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystem.deploy();
    await votingSystem.waitForDeployment(); // Fixed: replaced .deployed()
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });

    it("Should start with voting inactive", async function () {
      expect(await votingSystem.votingActive()).to.equal(false);
    });

    it("Should initialize with zero candidates and votes", async function () {
      expect(await votingSystem.candidateCount()).to.equal(0);
      expect(await votingSystem.totalVotes()).to.equal(0);
    });
  });

  describe("Candidate Management", function () {
    it("Should allow owner to add candidates", async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      
      const candidate = await votingSystem.getCandidate(1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.description).to.equal("Candidate 1");
      expect(candidate.voteCount).to.equal(0);
    });

    it("Should not allow non-owner to add candidates", async function () {
      await expect(
        votingSystem.connect(voter1).addCandidate("Bob", "Candidate 2")
      ).to.be.revertedWithCustomError(votingSystem, "OwnableUnauthorizedAccount");
    });

    it("Should increment candidate count correctly", async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      await votingSystem.addCandidate("Bob", "Candidate 2");
      
      expect(await votingSystem.candidateCount()).to.equal(2);
    });

    it("Should return all candidates correctly", async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      await votingSystem.addCandidate("Bob", "Candidate 2");
      
      const candidates = await votingSystem.getAllCandidates();
      expect(candidates.length).to.equal(2);
      expect(candidates[0].name).to.equal("Alice");
      expect(candidates[1].name).to.equal("Bob");
    });
  });

  describe("Voting Process", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      await votingSystem.addCandidate("Bob", "Candidate 2");
      await votingSystem.toggleVoting(); // Activate voting
    });

    it("Should allow voting for valid candidates", async function () {
      await votingSystem.connect(voter1).vote(1);
      
      expect(await votingSystem.hasVoted(voter1.address)).to.equal(true);
      
      const candidate = await votingSystem.getCandidate(1);
      expect(candidate.voteCount).to.equal(1);
      expect(await votingSystem.totalVotes()).to.equal(1);
    });

    it("Should prevent double voting", async function () {
      await votingSystem.connect(voter1).vote(1);
      
      await expect(
        votingSystem.connect(voter1).vote(2)
      ).to.be.revertedWith("You have already voted");
    });

    it("Should not allow voting when inactive", async function () {
      await votingSystem.toggleVoting(); // Deactivate voting
      
      await expect(
        votingSystem.connect(voter1).vote(1)
      ).to.be.revertedWith("Voting is not active");
    });

    it("Should not allow voting for non-existent candidates", async function () {
      await expect(
        votingSystem.connect(voter1).vote(999)
      ).to.be.revertedWith("Candidate does not exist");
    });

    it("Should emit VoteCast event", async function () {
      await expect(votingSystem.connect(voter1).vote(1))
        .to.emit(votingSystem, "VoteCast")
        .withArgs(voter1.address, 1, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
    });
  });

  describe("Voting Status Management", function () {
    it("Should allow owner to toggle voting status", async function () {
      expect(await votingSystem.votingActive()).to.equal(false);
      
      await votingSystem.toggleVoting();
      expect(await votingSystem.votingActive()).to.equal(true);
      
      await votingSystem.toggleVoting();
      expect(await votingSystem.votingActive()).to.equal(false);
    });

    it("Should not allow non-owner to toggle voting", async function () {
      await expect(
        votingSystem.connect(voter1).toggleVoting()
      ).to.be.revertedWithCustomError(votingSystem, "OwnableUnauthorizedAccount");
    });

    it("Should emit VotingStatusChanged event", async function () {
      await expect(votingSystem.toggleVoting())
        .to.emit(votingSystem, "VotingStatusChanged")
        .withArgs(true);
    });
  });

  describe("Results and Statistics", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      await votingSystem.addCandidate("Bob", "Candidate 2");
      await votingSystem.addCandidate("Carol", "Candidate 3");
      await votingSystem.toggleVoting();
      
      await votingSystem.connect(voter1).vote(1); // Alice
      await votingSystem.connect(voter2).vote(1); // Alice
    });

    it("Should return correct voting results", async function () {
      const results = await votingSystem.getResults();
      expect(results[0]).to.equal(2); // Alice: 2 votes
      expect(results[1]).to.equal(0); // Bob: 0 votes  
      expect(results[2]).to.equal(0); // Carol: 0 votes
    });

    it("Should return correct voting statistics", async function () {
      const stats = await votingSystem.getVotingStats();
      expect(stats.totalCandidates).to.equal(3);
      expect(stats.totalVotesCast).to.equal(2);
      expect(stats.isVotingActive).to.equal(true);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple candidates and complex voting patterns", async function () {
      // Add multiple candidates
      for (let i = 1; i <= 5; i++) {
        await votingSystem.addCandidate(`Candidate ${i}`, `Description ${i}`);
      }
      
      await votingSystem.toggleVoting();
      
      // Get more signers for testing
      const signers = await ethers.getSigners();
      
      // Cast votes in different patterns
      await votingSystem.connect(signers[1]).vote(1); // Candidate 1
      await votingSystem.connect(signers[2]).vote(1); // Candidate 1  
      await votingSystem.connect(signers[3]).vote(2); // Candidate 2
      await votingSystem.connect(signers[4]).vote(3); // Candidate 3
      await votingSystem.connect(signers[5]).vote(1); // Candidate 1
      
      const results = await votingSystem.getResults();
      expect(results[0]).to.equal(3); // Candidate 1: 3 votes
      expect(results[1]).to.equal(1); // Candidate 2: 1 vote
      expect(results[2]).to.equal(1); // Candidate 3: 1 vote
      expect(results[3]).to.equal(0); // Candidate 4: 0 votes
      expect(results[4]).to.equal(0); // Candidate 5: 0 votes
      
      expect(await votingSystem.totalVotes()).to.equal(5);
    });
  });
});