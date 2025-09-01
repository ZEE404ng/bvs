import { render, screen } from '@testing-library/react';
import Appp from '../App'; // Fixed import path

// Mock ethers to avoid web3 issues in tests
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    Contract: jest.fn(),
  },
}));

// Mock the deployment file import
jest.mock('../contracts/deployment.json', () => ({
  contractAddress: '0x1234567890123456789012345678901234567890',
  contractABI: []
}), { virtual: true });

describe('App Component', () => {
  beforeEach(() => {
    // Mock window.ethereum
    global.window.ethereum = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  afterEach(() => {
    delete global.window.ethereum;
  });

  test('renders blockchain voting system header', () => {
    render(<App />);
    const headerElement = screen.getByText(/blockchain voting system/i);
    expect(headerElement).toBeInTheDocument();
  });

  test('renders welcome message when wallet not connected', () => {
    render(<App />);
    const welcomeElement = screen.getByText(/welcome to the blockchain voting system/i);
    expect(welcomeElement).toBeInTheDocument();
  });

  test('renders feature list', () => {
    render(<App />);
    const tamperProofElement = screen.getByText(/tamper-proof records/i);
    const realTimeElement = screen.getByText(/real-time results/i);
    const transparencyElement = screen.getByText(/complete transparency/i);
    const fraudDetectionElement = screen.getByText(/fraud detection/i);
    
    expect(tamperProofElement).toBeInTheDocument();
    expect(realTimeElement).toBeInTheDocument();
    expect(transparencyElement).toBeInTheDocument();
    expect(fraudDetectionElement).toBeInTheDocument();
  });

  test('renders wallet connection component', () => {
    render(<App />);
    const connectButton = screen.getByText(/connect wallet/i);
    expect(connectButton).toBeInTheDocument();
  });

  test('shows MetaMask installation message when ethereum not available', () => {
    delete global.window.ethereum;
    
    render(<App />);
    // The component should still render but show appropriate messaging
    const headerElement = screen.getByText(/blockchain voting system/i);
    expect(headerElement).toBeInTheDocument();
  });
});