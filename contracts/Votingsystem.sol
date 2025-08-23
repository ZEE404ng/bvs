// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VotingSystem is Ownable, ReentrancyGuard {
    // Struct to represent a candidate
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
        bool exists;
    }
    
    // Struct to represent a voter
    struct Voter {
        bool hasVoted;
        uint256 votedFor;
        uint256 timestamp;
    }
    
    // State variables
    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;
    uint256 public candidateCount;
    uint256 public totalVotes;
    bool public votingActive;
    
    // Events for logging
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp);
    event VotingStatusChanged(bool active);
    
    // Modifiers
    modifier onlyDuringVoting() {
        require(votingActive, "Voting is not active");
        _;
    }
    
    modifier hasNotVoted() {
        require(!voters[msg.sender].hasVoted, "You have already voted");
        _;
    }
    
    modifier validCandidate(uint256 _candidateId) {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        _;
    }

    constructor() Ownable(msg.sender) {
        votingActive = false;
        candidateCount = 0;
        totalVotes = 0;
    }
    
    // Add a new candidate (only owner)
    function addCandidate(string memory _name, string memory _description) 
        public 
        onlyOwner 
    {
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            description: _description,
            voteCount: 0,
            exists: true
        });
        
        emit CandidateAdded(candidateCount, _name);
    }
    
    // Cast a vote
    function vote(uint256 _candidateId) 
        public 
        onlyDuringVoting 
        hasNotVoted 
        validCandidate(_candidateId) 
        nonReentrant 
    {
        // Record the vote
        voters[msg.sender] = Voter({
            hasVoted: true,
            votedFor: _candidateId,
            timestamp: block.timestamp
        });
        
        // Increment candidate vote count
        candidates[_candidateId].voteCount++;
        totalVotes++;
        
        emit VoteCast(msg.sender, _candidateId, block.timestamp);
    }
    
    // Toggle voting status (only owner)
    function toggleVoting() public onlyOwner {
        votingActive = !votingActive;
        emit VotingStatusChanged(votingActive);
    }
    
    // Get candidate information
    function getCandidate(uint256 _candidateId) 
        public 
        view 
        validCandidate(_candidateId) 
        returns (string memory name, string memory description, uint256 voteCount) 
    {
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.name, candidate.description, candidate.voteCount);
    }
    
    // Get all candidates (for frontend)
    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory allCandidates = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            allCandidates[i-1] = candidates[i];
        }
        return allCandidates;
    }
    
    // Get voting results
    function getResults() public view returns (uint256[] memory votes) {
        votes = new uint256[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            votes[i-1] = candidates[i].voteCount;
        }
        return votes;
    }
    
    // Check if an address has voted
    function hasVoted(address _voter) public view returns (bool) {
        return voters[_voter].hasVoted;
    }
    
    // Get voting statistics
    function getVotingStats() public view returns (
        uint256 totalCandidates,
        uint256 totalVotesCast,
        bool isVotingActive
    ) {
        return (candidateCount, totalVotes, votingActive);
    }
}