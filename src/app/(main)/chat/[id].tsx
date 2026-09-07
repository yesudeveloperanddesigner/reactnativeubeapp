import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  Accent,
  BorderRadius,
  FontSize,
  Spacing,
  Status,
  Surface,
  TextColor,
} from '@/constants/theme';
import {
  getConversations,
  getMessages,
  markConversationRead as markConversationReadOnServer,
  Message,
  sendMessage,
} from '@/services/api';
import { playMessageChime } from '@/services/notifications';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { setActiveConversation, markConversationRead } = useChat();

  const [messages, setMessages] = useState<Message[]>([]);
  const [recipientEmail, setRecipientEmail] = useState<string>('Chat');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const conversationId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    setActiveConversation(conversationId ?? null);
    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation]);

  const fetchMessagesAndInfo = async (silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoading(true);

    try {
      // Mark read and fetch messages
      markConversationReadOnServer(conversationId)
        .catch(() => {})
        .then(() => markConversationRead(conversationId));

      const [fetchedMessages, conversationsList] = await Promise.all([
        getMessages(conversationId),
        getConversations().catch(() => []),
      ]);

      const fetched = fetchedMessages || [];

      if (hasLoadedOnceRef.current) {
        const previousLatestId = lastSeenMessageIdRef.current;
        const latest = fetched[fetched.length - 1];
        if (
          latest &&
          previousLatestId &&
          latest.id !== previousLatestId &&
          latest.sender_email.toLowerCase() !== user?.email?.toLowerCase()
        ) {
          const senderName = latest.sender_email.split('@')[0];
          playMessageChime(
            'New Message',
            `New message from ${senderName}: ${latest.content.slice(0, 60)}`,
          );
        }
      }
      lastSeenMessageIdRef.current = fetched[fetched.length - 1]?.id ?? null;
      hasLoadedOnceRef.current = true;

      setMessages(fetched);

      // Find recipient email from conversation details
      const currentConv = conversationsList.find((c) => c.id === conversationId);
      if (currentConv) {
        const other = currentConv.participants.find(
          (p) => p.toLowerCase() !== user?.email?.toLowerCase()
        );
        if (other) setRecipientEmail(other);
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      if (!silent) setErrorMsg(err?.message || 'Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => fetchMessagesAndInfo(false), 0);

    // Poll for new messages every 4 seconds
    const interval = setInterval(() => {
      fetchMessagesAndInfo(true);
    }, 4000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [conversationId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !conversationId || sending) return;

    setInputText('');
    setSending(true);

    try {
      const newMsg = await sendMessage(conversationId, text);
      setMessages((prev) => [...prev, newMsg]);
      lastSeenMessageIdRef.current = newMsg.id;
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Restore input text on error
      setInputText(text);
      setErrorMsg(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_email.toLowerCase() === user?.email?.toLowerCase();

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isMe && (
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>
              {item.sender_email.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={TextColor.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {recipientEmail}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Accent.primary} />
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : errorMsg && messages.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={Status.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMessagesAndInfo(false)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            inverted
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={48}
                  color={Accent.primary}
                />
                <Text style={styles.emptyMessagesTitle}>Say Hello!</Text>
                <Text style={styles.emptyMessagesSubtitle}>
                  This is the start of your 1-on-1 conversation with {recipientEmail}.
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={TextColor.tertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <LinearGradient
                colors={
                  !inputText.trim()
                    ? ['#3A3F58', '#2D3248']
                    : Accent.gradient
                }
                style={styles.sendGradient}
              >
                <Ionicons name="send" size={18} color="#FFF" />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Surface.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Surface.cardBorder,
  },
  backButton: {
    padding: Spacing.one,
    marginRight: Spacing.two,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Accent.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.one,
  },
  avatarMiniText: {
    color: '#FFF',
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.lg,
  },
  myBubble: {
    backgroundColor: Accent.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: Surface.card,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  messageText: {
    color: TextColor.primary,
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimeText: {
    color: TextColor.tertiary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  loadingText: {
    color: TextColor.secondary,
    marginTop: Spacing.two,
  },
  errorText: {
    color: Status.error,
    fontSize: FontSize.body,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  retryBtn: {
    backgroundColor: Surface.card,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Accent.primary,
  },
  retryBtnText: {
    color: Accent.primary,
    fontWeight: '600',
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  emptyMessagesTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  emptyMessagesSubtitle: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Surface.card,
    borderTopWidth: 1,
    borderTopColor: Surface.cardBorder,
  },
  textInput: {
    flex: 1,
    backgroundColor: Surface.input,
    color: TextColor.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: FontSize.body,
    maxHeight: 100,
    marginRight: Spacing.two,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
