import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { Task } from 'a2a-samples-js';

export interface CounterOperation {
  type: 'read' | 'increment' | 'set';
  value?: number;
  txData?: {
    to: string;
    data: string;
    value: string;
  };
}

export class CounterAgent {
  private publicClient;
  private contractAddress: string;
  private counterAbi = parseAbi([
    'function number() external view returns (uint256)',
    'function setNumber(uint256 number) external',
    'function increment() external',
  ]);

  constructor(
    private rpcUrl: string,
    contractAddress: string
  ) {
    this.contractAddress = contractAddress;
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(this.rpcUrl),
    });
  }

  async init(): Promise<void> {
    console.log('CounterAgent initialized with contract:', this.contractAddress);
  }

  async processUserInput(instruction: string, userAddress: string): Promise<Task> {
    try {
      console.log('[CounterAgent] Processing:', instruction);

      const operation = this.parseInstruction(instruction);
      const taskId = `counter-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      switch (operation.type) {
        case 'read':
          return await this.handleRead(taskId, userAddress);
        case 'increment':
          return await this.handleIncrement(taskId, userAddress);
        case 'set':
          if (operation.value === undefined) {
            throw new Error('Value is required for set operation');
          }
          return await this.handleSet(taskId, userAddress, operation.value);
        default:
          throw new Error('Unknown operation type');
      }
    } catch (error) {
      console.error('[CounterAgent] Error:', error);
      return this.createErrorTask(
        `counter-error-${Date.now()}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private parseInstruction(instruction: string): CounterOperation {
    const lowerInstruction = instruction.toLowerCase();

    // Check for set operations with numbers
    const setMatch = lowerInstruction.match(/set.*?(\d+)/) || 
                    (lowerInstruction.match(/(\d+)/) && lowerInstruction.includes('set'));
    
    if (setMatch || lowerInstruction.includes('set')) {
      const value = setMatch && Array.isArray(setMatch) && setMatch[1] ? parseInt(setMatch[1]) : undefined;
      if (value !== undefined) {
        return { type: 'set', value };
      } else {
        throw new Error('Please specify a number to set the counter to, e.g., "Set counter to 42"');
      }
    }

    // Check for increment operations
    if (lowerInstruction.includes('increment') || 
        lowerInstruction.includes('increase') || 
        lowerInstruction.includes('add') ||
        lowerInstruction.includes('bump')) {
      return { type: 'increment' };
    }

    // Check for read operations (default)
    if (lowerInstruction.includes('get') || 
        lowerInstruction.includes('current') || 
        lowerInstruction.includes('value') || 
        lowerInstruction.includes('read') ||
        lowerInstruction.includes('what') ||
        lowerInstruction.includes('show')) {
      return { type: 'read' };
    }

    // Default to read if unclear
    return { type: 'read' };
  }

  private async handleRead(taskId: string, userAddress: string): Promise<Task> {
    try {
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
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
                text: `The current counter value is: ${currentValue.toString()}`,
              },
            ],
          },
        },
        metadata: {
          operation: 'read',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          userAddress,
        },
      };
    } catch (error) {
      throw new Error(`Failed to read counter value: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleIncrement(taskId: string, userAddress: string): Promise<Task> {
    try {
      // Get current value for reference
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
      });

      // Encode the transaction data
      const txData = encodeFunctionData({
        abi: this.counterAbi,
        functionName: 'increment',
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
                text: `Ready to increment counter from ${currentValue.toString()} to ${(Number(currentValue) + 1).toString()}. Please confirm the transaction in MetaMask.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'increment',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          expectedNewValue: (Number(currentValue) + 1).toString(),
          userAddress,
          txData: {
            to: this.contractAddress,
            data: txData,
            value: '0x0', // No ETH value needed
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare increment transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleSet(taskId: string, userAddress: string, newValue: number): Promise<Task> {
    try {
      // Get current value for reference
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
      });

      // Encode the transaction data
      const txData = encodeFunctionData({
        abi: this.counterAbi,
        functionName: 'setNumber',
        args: [BigInt(newValue)],
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
                text: `Ready to set counter from ${currentValue.toString()} to ${newValue}. Please confirm the transaction in MetaMask.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'set',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          newValue: newValue.toString(),
          userAddress,
          txData: {
            to: this.contractAddress,
            data: txData,
            value: '0x0', // No ETH value needed
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare set transaction: ${error instanceof Error ? error.message : String(error)}`);
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