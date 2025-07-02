import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { Task } from 'a2a-samples-js';

export interface CounterOperation {
  type: 'read' | 'increment' | 'set' | 'multiply' | 'add' | 'addFromMsgValue';
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
    'function setNumber(uint256 new_number) external',
    'function mulNumber(uint256 new_number) external',
    'function addNumber(uint256 new_number) external',
    'function increment() external',
    'function addFromMsgValue() external payable',
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
    console.log('CounterAgent initialized with Stylus contract:', this.contractAddress);
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
        case 'multiply':
          if (operation.value === undefined) {
            throw new Error('Value is required for multiply operation');
          }
          return await this.handleMultiply(taskId, userAddress, operation.value);
        case 'add':
          if (operation.value === undefined) {
            throw new Error('Value is required for add operation');
          }
          return await this.handleAdd(taskId, userAddress, operation.value);
        case 'addFromMsgValue':
          if (operation.value === undefined) {
            throw new Error('ETH value is required for addFromMsgValue operation');
          }
          return await this.handleAddFromMsgValue(taskId, userAddress, operation.value);
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

    // Check for addFromMsgValue operations (with ETH value)
    const ethValueMatch = lowerInstruction.match(/(\d+(?:\.\d+)?)\s*eth/) || 
                         lowerInstruction.match(/(\d+(?:\.\d+)?)\s*ether/);
    
    if (ethValueMatch && ethValueMatch[1] && (lowerInstruction.includes('send') || 
        lowerInstruction.includes('deposit') || 
        (lowerInstruction.includes('add') && lowerInstruction.includes('eth')))) {
      const ethValue = parseFloat(ethValueMatch[1]);
      return { type: 'addFromMsgValue', value: ethValue };
    }

    // Check for multiply operations
    let multiplyMatch = lowerInstruction.match(/multiply.*?(\d+)/);
    if (!multiplyMatch) {
      multiplyMatch = lowerInstruction.match(/(\d+).*?multiply/);
    }
    if (!multiplyMatch && lowerInstruction.includes('multiply')) {
      multiplyMatch = lowerInstruction.match(/(\d+)/);
    }
    
    if (multiplyMatch && multiplyMatch[1] && (lowerInstruction.includes('multiply') || lowerInstruction.includes('times'))) {
      const value = parseInt(multiplyMatch[1]);
      return { type: 'multiply', value };
    }

    // Check for add operations (but not increment)
    let addMatch = lowerInstruction.match(/add.*?(\d+)/);
    if (!addMatch && lowerInstruction.includes('add') && !lowerInstruction.includes('increment') && !lowerInstruction.includes('eth')) {
      addMatch = lowerInstruction.match(/(\d+)/);
    }
    
    if (addMatch && addMatch[1] && !lowerInstruction.includes('increment') && !lowerInstruction.includes('eth')) {
      const value = parseInt(addMatch[1]);
      return { type: 'add', value };
    }

    // Check for set operations with numbers
    let setMatch = lowerInstruction.match(/set.*?(\d+)/);
    if (!setMatch && lowerInstruction.includes('set')) {
      setMatch = lowerInstruction.match(/(\d+)/);
    }
    
    if (setMatch && setMatch[1]) {
      const value = parseInt(setMatch[1]);
        return { type: 'set', value };
    }

    // Check for increment operations
    if (lowerInstruction.includes('increment') || 
        lowerInstruction.includes('increase') || 
        (lowerInstruction.includes('add') && !lowerInstruction.match(/\d/)) ||
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

  private async handleMultiply(taskId: string, userAddress: string, multiplier: number): Promise<Task> {
    try {
      // Get current value for reference
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
      });

      const expectedNewValue = Number(currentValue) * multiplier;

      // Encode the transaction data
      const txData = encodeFunctionData({
        abi: this.counterAbi,
        functionName: 'mulNumber',
        args: [BigInt(multiplier)],
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
                text: `Ready to multiply counter ${currentValue.toString()} by ${multiplier} = ${expectedNewValue}. Please confirm the transaction in MetaMask.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'multiply',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          multiplier: multiplier.toString(),
          expectedNewValue: expectedNewValue.toString(),
          userAddress,
          txData: {
            to: this.contractAddress,
            data: txData,
            value: '0x0', // No ETH value needed
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare multiply transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleAdd(taskId: string, userAddress: string, addValue: number): Promise<Task> {
    try {
      // Get current value for reference
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
      });

      const expectedNewValue = Number(currentValue) + addValue;

      // Encode the transaction data
      const txData = encodeFunctionData({
        abi: this.counterAbi,
        functionName: 'addNumber',
        args: [BigInt(addValue)],
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
                text: `Ready to add ${addValue} to counter ${currentValue.toString()} = ${expectedNewValue}. Please confirm the transaction in MetaMask.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'add',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          addValue: addValue.toString(),
          expectedNewValue: expectedNewValue.toString(),
          userAddress,
          txData: {
            to: this.contractAddress,
            data: txData,
            value: '0x0', // No ETH value needed
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare add transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleAddFromMsgValue(taskId: string, userAddress: string, ethValue: number): Promise<Task> {
    try {
      // Get current value for reference
      const currentValue = await this.publicClient.readContract({
        address: this.contractAddress as `0x${string}`,
        abi: this.counterAbi,
        functionName: 'number',
      });

      // Convert ETH to wei
      const ethValueInWei = BigInt(Math.floor(ethValue * 1e18));
      const expectedNewValue = Number(currentValue) + Number(ethValueInWei);

      // Encode the transaction data
      const txData = encodeFunctionData({
        abi: this.counterAbi,
        functionName: 'addFromMsgValue',
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
                text: `Ready to send ${ethValue} ETH (${ethValueInWei.toString()} wei) to add to counter. Current: ${currentValue.toString()}, Expected new value: ${expectedNewValue}. Please confirm the transaction in MetaMask.`,
              },
            ],
          },
        },
        metadata: {
          operation: 'addFromMsgValue',
          contractAddress: this.contractAddress,
          currentValue: currentValue.toString(),
          ethValue: ethValue.toString(),
          ethValueInWei: ethValueInWei.toString(),
          expectedNewValue: expectedNewValue.toString(),
          userAddress,
          txData: {
            to: this.contractAddress,
            data: txData,
            value: `0x${ethValueInWei.toString(16)}`, // ETH value in hex
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to prepare addFromMsgValue transaction: ${error instanceof Error ? error.message : String(error)}`);
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