# Flash Queue - Blockchain Flash Loan Arbitrage System

A high-performance queue-based system for executing flash loan arbitrage opportunities on BSC/BNB Chain.

## Overview

Flash Queue is a specialized service that processes arbitrage opportunities across DEXs on BNB Chain. It:

1. Accepts arbitrage trade path information via API or direct queue integration
2. Manages transaction execution with proper nonce handling
3. Executes triangular arbitrage trades using flash loans
4. Provides detailed event logging and error handling

## Features

- **Queue-Based Architecture**: Prioritized job queue for handling multiple opportunities
- **Fast Execution**: Optimized for speed to capitalize on short-lived arbitrage windows
- **Nonce Management**: Built-in transaction nonce handling with failure recovery
- **Robust Error Handling**: Comprehensive error management with event extraction from failed transactions
- **Flexible Integration**: Direct BullMQ integration or HTTP API endpoints

## Prerequisites

- Node.js v16+
- Redis server (for BullMQ)
- Access to BSC/BNB Chain RPC endpoints

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flash-queue.git
cd flash-queue

# Install dependencies
npm install

# Copy typechain types (if needed)
npm run copy:typechain

# Setup environment variables
cp .env.example .env
# Edit .env with your wallet private key and configuration
```

## Configuration

Create a .env file in the root directory:

```
PRIVATE_KEY=your_private_key_here
```

The system is configured to use BSC Mainnet and Testnet with contract addresses specified in blockchain.config.ts.

## Usage

### Starting the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Submitting Arbitrage Opportunities

#### Via HTTP API:

The API hasn't implement the real call to create the valid queue. Since my another project 'pancake-swap' will create the bullmg queue directly through bullmg interfaces, that's the reason the API is out of date.

```bash
curl -X POST http://localhost:3000/flash-queue/add \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x78867BbEeF44f2326bF8DDd1941a4439382EF2A7",
    "borrowAmount": "1000000000000000000",
    "token1": "0xFa60D973F7642B748046464e165A65B7323b0DEE",
    "token2": "0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684",
    "expectedProfit": 0.05,
    "slippages": [997, 997, 997]
  }'
```

#### Direct BullMQ Integration:

```typescript
import { Queue } from 'bullmq';

const arbitrageQueue = new Queue('flash-queue', {
  connection: { host: 'localhost', port: 6379 },
});

await arbitrageQueue.add(
  'path',
  {
    token0: borrowToken,
    borrowAmount: borrowAmountStr,
    token1: intermediateToken,
    token2: finalToken,
    deadLineMin: 2,
    slippages: [997, 997, 997],
  },
  {
    priority: Math.floor(-expectedProfit * 1000), // Higher profit = higher priority
  },
);
```

## Architecture

- **Controller**: Handles HTTP API requests
- **Worker**: Processes queue jobs and executes flash loan arbitrage
- **Blockchain Service**: Manages transaction submission and event parsing
- **BullMQ**: Provides priority queue functionality with Redis

## License

MIT

## Acknowledgements

Built with:

- NestJS
- BullMQ
- Ethers.js
- Typechain
