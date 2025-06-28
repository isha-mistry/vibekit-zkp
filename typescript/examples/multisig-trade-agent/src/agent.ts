import { createPublicClient, http, parseAbi, encodeFunctionData, type Address, type Chain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { Task } from 'a2a-samples-js';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MultisigOperation {
  type: 'swap' | 'initialize' | 'deposit' | 'submitTransaction' | 'confirmTransaction' | 'executeTransaction' | 'revokeConfirmation' | 'getTransactionDetails' | 'getOwners' | 'getTransactionCount' | 'isOwner';
  swapData?: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromChain?: string;
    toChain?: string;
  };
  multisigData?: {
    owners?: string[];
    numConfirmationsRequired?: number;
    txIndex?: number;
    to?: string;
    value?: string;
    data?: string;
    checkAddress?: string;
  };
}

export interface MultisigTransactionDetails {
  to: string;
  value: string;
  data: string;
  executed: boolean;
  numConfirmations: number;
}

export class MultisigTradeAgent {
  private publicClient;
  private multisigContractAddress: string;
  private mcpClient: McpClient | null = null;
  private camelotMcpUrl: string;
  
  private multisigAbi = parseAbi([
    'function numConfirmationsRequired() external view returns (uint256)',
    'function deposit() external payable',
    'function submitTransaction(address to, uint256 value, bytes calldata data) external',
    'function initialize(address[] memory owners, uint256 num_confirmations_required) external',
    'function executeTransaction(uint256 tx_index) external',
    'function confirmTransaction(uint256 tx_index) external',
    'function revokeConfirmation(uint256 tx_index) external',
    'function isOwner(address check_address) external view returns (bool)',
    'function getTransactionCount() external view returns (uint256)',
    'function getTransaction(uint256 tx_index) external view returns (address, uint256, bytes, bool, uint256)',
    'function getOwners() external view returns (address[])',
  ]);

  constructor(
    private rpcUrl: string,
    multisigContractAddress: string,
    camelotMcpUrl: string = 'http://swapping-agent-no-wallet:3005/sse'
  ) {
    this.multisigContractAddress = multisigContractAddress;
    this.camelotMcpUrl = camelotMcpUrl;
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(this.rpcUrl),
    });
  }

  async init(): Promise<void> {
    console.log('MultisigTradeAgent initialized with contract:', this.multisigContractAddress);
    
    // Initialize MCP client for Camelot swapping
    try {
      const transport = new SSEClientTransport(new URL(this.camelotMcpUrl));
      this.mcpClient = new McpClient({
        name: 'multisig-trade-agent',
        version: '1.0.0',
      }, {
        capabilities: {},
      });
      
      await this.mcpClient.connect(transport);
      console.log('Connected to Camelot MCP server');
    } catch (error) {
      console.warn('Failed to connect to Camelot MCP server:', error);
    }
  }

  async processUserInput(instruction: string, userAddress: string): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Processing:', instruction);

      const operation = this.parseInstruction(instruction, userAddress);
      const taskId = `multisig-trade-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      switch (operation.type) {
        case 'swap':
          if (!operation.swapData) {
            throw new Error('Swap data is required for swap operation');
          }
          return await this.handleSwapTransaction(taskId, userAddress, operation.swapData);
          
        case 'initialize':
          if (!operation.multisigData?.owners || !operation.multisigData?.numConfirmationsRequired) {
            throw new Error('Owners and confirmation requirements are required for initialization');
          }
          return await this.handleInitialize(taskId, userAddress, operation.multisigData.owners, operation.multisigData.numConfirmationsRequired);
          
        case 'deposit':
          if (!operation.multisigData?.value) {
            throw new Error('ETH amount is required for deposit');
          }
          return await this.handleDeposit(taskId, userAddress, operation.multisigData.value);
          
        case 'confirmTransaction':
          if (operation.multisigData?.txIndex === undefined) {
            throw new Error('Transaction index is required for confirmation');
          }
          return await this.handleConfirmTransaction(taskId, userAddress, operation.multisigData.txIndex);
          
        case 'executeTransaction':
          if (operation.multisigData?.txIndex === undefined) {
            throw new Error('Transaction index is required for execution');
          }
          return await this.handleExecuteTransaction(taskId, userAddress, operation.multisigData.txIndex);
          
        case 'revokeConfirmation':
          if (operation.multisigData?.txIndex === undefined) {
            throw new Error('Transaction index is required for revocation');
          }
          return await this.handleRevokeConfirmation(taskId, userAddress, operation.multisigData.txIndex);
          
        case 'getTransactionDetails':
          if (operation.multisigData?.txIndex === undefined) {
            throw new Error('Transaction index is required to get transaction details');
          }
          return await this.handleGetTransactionDetails(taskId, userAddress, operation.multisigData.txIndex);
          
        case 'getOwners':
          return await this.handleGetOwners(taskId, userAddress);
          
        case 'getTransactionCount':
          return await this.handleGetTransactionCount(taskId, userAddress);
          
        case 'isOwner':
          if (!operation.multisigData?.checkAddress) {
            throw new Error('Address is required to check ownership');
          }
          return await this.handleIsOwner(taskId, userAddress, operation.multisigData.checkAddress);
          
        default:
          throw new Error('Unknown operation type');
      }
    } catch (error) {
      console.error('[MultisigTradeAgent] Error:', error);
      return this.createErrorTask(
        `multisig-trade-error-${Date.now()}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private parseInstruction(instruction: string, userAddress: string): MultisigOperation {
    const lowerInstruction = instruction.toLowerCase();

    // Check for swap operations
    const swapMatch = lowerInstruction.match(/swap\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/);
    if (swapMatch || lowerInstruction.includes('swap')) {
      // Extract swap parameters from instruction
      const fromToken = swapMatch?.[2] || 'USDC';
      const toToken = swapMatch?.[3] || 'ETH';
      const amount = swapMatch?.[1] || '100';
      
      return {
        type: 'swap',
        swapData: {
          fromToken,
          toToken,
          amount,
          fromChain: 'arbitrum',
          toChain: 'arbitrum'
        }
      };
    }

    // Check for multisig initialization
    const initMatch = lowerInstruction.match(/initialize.*?(\d+)\s+confirmation/);
    if (initMatch || lowerInstruction.includes('initialize')) {
      const numConfirmations = initMatch?.[1] ? parseInt(initMatch[1]) : 2;
      // For demo purposes, use the user as the only owner initially
      return {
        type: 'initialize',
        multisigData: {
          owners: [userAddress],
          numConfirmationsRequired: numConfirmations
        }
      };
    }

    // Check for deposit operations
    const depositMatch = lowerInstruction.match(/deposit\s+(\d+(?:\.\d+)?)/);
    if (depositMatch || lowerInstruction.includes('deposit')) {
      const ethValue = depositMatch?.[1] ? parseFloat(depositMatch[1]) : 0.01;
      return {
        type: 'deposit',
        multisigData: {
          value: ethValue.toString()
        }
      };
    }

    // Check for transaction operations
    const confirmMatch = lowerInstruction.match(/confirm.*?transaction\s+(\d+)/);
    if (confirmMatch) {
      return {
        type: 'confirmTransaction',
        multisigData: {
          txIndex: parseInt(confirmMatch[1])
        }
      };
    }

    const executeMatch = lowerInstruction.match(/execute.*?transaction\s+(\d+)/);
    if (executeMatch) {
      return {
        type: 'executeTransaction',
        multisigData: {
          txIndex: parseInt(executeMatch[1])
        }
      };
    }

    const revokeMatch = lowerInstruction.match(/revoke.*?transaction\s+(\d+)/);
    if (revokeMatch) {
      return {
        type: 'revokeConfirmation',
        multisigData: {
          txIndex: parseInt(revokeMatch[1])
        }
      };
    }

    const detailsMatch = lowerInstruction.match(/(?:get|show).*?transaction\s+(\d+)/);
    if (detailsMatch) {
      return {
        type: 'getTransactionDetails',
        multisigData: {
          txIndex: parseInt(detailsMatch[1])
        }
      };
    }

    // Check for owner operations
    if (lowerInstruction.includes('get owners') || lowerInstruction.includes('show owners')) {
      return { type: 'getOwners' };
    }

    if (lowerInstruction.includes('transaction count') || lowerInstruction.includes('how many transactions')) {
      return { type: 'getTransactionCount' };
    }

    const isOwnerMatch = lowerInstruction.match(/is\s+(0x[a-fA-F0-9]{40})\s+(?:an\s+)?owner/);
    if (isOwnerMatch) {
      return {
        type: 'isOwner',
        multisigData: {
          checkAddress: isOwnerMatch[1]
        }
      };
    }

    // Default to getting transaction count
    return { type: 'getTransactionCount' };
  }

  private async handleSwapTransaction(taskId: string, userAddress: string, swapData: any): Promise<Task> {
    try {
      if (!this.mcpClient) {
        throw new Error('Camelot MCP client not available');
      }

      // Call the swapping agent to get transaction data
      const swapResult = await this.mcpClient.callTool('askSwapAgent', {
        instruction: `Swap ${swapData.amount} ${swapData.fromToken} to ${swapData.toToken} on ${swapData.fromChain || 'arbitrum'}`,
        userAddress: userAddress
      });

      // Parse the swap result to extract transaction data
      const swapResponse = JSON.parse(swapResult.content[0].text);
      
      if (swapResponse.status.state === 'failed') {
        throw new Error(`Swap preparation failed: ${swapResponse.status.message.parts[0].text}`);
      }

      const swapTxData = swapResponse.metadata?.txData;
      if (!swapTxData) {
        throw new Error('No transaction data received from swap agent');
      }

      // Submit the swap transaction to the multisig contract
      const submitTxData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'submitTransaction',
        args: [
          swapTxData.to as Address,
          BigInt(swapTxData.value || '0'),
          swapTxData.data as `0x${string}`
        ],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to submit swap transaction to multisig. Swapping ${swapData.amount} ${swapData.fromToken} to ${swapData.toToken}. Please confirm to submit this transaction to the multisig contract for approval.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'swap',
          multisigContractAddress: this.multisigContractAddress,
          swapDetails: swapData,
          originalSwapTx: swapTxData,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: submitTxData,
            value: '0x0',
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare multisig swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleInitialize(taskId: string, userAddress: string, owners: string[], numConfirmationsRequired: number): Promise<Task> {
    try {
      const txData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'initialize',
        args: [owners as Address[], BigInt(numConfirmationsRequired)],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to initialize multisig contract with ${owners.length} owners requiring ${numConfirmationsRequired} confirmations.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'initialize',
          multisigContractAddress: this.multisigContractAddress,
          owners,
          numConfirmationsRequired,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: txData,
            value: '0x0',
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare initialization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleDeposit(taskId: string, userAddress: string, ethAmount: string): Promise<Task> {
    try {
      const ethValueInWei = BigInt(Math.floor(parseFloat(ethAmount) * 1e18));
      
      const txData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'deposit',
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to deposit ${ethAmount} ETH to the multisig contract.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'deposit',
          multisigContractAddress: this.multisigContractAddress,
          ethAmount,
          ethValueInWei: ethValueInWei.toString(),
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: txData,
            value: `0x${ethValueInWei.toString(16)}`,
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare deposit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleConfirmTransaction(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      const txData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'confirmTransaction',
        args: [BigInt(txIndex)],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to confirm transaction #${txIndex} in the multisig contract.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'confirmTransaction',
          multisigContractAddress: this.multisigContractAddress,
          txIndex,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: txData,
            value: '0x0',
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare confirmation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleExecuteTransaction(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      const txData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'executeTransaction',
        args: [BigInt(txIndex)],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to execute transaction #${txIndex} in the multisig contract.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'executeTransaction',
          multisigContractAddress: this.multisigContractAddress,
          txIndex,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: txData,
            value: '0x0',
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleRevokeConfirmation(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      const txData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'revokeConfirmation',
        args: [BigInt(txIndex)],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Ready to revoke confirmation for transaction #${txIndex} in the multisig contract.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'revokeConfirmation',
          multisigContractAddress: this.multisigContractAddress,
          txIndex,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: txData,
            value: '0x0',
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare revocation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetTransactionDetails(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      const [to, value, data, executed, numConfirmations] = await this.publicClient.readContract({
        address: this.multisigContractAddress as Address,
        abi: this.multisigAbi,
        functionName: 'getTransaction',
        args: [BigInt(txIndex)],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Transaction #${txIndex} details: To: ${to}, Value: ${value.toString()} wei, Executed: ${executed}, Confirmations: ${numConfirmations.toString()}`,
              },
            ],
          },
        },
        metadata: {
          operation: 'getTransactionDetails',
          multisigContractAddress: this.multisigContractAddress,
          txIndex,
          transactionDetails: {
            to: to.toString(),
            value: value.toString(),
            data: data.toString(),
            executed,
            numConfirmations: numConfirmations.toString(),
          },
          userAddress,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get transaction details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetOwners(taskId: string, userAddress: string): Promise<Task> {
    try {
      const owners = await this.publicClient.readContract({
        address: this.multisigContractAddress as Address,
        abi: this.multisigAbi,
        functionName: 'getOwners',
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Multisig owners: ${owners.join(', ')}`,
              },
            ],
          },
        },
        metadata: {
          operation: 'getOwners',
          multisigContractAddress: this.multisigContractAddress,
          owners: owners,
          userAddress,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get owners: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleGetTransactionCount(taskId: string, userAddress: string): Promise<Task> {
    try {
      const count = await this.publicClient.readContract({
        address: this.multisigContractAddress as Address,
        abi: this.multisigAbi,
        functionName: 'getTransactionCount',
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Total transactions in multisig: ${count.toString()}`,
              },
            ],
          },
        },
        metadata: {
          operation: 'getTransactionCount',
          multisigContractAddress: this.multisigContractAddress,
          transactionCount: count.toString(),
          userAddress,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get transaction count: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleIsOwner(taskId: string, userAddress: string, checkAddress: string): Promise<Task> {
    try {
      const isOwner = await this.publicClient.readContract({
        address: this.multisigContractAddress as Address,
        abi: this.multisigAbi,
        functionName: 'isOwner',
        args: [checkAddress as Address],
      });

      return {
        id: taskId,
        status: {
          state: 'completed',
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: `Address ${checkAddress} is ${isOwner ? '' : 'not '}an owner of the multisig contract.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'isOwner',
          multisigContractAddress: this.multisigContractAddress,
          checkAddress,
          isOwner,
          userAddress,
        },
      };
    } catch (error) {
      throw new Error(`Failed to check ownership: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createErrorTask(taskId: string, errorMessage: string): Task {
    return {
      id: taskId,
      status: {
        state: 'failed',
        message: {
          role: 'agent',
          parts: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        },
      },
    };
  }
} 