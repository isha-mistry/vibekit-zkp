/**
 * Vibekit AI Chatbot - Standalone Embedding Script
 * This script allows embedding the Vibekit AI chatbot on any website
 */

(function(window, document) {
  'use strict';

  // Configuration
  const CHATBOT_CONFIG = {
    version: '1.0.0',
    containerId: 'vibekit-chatbot-container',
    apiEndpoint: 'http://localhost:3000', // Change this to your hosted domain
    position: 'bottom-right',
    primaryColor: '#0ea5e9',
    borderRadius: '12px',
    zIndex: 9999,
    enabledAgents: ['ember-aave', 'ember-camelot', 'ember-counter']
  };

  // Prevent multiple initialization
  if (window.VibikitChatbot) {
    console.warn('Vibekit Chatbot already initialized');
    return;
  }

  // Create chatbot object
  window.VibikitChatbot = {
    version: CHATBOT_CONFIG.version,
    initialized: false,
    container: null,
    isOpen: false,
    
    init: function(config = {}) {
      if (this.initialized) {
        console.warn('Vibekit Chatbot already initialized');
        return;
      }

      // Merge config
      const finalConfig = Object.assign({}, CHATBOT_CONFIG, config);
      
      // Create container
      this.container = this.createContainer(finalConfig);
      document.body.appendChild(this.container);
      
      // Load styles
      this.loadStyles();
      
      this.initialized = true;
      console.log('Vibekit Chatbot initialized');
    },

    createContainer: function(config) {
      const container = document.createElement('div');
      container.id = config.containerId;
      container.style.cssText = `
        position: fixed;
        ${this.getPositionStyles(config.position)}
        z-index: ${config.zIndex};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      // Create toggle button
      const toggleButton = this.createToggleButton(config);
      container.appendChild(toggleButton);
      
      return container;
    },

    createToggleButton: function(config) {
      const button = document.createElement('button');
      button.style.cssText = `
        background-color: ${config.primaryColor};
        border: none;
        border-radius: ${config.borderRadius};
        width: 60px;
        height: 60px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      `;
      
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 12H16M8 8H16M8 16H13M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V4H20C20.5523 4 21 4.44772 21 5V15C21 15.5523 20.5523 16 20 16H17V18C17 18.5523 16.5523 19 16 19H4L7 16V4Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div style="position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
      `;
      
      button.addEventListener('click', () => this.toggleChat(config));
      
      return button;
    },

    createChatWindow: function(config) {
      const chatWindow = document.createElement('div');
      chatWindow.style.cssText = `
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 380px;
        height: 600px;
        background: white;
        border-radius: ${config.borderRadius};
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: none;
        flex-direction: column;
        border: 1px solid #e5e7eb;
      `;
      
      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        background-color: ${config.primaryColor};
        color: white;
        padding: 16px;
        border-radius: ${config.borderRadius} ${config.borderRadius} 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      header.innerHTML = `
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Vibekit AI</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">DeFi Assistant</p>
        </div>
        <button id="vibekit-close-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">&times;</button>
      `;
      
      // Messages area
      const messagesArea = document.createElement('div');
      messagesArea.style.cssText = `
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background-color: #f9fafb;
      `;
      
      // Welcome message
      messagesArea.innerHTML = `
        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: start; gap: 12px;">
            <div style="background-color: ${config.primaryColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">AI</div>
            <div>
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">Welcome to Vibekit AI! 👋</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">I can help you with DeFi operations like lending, trading, and more. Connect your wallet to get started!</p>
            </div>
          </div>
        </div>
        
        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h4 style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">Available Agents:</h4>
          <div style="display: grid; gap: 8px;">
            <div style="padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-weight: 500; font-size: 14px; color: #1f2937;">Lending</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">AAVE lending operations</div>
            </div>
            <div style="padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-weight: 500; font-size: 14px; color: #1f2937;">Trading</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Camelot DEX trading</div>
            </div>
            <div style="padding: 12px; background: #f3f4f6; border-radius: 6px;">
              <div style="font-weight: 500; font-size: 14px; color: #1f2937;">Counter</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Smart contract interactions</div>
            </div>
          </div>
        </div>
      `;
      
      // Input area
      const inputArea = document.createElement('div');
      inputArea.style.cssText = `
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
      `;
      
      inputArea.innerHTML = `
        <input 
          type="text" 
          placeholder="Ask me anything about DeFi..."
          style="flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; outline: none; font-size: 14px;"
        />
        <button 
          style="background-color: ${config.primaryColor}; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px;"
        >Send</button>
      `;
      
      chatWindow.appendChild(header);
      chatWindow.appendChild(messagesArea);
      chatWindow.appendChild(inputArea);
      
      // Close button functionality
      header.querySelector('#vibekit-close-btn').addEventListener('click', () => {
        this.closeChat();
      });
      
      return chatWindow;
    },

    toggleChat: function(config) {
      if (!this.chatWindow) {
        this.chatWindow = this.createChatWindow(config);
        this.container.appendChild(this.chatWindow);
      }
      
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    },

    openChat: function() {
      if (this.chatWindow) {
        this.chatWindow.style.display = 'flex';
        this.isOpen = true;
      }
    },

    closeChat: function() {
      if (this.chatWindow) {
        this.chatWindow.style.display = 'none';
        this.isOpen = false;
      }
    },

    getPositionStyles: function(position) {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;'
      };
      return positions[position] || positions['bottom-right'];
    },

    loadStyles: function() {
      if (document.getElementById('vibekit-chatbot-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'vibekit-chatbot-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        #${CHATBOT_CONFIG.containerId} button:hover {
          transform: scale(1.05);
        }
        
        #${CHATBOT_CONFIG.containerId} input:focus {
          border-color: ${CHATBOT_CONFIG.primaryColor};
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Auto-initialize if config is provided
  if (window.VibikitChatbotConfig) {
    document.addEventListener('DOMContentLoaded', function() {
      window.VibikitChatbot.init(window.VibikitChatbotConfig);
    });
  }

  // Expose init method globally for manual initialization
  window.initVibikitChatbot = function(config) {
    window.VibikitChatbot.init(config);
  };

})(window, document); 