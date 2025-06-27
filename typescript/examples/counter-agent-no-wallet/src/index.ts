import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Task } from 'a2a-samples-js';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import { isAddress } from 'viem';
import { z } from 'zod';

import { CounterAgent } from './agent.js';

const CounterAgentSchema = z.object({
  instruction: z
    .string()
    .describe(
      "A natural-language instruction for counter operations, e.g. 'Get the current counter value', 'Increment the counter', or 'Set the counter to 42'."
    ),
  userAddress: z
    .string()
    .describe('The user wallet address which is used to sign transactions and to pay for gas.'),
});
type CounterAgentArgs = z.infer<typeof CounterAgentSchema>;

dotenv.config();

const server = new McpServer({
  name: 'mcp-sse-counter-agent-server',
  version: '1.0.0',
});

let agent: CounterAgent;

const initializeAgent = async (): Promise<void> => {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
  const contractAddress = process.env.COUNTER_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('COUNTER_CONTRACT_ADDRESS must be set in the .env file.');
  }

  agent = new CounterAgent(rpcUrl, contractAddress);
  await agent.init();
};

const agentToolName = 'askCounterAgent';
const agentToolDescription =
  'Sends a free-form, natural-language instruction to this counter AI agent for interacting with an Arbitrum Stylus counter smart contract written in Rust. You can get the current counter value, increment it by 1, set it to a specific number, multiply it by a value, add a value to it, or send ETH to add the wei value to the counter. The agent returns structured responses with transaction details for write operations.';

server.tool(
  agentToolName,
  agentToolDescription,
  CounterAgentSchema.shape,
  async (args: CounterAgentArgs) => {
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
    name: 'MCP SSE Counter Agent Server',
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

const PORT = parseInt(process.env.PORT || '3010', 10);
const main = async () => {
  try {
    await initializeAgent();
    app.listen(PORT, () => {
      console.error(`🚀 Counter Agent (No Wallet) running on port ${PORT}`);
      console.error(`📍 Base URL: http://localhost:${PORT}`);
      console.error(`🔌 MCP SSE: http://localhost:${PORT}/sse`);
      console.error('✨ Counter operations via MetaMask ready!');
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

main(); 