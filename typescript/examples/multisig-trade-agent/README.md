# Multisig Trade Agent

A sophisticated agent that combines Camelot DEX swapping capabilities with Rust-based Arbitrum Stylus multisig contract functionality. This agent enables multi-signature token swaps where multiple parties must approve transactions before execution.

## Features

### Swap Operations
- **Multi-signature Swaps**: Submit token swaps to the multisig contract for approval
- **Camelot DEX Integration**: Leverages Camelot DEX for optimal swap routing
- **Transaction Queuing**: Swaps are queued in the multisig for approval before execution

### Multisig Management
- **Initialize Multisig**: Set up a new multisig with owners and confirmation requirements
- **Deposit ETH**: Add funds to the multisig contract
- **Transaction Management**: Confirm, execute, or revoke transaction confirmations
- **Query Operations**: Check owners, transaction details, and contract state

## Environment Variables

Create a `.env` file in the `typescript/` directory with:

```env
# Required
MULTISIG_CONTRACT_ADDRESS=0x...  # Your deployed multisig contract address
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Optional
CAMELOT_MCP_URL=http://swapping-agent-no-wallet:3005/sse  # Camelot agent URL
PORT=3011
```

## Smart Contract

The agent interfaces with a Rust-based Arbitrum Stylus multisig contract with the following functions:

### Read Functions
- `numConfirmationsRequired()` - Get required confirmation count
- `isOwner(address)` - Check if address is an owner
- `getTransactionCount()` - Get total transaction count
- `getTransaction(uint256)` - Get transaction details
- `getOwners()` - Get list of all owners

### Write Functions
- `initialize(address[], uint256)` - Initialize with owners and confirmation requirement
- `deposit()` - Deposit ETH to the contract (payable)
- `submitTransaction(address, uint256, bytes)` - Submit a new transaction
- `confirmTransaction(uint256)` - Confirm a transaction
- `executeTransaction(uint256)` - Execute a confirmed transaction
- `revokeConfirmation(uint256)` - Revoke your confirmation

## Usage Examples

### Swap Operations
```
"Swap 100 USDC for ETH through multisig"
"Submit a swap of 50 DAI to WETH via multisig"
```

### Multisig Management
```
"Initialize multisig with 2 confirmations required"
"Deposit 0.1 ETH to the multisig"
"Confirm transaction 0"
"Execute transaction 1"
"Get multisig owners"
"How many transactions are in the multisig?"
```

### Transaction Flow

1. **Submit Swap**: User requests a token swap
2. **Prepare Transaction**: Agent calls Camelot to prepare swap data
3. **Submit to Multisig**: Swap transaction is submitted to multisig for approval
4. **Confirmation Phase**: Required number of owners must confirm the transaction
5. **Execution**: Once confirmed, any owner can execute the transaction

## API Endpoints

- `GET /` - Server information and health check
- `GET /sse` - Server-Sent Events endpoint for MCP connection
- `POST /messages` - MCP message handling endpoint

## Development

### Running Locally
```bash
cd examples/multisig-trade-agent
pnpm install
pnpm dev
```

### Building
```bash
pnpm build
```

### Testing
```bash
pnpm test
```

## Docker

### Build and Run
```bash
# From typescript/ directory
docker compose up multisig-trade-agent
```

The agent will be available at `http://localhost:3011`

## Integration

The agent integrates with:
- **Camelot Swapping Agent**: For DEX swap preparation
- **Arbitrum Stylus Multisig**: For multi-signature transaction management
- **MetaMask**: For transaction signing and execution

## Security Considerations

- All transactions require multiple signatures before execution
- Smart contract is deployed on Arbitrum Sepolia testnet
- Transaction data is validated before submission
- Owner permissions are enforced by the smart contract

## Architecture

```
User Request
    ↓
Multisig Trade Agent
    ↓
├── Camelot Agent (for swap data)
└── Multisig Contract (for approval flow)
    ↓
Multiple Owners Confirm
    ↓
Transaction Execution
``` 