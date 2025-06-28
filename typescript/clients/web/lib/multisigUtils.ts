import type { TxPlan } from './transactionUtils';

export interface MultisigTradeAgentResponse {
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
    operation: 'swap' | 'initialize' | 'deposit' | 'confirmTransaction' | 'executeTransaction' | 'revokeConfirmation' | 'getTransactionDetails' | 'getOwners' | 'getTransactionCount' | 'isOwner';
    multisigContractAddress: string;
    userAddress: string;
    
    // Swap-specific fields
    swapDetails?: {
      fromToken: string;
      toToken: string;
      amount: string;
      fromChain?: string;
      toChain?: string;
    };
    originalSwapTx?: {
      to: string;
      data: string;
      value: string;
    };
    
    // Initialize-specific fields
    owners?: string[];
    numConfirmationsRequired?: number;
    
    // Deposit-specific fields
    ethAmount?: string;
    ethValueInWei?: string;
    
    // Transaction management fields
    txIndex?: number;
    
    // Read operation results
    transactionDetails?: {
      to: string;
      value: string;
      data: string;
      executed: boolean;
      numConfirmations: string;
    };
    transactionCount?: string;
    isOwner?: boolean;
    checkAddress?: string;
    
    // Transaction data for execution
    txData?: {
      to: string;
      data: string;
      value: string;
    };
  };
}

export function extractMultisigTransactionData(response: MultisigTradeAgentResponse): {
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
    multisigContractAddress: metadata.multisigContractAddress,
    userAddress: metadata.userAddress,
    
    // Swap-specific data
    swapDetails: metadata.swapDetails,
    originalSwapTx: metadata.originalSwapTx,
    
    // Initialize-specific data
    owners: metadata.owners,
    numConfirmationsRequired: metadata.numConfirmationsRequired,
    
    // Deposit-specific data
    ethAmount: metadata.ethAmount,
    ethValueInWei: metadata.ethValueInWei,
    
    // Transaction management data
    txIndex: metadata.txIndex,
    
    // Read operation results
    transactionDetails: metadata.transactionDetails,
    transactionCount: metadata.transactionCount,
    isOwner: metadata.isOwner,
    checkAddress: metadata.checkAddress,
  };

  // Create the transaction plan if this is a write operation
  let txPlan: TxPlan | null = null;
  if (metadata.txData && 
      (metadata.operation === 'swap' || 
       metadata.operation === 'initialize' || 
       metadata.operation === 'deposit' || 
       metadata.operation === 'confirmTransaction' || 
       metadata.operation === 'executeTransaction' || 
       metadata.operation === 'revokeConfirmation')) {
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