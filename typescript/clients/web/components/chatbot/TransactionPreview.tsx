'use client';

import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTransactionExecutor } from "../../hooks/useTransactionExecutor";
import type { TxPlan } from "../../lib/transactionUtils";
import { Bot } from "lucide-react";

interface TransactionPreviewProps {
  txPreview: any;
  txPlan: TxPlan | null;
  isLoading?: boolean;
  className?: string;
}

export function TransactionPreview({
  txPreview,
  txPlan,
  isLoading = false,
  className = "",
}: TransactionPreviewProps) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const {
    approveNext,
    executeMain,
    approvalIndex,
    totalApprovals,
    isApprovalPending,
    approvalError,
    isTxPending,
    isTxSuccess,
    txError,
    canApprove,
    canExecute,
    isApprovalPhaseComplete,
  } = useTransactionExecutor({
    txPlan,
    isConnected: !!isConnected,
    address,
    currentChainId: chainId,
    switchChainAsync,
  });

  const needsApproval = totalApprovals > 0;

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="chatbot-transaction-preview">
        <div className="chatbot-transaction-header">
          <Bot className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium">Preparing transaction...</span>
        </div>
        <div className="chatbot-transaction-content">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!txPlan || !txPreview) {
    return null;
  }

  return (
    <div className={`chatbot-transaction-preview ${className}`}>
      <div className="chatbot-transaction-header">
        <Bot className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-medium">Transaction Preview</span>
      </div>
      
      <div className="chatbot-transaction-content">
        <div className="chatbot-transaction-section">
          <div className="text-xs text-gray-500 mb-2">From:</div>
          <div className="chatbot-transaction-token">
            <span className="font-semibold">
              {txPreview?.fromTokenAmount} {txPreview?.fromTokenSymbol?.toUpperCase()}
            </span>
            {txPreview?.fromChain && (
              <span className="text-xs text-gray-500"> (on {txPreview.fromChain})</span>
            )}
          </div>
          {txPreview?.fromTokenAddress && (
            <div className="chatbot-transaction-address">
              {txPreview.fromTokenAddress}
            </div>
          )}
        </div>

        <div className="chatbot-transaction-divider"></div>

        <div className="chatbot-transaction-section">
          <div className="text-xs text-gray-500 mb-2">To:</div>
          <div className="chatbot-transaction-token">
            <span className="font-semibold">
              {txPreview?.toTokenAmount} {txPreview?.toTokenSymbol?.toUpperCase()}
            </span>
            {txPreview?.toChain && (
              <span className="text-xs text-gray-500"> (on {txPreview.toChain})</span>
            )}
          </div>
          {txPreview?.toTokenAddress && (
            <div className="chatbot-transaction-address">
              {txPreview.toTokenAddress}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {isTxSuccess && (
          <div className="chatbot-status-success">
            Transaction Successful!
          </div>
        )}
        {isTxPending && (
          <div className="chatbot-status-pending">
            Executing Transaction...
          </div>
        )}
        {txError && (
          <div className="chatbot-status-error">
            Execution Error! {(txError as any).shortMessage || txError.message}
          </div>
        )}

        {/* Approval Status */}
        {needsApproval && isApprovalPending && (
          <div className="chatbot-status-pending">
            Processing Approval {approvalIndex + 1}/{totalApprovals}...
          </div>
        )}
        {needsApproval && approvalError && (
          <div className="chatbot-status-error">
            Approval Error! {(approvalError as any).shortMessage || approvalError.message}
          </div>
        )}
        {needsApproval && isApprovalPhaseComplete && !isTxPending && !isTxSuccess && !txError && (
          <div className="chatbot-status-success">
            All Approvals Sent! Ready to execute.
          </div>
        )}

        {/* Action Buttons */}
        {isConnected ? (
          <div className="chatbot-transaction-actions">
            {needsApproval && (
              <button
                className="chatbot-btn-primary"
                type="button"
                onClick={approveNext}
                disabled={!canApprove}
              >
                {isApprovalPending
                  ? `Approving ${approvalIndex + 1}/${totalApprovals}...`
                  : isApprovalPhaseComplete
                  ? "All Approved"
                  : `Approve ${approvalIndex + 1}/${totalApprovals}`}
              </button>
            )}
            <button
              className="chatbot-btn-primary"
              type="button"
              onClick={executeMain}
              disabled={!canExecute}
            >
              {isTxPending
                ? "Executing..."
                : needsApproval
                ? "Execute Transaction"
                : "Sign Transaction"}
            </button>
          </div>
        ) : (
          <div className="chatbot-connect-wallet">
            <p className="text-sm text-gray-600 mb-2">Connect wallet to execute transaction</p>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="chatbot-btn-secondary"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        )}
      </div>
    </div>
  );
} 