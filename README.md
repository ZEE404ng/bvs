# Sample Hardhat Project

This project demonstrates a basic blockchain voting system.

It uses npm and npx commands to work it,
npx hardhat node: generates the private keys
npx hardhat run scripts/deploy.js --network localhost: runs the deploy.js script
npm start: starts the development server

the rpc that needs to be added in order to be used is the private development server
Name: Localhost 8485
default rpc url: ~127.0.0.1:8545
Chain id: 1337
Once added, it can then be connected to the website, otherwise it will not connect and will keep showing a connection error

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
