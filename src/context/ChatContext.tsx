import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { getConversations, getMessages } from '@/services/api';
import { initNotifications, playMessageChime } from '@/services/notifications';

type UnreadMap = Record<string, number>;

interface ChatContextValue {
  unreadByConversation: UnreadMap;
  totalUnread: number;
  setActiveConversation: (conversationId: string | null) => void;
  markConversationRead: (conversationId: string) => void;
  notifyIncomingMessage: (
    conversationId: string,
    opts?: { title?: string; body?: string },
  ) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const POLL_INTERVAL_MS = 6000;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [unreadByConversation, setUnreadByConversation] = useState<UnreadMap>({});
  const unreadRef = useRef<UnreadMap>({});
  const lastLastAtByConv = useRef<Record<string, string | undefined>>({});
  const activeConvRef = useRef<string | null>(null);

  const totalUnread = useMemo(
    () => Object.values(unreadByConversation).reduce((sum, count) => sum + count, 0),
    [unreadByConversation],
  );

  useEffect(() => {
    initNotifications();
  }, []);

  useEffect(() => {
    const myEmail = user?.email;

    const runPoll = async () => {
      if (!myEmail) return;

      let conversations;
      try {
        conversations = await getConversations();
      } catch {
        return;
      }

      for (const conversation of conversations) {
        if (lastLastAtByConv.current[conversation.id] === conversation.last_at) {
          continue;
        }
        lastLastAtByConv.current[conversation.id] = conversation.last_at;

        let messages;
        try {
          messages = await getMessages(conversation.id);
        } catch {
          continue;
        }

        const unread = messages.filter(
          (m) =>
            m.sender_email &&
            m.sender_email.toLowerCase() !== myEmail.toLowerCase() &&
            !m.read,
        ).length;

        const previous = unreadRef.current[conversation.id] ?? 0;
        if (unread === previous) continue;

        unreadRef.current[conversation.id] = unread;
        setUnreadByConversation((prev) => ({ ...prev, [conversation.id]: unread }));

        if (unread > previous && conversation.id !== activeConvRef.current) {
          const senderName = conversation.last_sender
            ? conversation.last_sender.split('@')[0]
            : 'Someone';
          playMessageChime(
            'New Message',
            `New message from ${senderName}${
              conversation.last_message
                ? `: ${conversation.last_message.slice(0, 60)}`
                : ''
            }`,
          );
        }
      }
    };

    runPoll();
    const interval = setInterval(runPoll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.email]);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConvRef.current = conversationId;
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    unreadRef.current[conversationId] = 0;
    setUnreadByConversation((prev) => {
      if (!(conversationId in prev)) return prev;
      return { ...prev, [conversationId]: 0 };
    });
  }, []);

  const notifyIncomingMessage = useCallback(
    (conversationId: string, opts?: { title?: string; body?: string }) => {
      const next = (unreadRef.current[conversationId] ?? 0) + 1;
      unreadRef.current[conversationId] = next;
      setUnreadByConversation((prev) => ({
        ...prev,
        [conversationId]: next,
      }));
      playMessageChime(opts?.title, opts?.body);
    },
    [],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      unreadByConversation,
      totalUnread,
      setActiveConversation,
      markConversationRead,
      notifyIncomingMessage,
    }),
    [unreadByConversation, totalUnread, setActiveConversation, markConversationRead, notifyIncomingMessage],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}