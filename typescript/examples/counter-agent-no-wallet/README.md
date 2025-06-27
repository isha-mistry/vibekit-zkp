# Counter Agent (No Wallet)

A MetaMask-compatible AI agent for interacting with Arbitrum Stylus counter smart contracts. This agent prepares transaction data for user signatures via MetaMask, eliminating the need for private key management.

## Features

- **Get Counter Value**: Read the current value from the smart contract
- **Increment Counter**: Prepare transaction to increase counter by 1
- **Set Counter Value**: Prepare transaction to set counter to a specific number
- **MetaMask Integration**: All transactions signed by user via MetaMask
- **Natural Language**: Accepts free-form instructions like "increment the counter" or "set to 42"

## Smart Contract Interface

Compatible with Arbitrum Stylus counter contracts implementing:

```solidity
function number() external view returns (uint256)
function setNumber(uint256 number) external
function increment() external
```

## Quick Start

### Via Docker (Recommended)

1. **Set Contract Address**:
   ```bash
   export COUNTER_CONTRACT_ADDRESS=0x_your_contract_address
   ```

2. **Run with Docker Compose**:
   ```bash
   cd typescript
   docker compose up counter-agent-no-wallet
   ```

### Local Development

1. **Install Dependencies**:
   ```bash
   cd typescript/examples/counter-agent-no-wallet
   pnpm install
   ```

2. **Configure Environment**:
   ```bash
   # Create .env file with:
   COUNTER_CONTRACT_ADDRESS=0x_your_contract_address
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   PORT=3010
   ```

3. **Run Agent**:
   ```bash
   pnpm dev
   ```

## Usage Examples

Send natural language instructions to the agent:

- **"What is the current counter value?"**
- **"Increment the counter"**
- **"Set the counter to 42"**
- **"Get the current value"**
- **"Increase counter by 1"**

For write operations (increment/set), the agent will:
1. Read the current value
2. Prepare transaction data
3. Return transaction details for MetaMask signing

## API Endpoints

- **Base URL**: `http://localhost:3010`
- **MCP SSE**: `http://localhost:3010/sse`
- **Info**: `http://localhost:3010/` (server status)

## Transaction Flow

1. **User**: Sends instruction to agent
2. **Agent**: Parses intent and reads current state
3. **Agent**: Prepares transaction data (for write operations)
4. **UI**: Receives transaction data and prompts MetaMask
5. **User**: Signs transaction in MetaMask
6. **Blockchain**: Transaction executes

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `COUNTER_CONTRACT_ADDRESS` | Address of deployed counter contract | ✅ | - |
| `ARBITRUM_SEPOLIA_RPC_URL` | RPC endpoint for Arbitrum Sepolia | ❌ | Public RPC |
| `PORT` | Port to run the agent on | ❌ | 3010 |

## Response Format

### Read Operations
```json
{
  "id": "counter-123456789",
  "status": {
    "state": "completed",
    "message": {
      "role": "agent",
      "parts": [{"type": "text", "text": "The current counter value is: 5"}]
    }
  },
  "metadata": {
    "operation": "read",
    "contractAddress": "0x...",
    "currentValue": "5",
    "userAddress": "0x..."
  }
}
```

### Write Operations
```json
{
  "id": "counter-123456789",
  "status": {
    "state": "completed",
    "message": {
      "role": "agent",
      "parts": [{"type": "text", "text": "Ready to increment counter from 5 to 6. Please confirm the transaction in MetaMask."}]
    }
  },
  "metadata": {
    "operation": "increment",
    "contractAddress": "0x...",
    "currentValue": "5",
    "expectedNewValue": "6",
    "userAddress": "0x...",
    "txData": {
      "to": "0x...",
      "data": "0x...",
      "value": "0x0"
    }
  }
}
```

## Integration with UI

This agent is designed to work with the Arbitrum Vibekit web UI:

1. Agent prepares transaction data
2. UI extracts `txData` from response
3. UI prompts MetaMask with transaction
4. User signs and broadcasts transaction

## Development

### Building
```bash
pnpm build
```

### Testing
```bash
pnpm test
```

### Formatting
```bash
pnpm format
```

## Security

- ✅ **No Private Keys**: All transactions signed by user
- ✅ **Read-Only RPC**: Agent only reads blockchain state
- ✅ **Transaction Transparency**: All transaction data visible to user
- ✅ **User Control**: User approves every transaction

## Troubleshooting

### Common Issues

1. **"COUNTER_CONTRACT_ADDRESS must be set"**
   - Ensure environment variable is configured

2. **"Failed to read counter value"**
   - Check contract address is correct
   - Verify contract is deployed on Arbitrum Sepolia
   - Ensure RPC URL is accessible

3. **"Invalid user address"**
   - User address must be a valid Ethereum address

## License

Part of the Arbitrum Vibekit framework. 