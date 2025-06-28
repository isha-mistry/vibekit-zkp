"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTransactionExecutor } from "../hooks/useTransactionExecutor";
import type { TxPlan } from "../lib/transactionUtils";

export function MultisigTrade({
  txPreview,
  txPlan,
}: {
  txPreview: any; // TODO: Define MultisigTxPreview type
  txPlan: TxPlan | null;
}) {
  console.log("[MultisigTrade Component] Received txPreview:", txPreview);
  console.log("[MultisigTrade Component] Received txPlan:", txPlan);

  // --- Wagmi hooks ---
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // --- Central executor hook ---
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

  // Show read-only data if this is a read operation
  if (txPreview && !txPlan) {
    return (
      <div className="flex flex-col gap-2 p-8 bg-transparent shadow-md rounded-2xl text-white border-purple-200 border-2">
        <h2 className="text-lg font-semibold mb-4">Multisig Status:</h2>
        <div className="rounded-xl bg-zinc-700 p-4 flex flex-col gap-2">
          <span className="font-normal flex gap-3 w-full items-center text-sm">
            Operation: {txPreview.operation?.toUpperCase()}
          </span>
          
          {txPreview.operation === 'getTransactionDetails' && txPreview.transactionDetails && (
            <div className="space-y-2">
              <p className="font-normal">
                <span className="font-semibold">Transaction #{txPreview.txIndex}:</span>
              </p>
              <p className="text-sm">To: {txPreview.transactionDetails.to}</p>
              <p className="text-sm">Value: {txPreview.transactionDetails.value} wei</p>
              <p className="text-sm">Executed: {txPreview.transactionDetails.executed ? 'Yes' : 'No'}</p>
              <p className="text-sm">Confirmations: {txPreview.transactionDetails.numConfirmations}</p>
            </div>
          )}

          {txPreview.operation === 'getOwners' && txPreview.owners && (
            <div className="space-y-2">
              <p className="font-semibold">Multisig Owners:</p>
              {txPreview.owners.map((owner: string, index: number) => (
                <p key={index} className="text-sm break-all">{owner}</p>
              ))}
            </div>
          )}

          {txPreview.operation === 'getTransactionCount' && (
            <p className="font-normal">
              <span className="font-semibold">Total Transactions: {txPreview.transactionCount}</span>
            </p>
          )}

          {txPreview.operation === 'isOwner' && (
            <p className="font-normal">
              <span className="font-semibold">
                {txPreview.checkAddress} is {txPreview.isOwner ? '' : 'not '}an owner
              </span>
            </p>
          )}

          {txPreview.swapDetails && (
            <div className="space-y-2">
              <p className="font-semibold">Swap Details:</p>
              <p className="text-sm">From: {txPreview.swapDetails.amount} {txPreview.swapDetails.fromToken}</p>
              <p className="text-sm">To: {txPreview.swapDetails.toToken}</p>
              <p className="text-sm">Chain: {txPreview.swapDetails.fromChain}</p>
            </div>
          )}

          <p className="font-normal w-full bg-zinc-600 rounded-full p-2">
            <span className="font-normal text-sm">
              Multisig Contract: {txPreview.multisigContractAddress}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {txPlan && txPreview && (
        <div className="flex flex-col gap-2 p-8 bg-transparent shadow-md rounded-2xl text-white border-purple-200 border-2">
          <h2 className="text-lg font-semibold mb-4">Multisig Transaction:</h2>
          <div className="rounded-xl bg-zinc-700 p-4 flex flex-col gap-2">
            <span className="font-normal flex gap-3 w-full items-center text-sm">
              Operation: {txPreview.operation?.toUpperCase()}
            </span>

            {txPreview.operation === 'swap' && txPreview.swapDetails && (
              <div className="space-y-2">
                <p className="font-semibold text-blue-400">Swap Transaction for Multisig</p>
                <p className="text-sm">From: {txPreview.swapDetails.amount} {txPreview.swapDetails.fromToken}</p>
                <p className="text-sm">To: {txPreview.swapDetails.toToken}</p>
                <p className="text-sm">Chain: {txPreview.swapDetails.fromChain}</p>
                <p className="text-yellow-400 text-sm">⚠️ This will submit the swap to the multisig for approval</p>
              </div>
            )}

            {txPreview.operation === 'initialize' && (
              <div className="space-y-2">
                <p className="font-semibold text-green-400">Initialize Multisig</p>
                <p className="text-sm">Owners: {txPreview.owners?.length || 0}</p>
                <p className="text-sm">Required Confirmations: {txPreview.numConfirmationsRequired}</p>
              </div>
            )}

            {txPreview.operation === 'deposit' && (
              <div className="space-y-2">
                <p className="font-semibold text-green-400">Deposit to Multisig</p>
                <p className="text-sm">Amount: {txPreview.ethAmount} ETH</p>
              </div>
            )}

            {(txPreview.operation === 'confirmTransaction' || 
              txPreview.operation === 'executeTransaction' || 
              txPreview.operation === 'revokeConfirmation') && (
              <div className="space-y-2">
                <p className="font-semibold text-orange-400">
                  {txPreview.operation === 'confirmTransaction' && 'Confirm Transaction'}
                  {txPreview.operation === 'executeTransaction' && 'Execute Transaction'}
                  {txPreview.operation === 'revokeConfirmation' && 'Revoke Confirmation'}
                </p>
                <p className="text-sm">Transaction Index: #{txPreview.txIndex}</p>
              </div>
            )}

            <p className="font-normal w-full bg-zinc-600 rounded-full p-2">
              <span className="font-normal text-sm">
                Multisig Contract: {txPreview.multisigContractAddress}
              </span>
            </p>
          </div>

          {isConnected ? (
            <>
              {/* Main Transaction Status */}
              {isTxSuccess && (
                <p className="p-2 rounded-2xl border-green-800 bg-green-200 w-full border-2 text-green-800">
                  Multisig Transaction Successful!
                </p>
              )}
              {isTxPending && (
                <p className="p-2 rounded-2xl border-gray-400 bg-gray-200 w-full border-2 text-slate-800">
                  Executing Transaction...
                </p>
              )}
              {txError && (
                <p className="p-2 rounded-2xl border-red-800 bg-red-400 w-full border-2 text-white break-words">
                  Execution Error!{" "}
                  {(txError as any).shortMessage ||
                    txError.message ||
                    JSON.stringify(txError, null, 2)}
                </p>
              )}

              {/* Approval Status */}
              {needsApproval && isApprovalPending && (
                <p className="p-2 rounded-2xl border-gray-400 bg-gray-200 w-full border-2 text-slate-800">
                  {`Processing Approval ${
                    approvalIndex + 1
                  }/${totalApprovals}...`}
                </p>
              )}
              {needsApproval && approvalError && (
                <p className="p-2 rounded-2xl border-red-800 bg-red-400 w-full border-2 text-white break-words">
                  Approval Error!{" "}
                  {(approvalError as any).shortMessage ||
                    approvalError.message ||
                    JSON.stringify(approvalError, null, 2)}
                </p>
              )}
              {needsApproval &&
                isApprovalPhaseComplete &&
                !isTxPending &&
                !isTxSuccess &&
                !txError && (
                  <p className="p-2 rounded-2xl border-green-800 bg-green-200 w-full border-2 text-green-800">
                    All Approvals Sent! Ready to execute.
                  </p>
                )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {needsApproval && (
                  <button
                    className="mt-4 bg-purple-700 text-white py-2 px-4 rounded-full disabled:bg-zinc-600 disabled:border-2 disabled:border-zinc-500 disabled:text-gray-400"
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
                  className="mt-4 bg-purple-700 text-white py-2 px-4 rounded-full disabled:opacity-50"
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
            </>
          ) : (
            // Wallet not connected section
            <p className="text-red-500 p-2 flex rounded-2xl border-gray-400 bg-gray-200 w-full border-2 flex-col">
              <div className="mb-2">Please connect your Wallet to proceed</div>
              <ConnectButton />
            </p>
          )}
        </div>
      )}
    </>
  );
} 