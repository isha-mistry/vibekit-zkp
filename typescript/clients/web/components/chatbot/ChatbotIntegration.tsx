'use client';

import React from 'react';
import { ChatbotWidget } from './ChatbotWidget';
import { getActiveAgents } from './index';

interface ChatbotIntegrationProps {
  /** Whether to show the chatbot on this page */
  enabled?: boolean;
  /** Custom position for the chatbot */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Custom styling */
  primaryColor?: string;
  /** Custom border radius */
  borderRadius?: string;
  /** Custom z-index */
  zIndex?: number;
}

/**
 * ChatbotIntegration component for adding the chatbot to existing Vibekit pages
 * This component is designed to be non-intrusive and doesn't require providers
 * since it assumes the parent app already has wagmi/rainbowkit set up
 */
export function ChatbotIntegration({
  enabled = true,
  position = 'bottom-right',
  primaryColor = '#0ea5e9',
  borderRadius = '12px',
  zIndex = 9999,
}: ChatbotIntegrationProps) {
  // Don't render if disabled
  if (!enabled) return null;

  // Get currently active agents based on environment
  const activeAgents = getActiveAgents();

  return (
    <ChatbotWidget
      position={position}
      primaryColor={primaryColor}
      borderRadius={borderRadius}
      zIndex={zIndex}
      enabledAgents={activeAgents}
    />
  );
}

/**
 * Hook to dynamically enable/disable chatbot based on conditions
 */
export function useChatbotVisibility() {
  const [isVisible, setIsVisible] = React.useState(() => {
    // Check if user has dismissed the chatbot
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibekit-chatbot-hidden') !== 'true';
    }
    return true;
  });

  const hideChatbot = React.useCallback(() => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibekit-chatbot-hidden', 'true');
    }
  }, []);

  const showChatbot = React.useCallback(() => {
    setIsVisible(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vibekit-chatbot-hidden');
    }
  }, []);

  return {
    isVisible,
    hideChatbot,
    showChatbot,
  };
} 