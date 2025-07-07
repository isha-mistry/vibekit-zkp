"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useTransactionExecutor } from "../hooks/useTransactionExecutor";
import type { TxPlan } from "../lib/transactionUtils";

export function Counter({
  txPreview,
  txPlan,
}: {
  txPreview: any; // TODO: Define CounterTxPreview type
  txPlan: TxPlan | null;
}) {
  console.log("[Counter Component] Received txPreview:", txPreview);
  console.log("[Counter Component] Received txPlan:", txPlan);

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
      <div className="flex flex-col gap-2 p-8 bg-transparent shadow-md rounded-2xl text-green-500 border-blue-200 border-2">
        <h2 className="text-lg font-semibold mb-4">Counter Status:</h2>
        <div className="rounded-xl bg-zinc-700 p-4 flex flex-col gap-2">
          <span className="font-normal flex gap-3 w-full items-center text-sm">
            Operation: {txPreview.operation?.toUpperCase()}
          </span>
          <p className="font-normal w-full">
            <span className="font-normal">
              <span className="font-semibold">
                Current Value: {txPreview.currentValue}
              </span>
              {txPreview.expectedNewValue && (
                <span className="text-green-400">
                  {" → "} {txPreview.expectedNewValue}
                </span>
              )}
                {txPreview.multiplier && (
                  <span className="text-blue-400">
                    {" × "} {txPreview.multiplier}
                  </span>
                )}
                {txPreview.addValue && (
                  <span className="text-blue-400">
                    {" + "} {txPreview.addValue}
                  </span>
                )}
                {txPreview.ethValue && (
                  <span className="text-yellow-400">
                    {" + "} {txPreview.ethValue} ETH
                  </span>
                )}
            </span>
          </p>
          <p className="font-normal w-full bg-zinc-600 rounded-full p-2">
            <span className="font-normal text-sm">
              Contract: {txPreview.contractAddress}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {txPlan && txPreview && (
        <div className="flex flex-col gap-2 p-8 bg-transparent shadow-md rounded-2xl text-green-500 border-blue-200 border-2">
          <h2 className="text-lg font-semibold mb-4">Counter Transaction:</h2>
          <div className="rounded-xl bg-zinc-700 p-4 flex flex-col gap-2">
            <span className="font-normal flex gap-3 w-full items-center text-sm">
              Operation: {txPreview.operation?.toUpperCase()}
            </span>
            <p className="font-normal w-full">
              <span className="font-normal">
                <span className="font-semibold">
                  Current Value: {txPreview.currentValue}
                </span>
                {txPreview.expectedNewValue && (
                  <span className="text-green-400">
                    {" → "} {txPreview.expectedNewValue}
                  </span>
                )}
                {txPreview.newValue && (
                  <span className="text-green-400">
                    {" → "} {txPreview.newValue}
                  </span>
                )}
                {txPreview.multiplier && (
                  <span className="text-blue-400">
                    {" × "} {txPreview.multiplier}
                  </span>
                )}
                {txPreview.addValue && (
                  <span className="text-blue-400">
                    {" + "} {txPreview.addValue}
                  </span>
                )}
                {txPreview.ethValue && (
                  <span className="text-yellow-400">
                    {" + "} {txPreview.ethValue} ETH
                  </span>
                )}
              </span>
            </p>
            <p className="font-normal w-full bg-zinc-600 rounded-full p-2">
              <span className="font-normal text-sm">
                Contract: {txPreview.contractAddress}
              </span>
            </p>
          </div>

          {isConnected ? (
            <>
              {/* Main Transaction Status */}
              {isTxSuccess && (
                <p className="p-2 rounded-2xl border-green-800 bg-green-200 w-full border-2 text-green-800">
                  Counter Transaction Successful!
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
                    className="mt-4 bg-cyan-700 text-white py-2 px-4 rounded-full disabled:bg-zinc-600 disabled:border-2 disabled:border-zinc-500 disabled:text-gray-400"
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
                  className="mt-4 bg-cyan-700 text-white py-2 px-4 rounded-full disabled:opacity-50"
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