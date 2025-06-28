export const chatAgents = [
  {
    id: 'ember-aave' as const,
    name: 'Lending',
    description: 'AAVE lending agent',
    suggestedActions: [
      {
        title: 'Deposit WETH',
        label: 'to my balance',
        action: 'Deposit WETH to my balance',
      },
      { title: 'Check', label: 'balance', action: 'Check balance' },
    ],
  },
  {
    id: 'ember-camelot' as const,
    name: 'Trading',
    description: 'Camelot Swapping agent',
    suggestedActions: [
      {
        title: 'Swap USDC for ETH',
        label: 'on Arbitrum Network.',
        action: 'Swap USDC for ETH tokens from Arbitrum to Arbitrum.',
      },
      {
        title: 'Buy ARB',
        label: 'on Arbitrum.',
        action: 'Buy ARB token.',
      },
    ],
  },
  {
    id: 'ember-counter' as const,
    name: 'Counter',
    description: 'Arbitrum Stylus counter smart contract agent (Rust-based)',
    suggestedActions: [
      {
        title: 'Get current',
        label: 'counter value',
        action: 'What is the current counter value?',
      },
      {
        title: 'Increment',
        label: 'the counter',
        action: 'Increment the counter by 1',
      },
      {
        title: 'Set counter',
        label: 'to 42',
        action: 'Set the counter to 42',
      },
      {
        title: 'Multiply counter',
        label: 'by 3',
        action: 'Multiply the counter by 3',
      },
      {
        title: 'Add 25',
        label: 'to counter',
        action: 'Add 25 to the counter',
      },
      {
        title: 'Send 0.001 ETH',
        label: 'to add to counter',
        action: 'Send 0.001 ETH to add to the counter',
      },
    ],
  },
  {
    id: 'ember-multisig-trade' as const,
    name: 'Multisig Trade',
    description: 'Arbitrum Stylus multisig trading agent (Rust-based) for multi-signature swaps via Camelot DEX',
    suggestedActions: [
      {
        title: 'Swap 100 USDC',
        label: 'for ETH (multisig)',
        action: 'Swap 100 USDC for ETH through multisig',
      },
      {
        title: 'Initialize multisig',
        label: 'with 2 confirmations',
        action: 'Initialize multisig with 2 confirmations required',
      },
      {
        title: 'Get transaction',
        label: 'count',
        action: 'How many transactions are in the multisig?',
      },
      {
        title: 'Confirm transaction',
        label: 'index 0',
        action: 'Confirm transaction 0',
      },
      {
        title: 'Execute transaction',
        label: 'index 0',
        action: 'Execute transaction 0',
      },
      {
        title: 'Get multisig',
        label: 'owners',
        action: 'Get multisig owners',
      },
    ],
  },
  // {
  //   id: 'langgraph-workflow' as const,
  //   name: 'Greeting Optimizer',
  //   description: 'LangGraph workflow agent that optimizes greetings',
  //   suggestedActions: [
  //     {
  //       title: 'Optimize',
  //       label: 'hello',
  //       action: 'Optimize: hello',
  //     },
  //     {
  //       title: 'Make',
  //       label: 'hi better',
  //       action: 'Make this greeting better: hi',
  //     },
  //     {
  //       title: 'Improve',
  //       label: 'good morning',
  //       action: 'Optimize: good morning',
  //     },
  //   ],
  // },
  // {
  //   id: 'quickstart-agent-template' as const,
  //   name: 'Quickstart',
  //   description: 'Quickstart agent',
  //   suggestedActions: [],
  // },
  // {
  //   id: 'allora-price-prediction-agent' as const,
  //   name: 'Price Prediction',
  //   description: 'Allora price prediction agent',
  //   suggestedActions: [
  //     {
  //       title: 'Get BTC',
  //       label: 'price prediction',
  //       action: 'What is the price prediction for BTC?',
  //     },
  //     {
  //       title: 'Get ETH',
  //       label: 'price prediction',
  //       action: 'What is the price prediction for ETH?',
  //     },
  //     {
  //       title: 'Compare BTC and ETH',
  //       label: 'predictions',
  //       action: 'Get price predictions for both BTC and ETH',
  //     },
  //   ],
  // },
  // {
  //   id: "ember-lp" as const,
  //   name: "LPing",
  //   description: "Camelot Liquidity Provisioning agent",
  //   suggestedActions: [
  //     {
  //       title: "Provide Liquidity",
  //       label: "on Arbitrum.",
  //       action: "Provide Liquidity on Arbitrum.",
  //     },
  //     {
  //       title: "Check",
  //       label: "Liquidity positions",
  //       action: "Check Positions",
  //     },
  //   ],
  // },
  // {
  //   id: "ember-pendle" as const,
  //   name: "Pendle",
  //   description: "Test agent for Pendle",
  //   suggestedActions: [
  //     {
  //       title: "Deposit WETH",
  //       label: "to my balance",
  //       action: "Deposit WETH to my balance",
  //     },
  //     {
  //       title: "Check",
  //       label: "balance",
  //       action: "Check balance",
  //     },
  //   ],
  // },
  {
    id: 'all' as const,
    name: 'All agents',
    description: 'All agents',
    suggestedActions: [
      {
        title: 'What Agents',
        label: 'are available?',
        action: 'What Agents are available?',
      },
      {
        title: 'What can Ember AI',
        label: 'help me with?',
        action: 'What can Ember AI help me with?',
      },
    ],
  },
] as const;

export const DEFAULT_SERVER_URLS = new Map<ChatAgentId, string>([
  ['ember-aave', 'http://lending-agent-no-wallet:3001/sse'],
  ['ember-camelot', 'http://swapping-agent-no-wallet:3005/sse'],
  ['ember-counter', 'http://counter-agent-no-wallet:3010/sse'],
  ['ember-multisig-trade', 'http://multisig-trade-agent:3011/sse'],
  // ['langgraph-workflow', 'http://langgraph-workflow-agent:3009/sse'],
  // ['quickstart-agent-template', 'http://quickstart-agent-template:3007/sse'],
  // ['allora-price-prediction-agent', 'http://allora-price-prediction-agent:3008/sse'],
  // ["ember-lp", "http://liquidity-agent-no-wallet:3002/sse"],
  // ["ember-pendle", "http://pendle-agent:3003/sse"],
]);

export type ChatAgentId = (typeof chatAgents)[number]['id'];
