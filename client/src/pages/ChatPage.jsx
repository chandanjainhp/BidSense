import React, { useState, useEffect, useCallback } from 'react';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import chatService from '../services/chatService';

const WELCOME_MESSAGE = "Hello! I'm BidSense AI. I can help you draft RFPs, analyze vendor proposals, or identify risks. How can I assist you today?";

const ChatPage = () => {
  // --- State Management ---
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Load conversations from the backend on mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await chatService.getConversations();
        const mapped = response.data.map(c => ({
          id: c.id,
          title: c.title || 'New Conversation',
          time: fmtTime(c.updated_at),
          messages: [],
        }));
        setChats(mapped);
        if (mapped.length > 0) {
          setActiveChatId(mapped[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setInitialLoadDone(true);
      }
    };
    loadChats();
  }, []);

  // Load messages whenever the active chat changes
  useEffect(() => {
    if (!activeChatId) return;
    const loadMessages = async () => {
      try {
        const response = await chatService.getMessages(activeChatId);
        const mapped = response.data.map(m => ({
          id: m.id,
          role: m.role === 'ai' ? 'ai' : 'user',
          content: m.content,
          time: fmtTime(m.created_at),
        }));
        setChats(prev => prev.map(c =>
          c.id === activeChatId ? { ...c, messages: mapped } : c
        ));
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();
  }, [activeChatId]);

  // Derived state: Current active chat
  const activeChat = chats.find(c => c.id === activeChatId) || { messages: [] };

  // --- Actions ---

  const handleNewChat = useCallback(async () => {
    try {
      const response = await chatService.createConversation('New Conversation');
      const newChat = {
        id: response.data.id,
        title: response.data.title || 'New Conversation',
        time: fmtTime(response.data.updated_at),
        messages: [
          { id: 'welcome', role: 'ai', content: WELCOME_MESSAGE, time: fmtTime(response.data.updated_at) }
        ],
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      if (window.innerWidth < 768) {
        setIsHistoryOpen(false);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, []);

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation(); // Prevent triggering selection
    try {
      await chatService.deleteConversation(chatId);
      const updatedChats = chats.filter(c => c.id !== chatId);
      setChats(updatedChats);
      if (chatId === activeChatId) {
        setActiveChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (text) => {
    if (!activeChatId || isSending) return;
    setIsSending(true);

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = { id: `local-${Date.now()}`, role: 'user', content: text, time: now };

    // Optimistically show the user's message; if it's the first, also title the chat
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === activeChatId) {
        const isFirstUserMessage = chat.messages.length === 0 ||
          (chat.messages.length === 1 && chat.messages[0].role === 'ai' && chat.messages[0].id === 'welcome');
        const updatedTitle = isFirstUserMessage ? (text.slice(0, 30) + (text.length > 30 ? '...' : '')) : chat.title;
        return { ...chat, title: updatedTitle, messages: [...chat.messages, userMessage] };
      }
      return chat;
    }));

    try {
      // Backend persists the user message, generates the AI reply, and returns it
      const response = await chatService.sendMessage(activeChatId, text);
      const aiMessage = {
        id: response.data.id,
        role: 'ai',
        content: response.data.content,
        time: fmtTime(response.data.created_at),
      };
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === activeChatId) {
          return { ...chat, messages: [...chat.messages, aiMessage] };
        }
        return chat;
      }));
    } catch (err) {
      console.error('Failed to send message:', err);
      const errMessage = {
        id: `err-${Date.now()}`,
        role: 'ai',
        content: 'Sorry, I could not process that. Please check your connection and try again.',
        time: now,
      };
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === activeChatId) {
          return { ...chat, messages: [...chat.messages, errMessage] };
        }
        return chat;
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearContext = () => {
    // Clear messages of current chat but keep the chat item
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === activeChatId) {
        return {
          ...chat,
          messages: [
            { id: 'welcome', role: 'ai', content: "Context cleared. How can I help you next?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]
        };
      }
      return chat;
    }));
  };

  // If no chats exist after initial load, create one
  useEffect(() => {
    const ensureChat = async () => {
      if (initialLoadDone && chats.length === 0) {
        await handleNewChat();
      }
    };
    ensureChat();
  }, [initialLoadDone, chats.length, handleNewChat]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-black font-sans overflow-hidden transition-colors duration-300">

      {/* --- Inner Sidebar: Chat History --- */}
      <ChatSidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* --- Main Chat Panel --- */}
      <main className="flex-1 flex flex-col relative bg-white dark:bg-black transition-colors duration-300">

        {/* Chat Toolbar */}
        <ChatHeader
          isSidebarOpen={isHistoryOpen}
          onToggleSidebar={() => setIsHistoryOpen(!isHistoryOpen)}
          title={activeChat.title || 'New Chat'}
          onClearContext={handleClearContext}
        />

        {/* Conversation Area */}
        <MessageList messages={activeChat.messages} />

        {/* Input Area */}
        <ChatInput onSendMessage={handleSendMessage} />

      </main>
    </div>
  );
};

export default ChatPage;
