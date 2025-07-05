'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrum, mainnet } from 'wagmi/chains';
import { ChatbotWidget } from './ChatbotWidget';
import '@rainbow-me/rainbowkit/styles.css';

interface ChatbotProviderProps {
  projectId?: string;
  appName?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  borderRadius?: string;
  zIndex?: number;
  enabledAgents?: string[];
  wagmiConfig?: any;
}

// Default Wagmi config for the chatbot
const createDefaultWagmiConfig = (projectId: string, appName: string) => {
  return getDefaultConfig({
    appName,
    projectId,
    chains: [arbitrum, mainnet],
    ssr: false, // Important for embedding in other sites
  });
};

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function ChatbotProvider({
  projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1234567890abcdef',
  appName = 'Vibekit AI Chatbot',
  position = 'bottom-right',
  primaryColor = '#0ea5e9',
  borderRadius = '12px',
  zIndex = 9999,
  enabledAgents = ['ember-aave', 'ember-camelot', 'ember-counter'],
  wagmiConfig,
}: ChatbotProviderProps) {
  // Use provided wagmi config or create default
  const config = wagmiConfig || createDefaultWagmiConfig(projectId, appName);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ChatbotWidget
            position={position}
            primaryColor={primaryColor}
            borderRadius={borderRadius}
            zIndex={zIndex}
            enabledAgents={enabledAgents}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Standalone script injection version for external websites
export function createChatbotScript({
  containerId = 'vibekit-chatbot',
  ...props
}: ChatbotProviderProps & { containerId?: string }) {
  return `
    (function() {
      // Check if already loaded
      if (window.VibikitChatbot) return;
      
      // Create container
      const container = document.createElement('div');
      container.id = '${containerId}';
      document.body.appendChild(container);
      
      // Load React and dependencies if not present
      if (!window.React) {
        const reactScript = document.createElement('script');
        reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
        document.head.appendChild(reactScript);
        
        const reactDomScript = document.createElement('script');
        reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        document.head.appendChild(reactDomScript);
      }
      
      // Load CSS
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/tailwindcss@3/dist/tailwind.min.css';
      document.head.appendChild(css);
      
      // Mark as loaded
      window.VibikitChatbot = true;
      
      // Initialize chatbot when dependencies are ready
      function initializeChatbot() {
        if (window.React && window.ReactDOM) {
          // Your chatbot initialization code here
          console.log('Vibekit Chatbot initialized');
        } else {
          setTimeout(initializeChatbot, 100);
        }
      }
      
      initializeChatbot();
    })();
  `;
} 