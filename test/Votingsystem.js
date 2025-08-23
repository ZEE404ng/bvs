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
    await votingSystem.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await votingSystem.owner()).to.equal(owner.address);
    });

    it("Should start with voting inactive", async function () {
      expect(await votingSystem.votingActive()).to.equal(false);
    });
  });

  describe("Candidate Management", function () {
    it("Should allow owner to add candidates", async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      
      const candidate = await votingSystem.getCandidate(1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.description).to.equal("Candidate 1");
    });

    it("Should not allow non-owner to add candidates", async function () {
      await expect(
        votingSystem.connect(voter1).addCandidate("Bob", "Candidate 2")
      ).to.be.revertedWith("Ownable: caller is not the owner");
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
  });

  describe("Results", function () {
    beforeEach(async function () {
      await votingSystem.addCandidate("Alice", "Candidate 1");
      await votingSystem.addCandidate("Bob", "Candidate 2");
      await votingSystem.toggleVoting();
      
      await votingSystem.connect(voter1).vote(1);
      await votingSystem.connect(voter2).vote(1);
    });

    it("Should return correct voting results", async function () {
      const results = await votingSystem.getResults();
      expect(results[0]).to.equal(2); // Alice: 2 votes
      expect(results[1]).to.equal(0); // Bob: 0 votes
    });

    it("Should return correct voting statistics", async function () {
      const stats = await votingSystem.getVotingStats();
      expect(stats.totalCandidates).to.equal(2);
      expect(stats.totalVotesCast).to.equal(2);
      expect(stats.isVotingActive).to.equal(true);
    });
  });
});