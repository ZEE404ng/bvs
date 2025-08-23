require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: "remote" // Use accounts from local node
    },
    // Hardhat network (for testing)
    hardhat: {
      chainId: 1337,
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000" // 10,000 ETH per account
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};