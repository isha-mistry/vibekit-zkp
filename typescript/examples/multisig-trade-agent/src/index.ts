import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Task } from 'a2a-samples-js';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import { isAddress } from 'viem';
import { z } from 'zod';

import { MultisigTradeAgent } from './agent.js';

const MultisigTradeAgentSchema = z.object({
  instruction: z
    .string()
    .describe(
      "A natural-language instruction for multisig operations, e.g. 'Initialize multisig with 2 confirmations', 'Submit transaction to 0x123...', 'Confirm transaction 0', 'Execute transaction 1', 'Check if I am an owner'."
    ),
  userAddress: z
    .string()
    .describe('The user wallet address which is used to sign transactions and to pay for gas.'),
});
type MultisigTradeAgentArgs = z.infer<typeof MultisigTradeAgentSchema>;

dotenv.config();

const server = new McpServer({
  name: 'mcp-sse-multisig-trade-agent-server',
  version: '1.0.0',
});

let agent: MultisigTradeAgent;

const initializeAgent = async (): Promise<void> => {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
  const multisigContractAddress = process.env.MULTISIG_CONTRACT_ADDRESS;
  const quicknodeSubdomain = process.env.QUICKNODE_SUBDOMAIN;
  const quicknodeApiKey = process.env.QUICKNODE_API_KEY;
  
  if (!multisigContractAddress) {
    throw new Error('MULTISIG_CONTRACT_ADDRESS must be set in the .env file.');
  }
  
  if (!quicknodeSubdomain || !quicknodeApiKey) {
    throw new Error('QUICKNODE_SUBDOMAIN and QUICKNODE_API_KEY must be set in the .env file for swap functionality.');
  }

  agent = new MultisigTradeAgent(rpcUrl, multisigContractAddress, quicknodeSubdomain, quicknodeApiKey);
  await agent.init();
};

const agentToolName = 'askMultisigTradeAgent';
const agentToolDescription =
  'Sends a free-form, natural-language instruction to this multisig AI agent for managing an Arbitrum Stylus multisig smart contract written in Rust. You can initialize the multisig, submit transactions, confirm/execute transactions, check ownership status, and query multisig state. The agent returns structured responses with transaction details for write operations.';

server.tool(
  agentToolName,
  agentToolDescription,
  MultisigTradeAgentSchema.shape,
  async (args: MultisigTradeAgentArgs) => {
    const { instruction, userAddress } = args;
    if (!isAddress(userAddress)) {
      throw new Error('Invalid user address provided.');
    }
    try {
      const taskResponse = await agent.processUserInput(instruction, userAddress);

      console.error('[server.tool] result', taskResponse);

      return {
        content: [{ type: 'text', text: JSON.stringify(taskResponse) }],
      };
    } catch (error: unknown) {
      const err = error as Error;
      const errorTask: Task = {
        id: userAddress,
        status: {
          state: 'failed',
          message: {
            role: 'agent',
            parts: [{ type: 'text', text: `Error: ${err.message}` }],
          },
        },
      };
      return {
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(errorTask) }],
      };
    }
  }
);

const app = express();

app.use(cors());

app.get('/', (_req, res) => {
  res.json({
    name: 'MCP SSE Multisig Trade Agent Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      '/': 'Server information (this response)',
      '/sse': 'Server-Sent Events endpoint for MCP connection',
      '/messages': 'POST endpoint for MCP messages',
    },
    tools: [{ name: agentToolName, description: agentToolDescription }],
  });
});

const sseConnections = new Set();

let transport: SSEServerTransport;

app.get('/sse', async (_req, res) => {
  transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);

  sseConnections.add(res);

  const keepaliveInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(keepaliveInterval);
      return;
    }
    res.write(':keepalive\n\n');
  }, 30000);

  _req.on('close', () => {
    clearInterval(keepaliveInterval);
    sseConnections.delete(res);
    transport.close?.();
  });

  res.on('error', err => {
    console.error('SSE Error:', err);
    clearInterval(keepaliveInterval);
    sseConnections.delete(res);
    transport.close?.();
  });
});

app.post('/messages', async (req, res) => {
  await transport.handlePostMessage(req, res);
});

const PORT = parseInt(process.env.PORT || '3011', 10);
const main = async () => {
  try {
    await initializeAgent();
    app.listen(PORT, () => {
      console.error(`🚀 Multisig Trade Agent running on port ${PORT}`);
      console.error(`📍 Base URL: http://localhost:${PORT}`);
      console.error(`🔌 MCP SSE: http://localhost:${PORT}/sse`);
      console.error('✨ Multisig trading operations via MetaMask ready!');
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

main(); 