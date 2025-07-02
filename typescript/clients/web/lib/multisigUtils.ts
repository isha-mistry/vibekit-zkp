import type { TxPlan } from './transactionUtils';

export interface MultisigTradeAgentResponse {
  id: string;
  status: {
    state: 'completed' | 'failed' | 'input-required';
    message: {
      role: 'agent';
      parts: Array<{
        type: 'text';
        text: string;
      }>;
    };
  };
  artifacts?: Array<{
    name: string;
    parts: Array<{
      type: 'data';
      data: {
        txPreview: {
          operation: 'swap' | 'initialize' | 'submitTransaction' | 'confirmTransaction' | 'executeTransaction' | 'isOwner' | 'getTransactionCount';
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
          
          // Transaction management fields
          txIndex?: number;
          
          // Read operation results
          isOwner?: boolean;
          checkAddress?: string;
          transactionCount?: string;
        };
        txPlan: TxPlan | null;
      };
    }>;
  }>;
}

export function extractMultisigTransactionData(response: MultisigTradeAgentResponse): {
  txPreview: any;
  txPlan: TxPlan | null;
} {
  const { artifacts } = response;
  
  if (!artifacts || artifacts.length === 0) {
    return { txPreview: null, txPlan: null };
  }

  // Get the first artifact's data
  const artifactData = artifacts[0]?.parts[0]?.data;
  
  if (!artifactData) {
    return { txPreview: null, txPlan: null };
  }

  return {
    txPreview: artifactData.txPreview,
    txPlan: artifactData.txPlan
  };
} 