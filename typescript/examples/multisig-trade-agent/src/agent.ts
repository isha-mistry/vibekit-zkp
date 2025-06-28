import { createPublicClient, http, parseAbi, encodeFunctionData, type Address, type Chain } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { Task } from 'a2a-samples-js';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MultisigOperation {
  type: 'swap' | 'initialize' | 'submitTransaction' | 'confirmTransaction' | 'executeTransaction' | 'isOwner';
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
    'function initialize(address[] memory owners, uint256 num_confirmations_required) external',
    'function submit_transaction(address to, uint256 value, bytes calldata data) external',
    'function confirm_transaction(uint256 tx_index) external',
    'function execute_transaction(uint256 tx_index) external',
    'function is_owner(address check_address) external view returns (bool)',
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
          
        case 'submitTransaction':
          if (!operation.multisigData?.to || !operation.multisigData?.value || !operation.multisigData?.data) {
            throw new Error('Transaction details (to, value, data) are required for submission');
          }
          return await this.handleSubmitTransaction(taskId, userAddress, operation.multisigData.to, operation.multisigData.value, operation.multisigData.data);
          
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

    // Check for submit transaction operations
    const submitMatch = lowerInstruction.match(/submit.*?transaction/);
    if (submitMatch || lowerInstruction.includes('submit')) {
      return {
        type: 'submitTransaction',
        multisigData: {
          to: userAddress, // Default to user address
          value: '0',
          data: '0x'
        }
      };
    }

    // Check for confirm transaction operations
    const confirmMatch = lowerInstruction.match(/confirm.*?(?:transaction|tx)\s+(\d+)/);
    if (confirmMatch || lowerInstruction.includes('confirm')) {
      const txIndex = confirmMatch?.[1] ? parseInt(confirmMatch[1]) : 0;
      return {
        type: 'confirmTransaction',
        multisigData: {
          txIndex
        }
      };
    }

    // Check for execute transaction operations
    const executeMatch = lowerInstruction.match(/execute.*?(?:transaction|tx)\s+(\d+)/);
    if (executeMatch || lowerInstruction.includes('execute')) {
      const txIndex = executeMatch?.[1] ? parseInt(executeMatch[1]) : 0;
      return {
        type: 'executeTransaction',
        multisigData: {
          txIndex
        }
      };
    }

    // Check for is owner operations
    const ownerMatch = lowerInstruction.match(/is\s+owner|check\s+owner/);
    if (ownerMatch || lowerInstruction.includes('owner')) {
      return {
        type: 'isOwner',
        multisigData: {
          checkAddress: userAddress
        }
      };
    }

    // Default to swap for unrecognized instructions
    return {
      type: 'swap',
      swapData: {
        fromToken: 'USDC',
        toToken: 'ETH',
        amount: '100',
        fromChain: 'arbitrum',
        toChain: 'arbitrum'
      }
    };
  }

  private async handleSwapTransaction(taskId: string, userAddress: string, swapData: any): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling swap transaction');

      // Use Camelot MCP to prepare swap transaction
      let swapTx: any = null;
      if (this.mcpClient) {
        try {
          const response = await this.mcpClient.callTool('askSwapAgent', {
            instruction: `Swap ${swapData.amount} ${swapData.fromToken} for ${swapData.toToken} on Arbitrum`,
            userAddress: userAddress
          });
          
          console.log('Camelot MCP response:', response);
          
          if (response.content?.[0]?.text) {
            const parsedResponse = JSON.parse(response.content[0].text);
            if (parsedResponse.metadata?.txData) {
              swapTx = parsedResponse.metadata.txData;
            }
          }
        } catch (mcpError) {
          console.warn('MCP call failed:', mcpError);
        }
      }

      // If MCP failed, create a placeholder swap transaction
      if (!swapTx) {
        swapTx = {
          to: '0x1111000000000000000000000000000000001111', // Placeholder DEX router
          data: '0x', // Placeholder swap data
          value: '0'
        };
      }

      // Submit this swap transaction to the multisig
      const submitTxData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'submit_transaction',
        args: [swapTx.to as Address, BigInt(swapTx.value), swapTx.data as `0x${string}`]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Submit Swap Transaction to Multisig`,
        description: `Submit a swap transaction for ${swapData.amount} ${swapData.fromToken} → ${swapData.toToken} to the multisig wallet for approval`,
        transactions: [
          {
            to: this.multisigContractAddress as Address,
            data: submitTxData as `0x${string}`,
            value: '0',
            chainId: arbitrumSepolia.id,
          }
        ],
        status: 'pending',
        metadata: {
          operation: 'swap',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          swapDetails: swapData,
          originalSwapTx: swapTx,
          txData: {
            to: this.multisigContractAddress,
            data: submitTxData,
            value: '0'
          }
        }
      };
    } catch (error) {
      console.error('Error in handleSwapTransaction:', error);
      throw error;
    }
  }

  private async handleInitialize(taskId: string, userAddress: string, owners: string[], numConfirmationsRequired: number): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling initialize');

      const initializeData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'initialize',
        args: [owners as Address[], BigInt(numConfirmationsRequired)]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Initialize Multisig Wallet`,
        description: `Initialize multisig wallet with ${owners.length} owner(s) requiring ${numConfirmationsRequired} confirmation(s)`,
        transactions: [
          {
            to: this.multisigContractAddress as Address,
            data: initializeData as `0x${string}`,
            value: '0',
            chainId: arbitrumSepolia.id,
          }
        ],
        status: 'pending',
        metadata: {
          operation: 'initialize',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          owners,
          numConfirmationsRequired,
          txData: {
            to: this.multisigContractAddress,
            data: initializeData,
            value: '0'
          }
        }
      };
    } catch (error) {
      console.error('Error in handleInitialize:', error);
      throw error;
    }
  }

  private async handleSubmitTransaction(taskId: string, userAddress: string, to: string, value: string, data: string): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling submit transaction');

      const submitTxData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'submit_transaction',
        args: [to as Address, BigInt(value), data as `0x${string}`]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Submit Transaction to Multisig`,
        description: `Submit a transaction to ${to} with value ${value} wei to the multisig wallet`,
        transactions: [
          {
            to: this.multisigContractAddress as Address,
            data: submitTxData as `0x${string}`,
            value: '0',
            chainId: arbitrumSepolia.id,
          }
        ],
        status: 'pending',
        metadata: {
          operation: 'submitTransaction',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          txData: {
            to: this.multisigContractAddress,
            data: submitTxData,
            value: '0'
          }
        }
      };
    } catch (error) {
      console.error('Error in handleSubmitTransaction:', error);
      throw error;
    }
  }

  private async handleConfirmTransaction(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling confirm transaction');

      const confirmTxData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'confirm_transaction',
        args: [BigInt(txIndex)]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Confirm Transaction #${txIndex}`,
        description: `Confirm transaction #${txIndex} in the multisig wallet`,
        transactions: [
          {
            to: this.multisigContractAddress as Address,
            data: confirmTxData as `0x${string}`,
            value: '0',
            chainId: arbitrumSepolia.id,
          }
        ],
        status: 'pending',
        metadata: {
          operation: 'confirmTransaction',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          txIndex,
          txData: {
            to: this.multisigContractAddress,
            data: confirmTxData,
            value: '0'
          }
        }
      };
    } catch (error) {
      console.error('Error in handleConfirmTransaction:', error);
      throw error;
    }
  }

  private async handleExecuteTransaction(taskId: string, userAddress: string, txIndex: number): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling execute transaction');

      const executeTxData = encodeFunctionData({
        abi: this.multisigAbi,
        functionName: 'execute_transaction',
        args: [BigInt(txIndex)]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Execute Transaction #${txIndex}`,
        description: `Execute transaction #${txIndex} in the multisig wallet`,
        transactions: [
          {
            to: this.multisigContractAddress as Address,
            data: executeTxData as `0x${string}`,
            value: '0',
            chainId: arbitrumSepolia.id,
          }
        ],
        status: 'pending',
        metadata: {
          operation: 'executeTransaction',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          txIndex,
          txData: {
            to: this.multisigContractAddress,
            data: executeTxData,
            value: '0'
          }
        }
      };
    } catch (error) {
      console.error('Error in handleExecuteTransaction:', error);
      throw error;
    }
  }

  private async handleIsOwner(taskId: string, userAddress: string, checkAddress: string): Promise<Task> {
    try {
      console.log('[MultisigTradeAgent] Handling is owner check');

      const isOwner = await this.publicClient.readContract({
        address: this.multisigContractAddress as Address,
        abi: this.multisigAbi,
        functionName: 'is_owner',
        args: [checkAddress as Address]
      });

      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Owner Status Check`,
        description: `Check if ${checkAddress} is an owner of the multisig wallet`,
        transactions: [],
        status: 'completed',
        metadata: {
          operation: 'isOwner',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          checkAddress,
          isOwner: Boolean(isOwner)
        }
      };
    } catch (error) {
      console.error('Error in handleIsOwner:', error);
      return {
        id: taskId,
        type: 'multisig-trade',
        title: `Owner Status Check Failed`,
        description: `Failed to check if ${checkAddress} is an owner: ${error instanceof Error ? error.message : String(error)}`,
        transactions: [],
        status: 'failed',
        metadata: {
          operation: 'isOwner',
          multisigContractAddress: this.multisigContractAddress,
          userAddress,
          checkAddress,
          isOwner: false
        }
      };
    }
  }

  private createErrorTask(taskId: string, errorMessage: string): Task {
    return {
      id: taskId,
      type: 'multisig-trade',
      title: 'Error',
      description: `MultisigTradeAgent error: ${errorMessage}`,
      transactions: [],
      status: 'failed',
      metadata: {
        error: errorMessage
      }
    };
  }
} 