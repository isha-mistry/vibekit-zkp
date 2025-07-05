# Vibekit AI Chatbot Widget

A comprehensive, embeddable AI chatbot widget that integrates with Vibekit's DeFi agents for lending, trading, and smart contract operations.

## Features

- 🤖 **Multi-Agent Support**: Integrates with lending, trading, and counter agents
- 🔗 **Wallet Integration**: Built-in support for RainbowKit wallet connections
- 🎨 **Customizable UI**: Configurable colors, positioning, and styling
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔧 **Easy Integration**: Multiple integration methods for different use cases
- 🌐 **Cross-Site Compatible**: Can be embedded on any website

## Quick Start

### 1. Integration in Existing Vibekit App

The chatbot is automatically integrated into the main Vibekit application. It appears in the bottom-right corner of every page.

```tsx
// Already integrated in app/layout.tsx
import { ChatbotIntegration } from '@/components/chatbot/ChatbotIntegration';

// Automatically included with default settings
<ChatbotIntegration />
```

### 2. Custom Integration in React Apps

```tsx
import { ChatbotProvider } from '@/components/chatbot';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      <ChatbotProvider
        position="bottom-right"
        primaryColor="#0ea5e9"
        enabledAgents={['ember-aave', 'ember-camelot']}
        projectId="your-walletconnect-project-id"
      />
    </div>
  );
}
```

### 3. Standalone Widget (No Providers)

```tsx
import { ChatbotWidget } from '@/components/chatbot';

// Use when parent app already has wagmi/rainbowkit providers
function MyComponent() {
  return (
    <ChatbotWidget
      position="bottom-left"
      primaryColor="#10b981"
      enabledAgents={['ember-aave']}
    />
  );
}
```

### 4. External Website Integration

Add to any website by including the standalone script:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- Vibekit Chatbot -->
  <script>
    window.VibikitChatbotConfig = {
      position: 'bottom-right',
      primaryColor: '#0ea5e9',
      apiEndpoint: 'https://your-vibekit-domain.com',
      enabledAgents: ['ember-aave', 'ember-camelot']
    };
  </script>
  <script src="https://your-vibekit-domain.com/vibekit-chatbot.js"></script>
</body>
</html>
```

## Configuration Options

### Common Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Widget position |
| `primaryColor` | `string` | `'#0ea5e9'` | Primary color for UI elements |
| `borderRadius` | `string` | `'12px'` | Border radius for rounded corners |
| `zIndex` | `number` | `9999` | CSS z-index for layering |
| `enabledAgents` | `string[]` | `['ember-aave', 'ember-camelot', 'ember-counter']` | Active agent IDs |

### Provider-Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | `string` | `process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `appName` | `string` | `'Vibekit AI Chatbot'` | App name for wallet connection |
| `wagmiConfig` | `Config` | Auto-generated | Custom wagmi configuration |

## Available Agents

### Lending Agent (`ember-aave`)
- **Description**: AAVE lending operations
- **Capabilities**: Deposit, withdraw, borrow, repay
- **Suggested Actions**:
  - "Deposit WETH to my balance"
  - "Check balance"

### Trading Agent (`ember-camelot`)
- **Description**: Camelot DEX trading
- **Capabilities**: Token swaps, price checks
- **Suggested Actions**:
  - "Swap USDC for ETH on Arbitrum"
  - "Buy ARB token"

### Counter Agent (`ember-counter`)
- **Description**: Arbitrum Stylus smart contract
- **Capabilities**: Counter operations
- **Suggested Actions**:
  - "Get current counter value"
  - "Increment the counter"
  - "Set counter to 42"

## Environment Configuration

### Development Setup

```bash
# Install dependencies
cd typescript/
pnpm install

# Start services
docker-compose up -d

# Run development server
pnpm dev
```

### Production Deployment

1. **Update agent URLs** in `components/chatbot/index.ts`:

```typescript
export function getAgentUrls(environment = 'production') {
  return {
    'ember-aave': 'https://your-domain.com/lending-agent/sse',
    'ember-camelot': 'https://your-domain.com/swapping-agent/sse',
    'ember-counter': 'https://your-domain.com/counter-agent/sse',
  };
}
```

2. **Build and deploy**:

```bash
pnpm build
docker-compose -f docker-compose.prod.yml up -d
```

## API Integration

### Chat API Endpoint

The chatbot communicates with agents through the `/api/chat` endpoint:

```typescript
// Request format
POST /api/chat
{
  "id": "chat-session-id",
  "messages": [...],
  "selectedChatModel": "deepseek/deepseek-chat-v3-0324:free",
  "context": {
    "walletAddress": "0x..."
  }
}
```

### Agent Communication

Agents are contacted via Server-Sent Events (SSE):

```
GET http://agent-service:port/sse
```

## Customization Examples

### Custom Styling

```tsx
<ChatbotProvider
  position="top-left"
  primaryColor="#7c3aed"  // Purple theme
  borderRadius="20px"     // More rounded
  zIndex={10000}
/>
```

### Conditional Rendering

```tsx
import { useChatbotVisibility } from '@/components/chatbot';

function MyApp() {
  const { isVisible, hideChatbot, showChatbot } = useChatbotVisibility();
  
  return (
    <div>
      <button onClick={showChatbot}>Show AI Assistant</button>
      
      {isVisible && (
        <ChatbotIntegration 
          position="bottom-right"
          onClose={hideChatbot}
        />
      )}
    </div>
  );
}
```

### Agent Filtering

```tsx
// Only show lending and trading agents
<ChatbotProvider enabledAgents={['ember-aave', 'ember-camelot']} />

// Show all available agents
<ChatbotProvider enabledAgents={['ember-aave', 'ember-camelot', 'ember-counter']} />
```

## Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Verify `projectId` is correct
   - Check WalletConnect configuration
   - Ensure proper network configuration

2. **Agents Not Responding**
   - Verify agent services are running
   - Check network connectivity
   - Validate agent URLs in configuration

3. **Styling Issues**
   - Ensure Tailwind CSS is loaded
   - Check z-index conflicts
   - Verify CSS custom properties

### Debug Mode

Enable debug logging:

```typescript
// Add to your app
window.VibikitDebug = true;
```

## Security Considerations

1. **API Endpoints**: Ensure agent endpoints are properly secured
2. **Wallet Integration**: Use secure WalletConnect project IDs
3. **CORS**: Configure appropriate CORS policies for cross-origin requests
4. **Rate Limiting**: Implement rate limiting on chat endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please create an issue in the repository or contact the development team. 