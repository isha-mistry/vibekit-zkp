import type { TxPlan } from './transactionUtils';

export interface CounterAgentResponse {
  id: string;
  status: {
    state: 'completed' | 'failed';
    message: {
      role: 'agent';
      parts: Array<{
        type: 'text';
        text: string;
      }>;
    };
  };
  metadata?: {
    operation: 'read' | 'increment' | 'set' | 'multiply' | 'add' | 'addFromMsgValue';
    contractAddress: string;
    currentValue: string;
    expectedNewValue?: string;
    newValue?: string;
    multiplier?: string;
    addValue?: string;
    ethValue?: string;
    ethValueInWei?: string;
    userAddress: string;
    txData?: {
      to: string;
      data: string;
      value: string;
    };
  };
}

export function extractCounterTransactionData(response: CounterAgentResponse): {
  txPreview: any;
  txPlan: TxPlan | null;
} {
  const { metadata } = response;
  
  if (!metadata) {
    return { txPreview: null, txPlan: null };
  }

  // Create the preview data
  const txPreview = {
    operation: metadata.operation,
    contractAddress: metadata.contractAddress,
    currentValue: metadata.currentValue,
    expectedNewValue: metadata.expectedNewValue,
    newValue: metadata.newValue,
    multiplier: metadata.multiplier,
    addValue: metadata.addValue,
    ethValue: metadata.ethValue,
    ethValueInWei: metadata.ethValueInWei,
    userAddress: metadata.userAddress,
  };

  // Create the transaction plan if this is a write operation
  let txPlan: TxPlan | null = null;
  if (metadata.txData && 
      (metadata.operation === 'increment' || 
       metadata.operation === 'set' || 
       metadata.operation === 'multiply' || 
       metadata.operation === 'add' || 
       metadata.operation === 'addFromMsgValue')) {
    txPlan = [
      {
        to: metadata.txData.to as `0x${string}`,
        data: metadata.txData.data as `0x${string}`,
        value: metadata.txData.value,
        chainId: 421614, // Arbitrum Sepolia chain ID
      }
    ];
  }

  return { txPreview, txPlan };
} 