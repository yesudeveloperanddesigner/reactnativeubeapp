import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
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
  Conversation,
  getConversations,
  startConversation,
} from '@/services/api';

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Chat Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchConversations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getConversations();
      setConversations(data || []);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setErrorMsg(err?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations(false);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(false);
  };

  const handleStartChat = async () => {
    const trimmed = recipientEmail.trim();
    if (!trimmed) {
      setModalError('Please enter a recipient email.');
      return;
    }
    if (trimmed.toLowerCase() === user?.email?.toLowerCase()) {
      setModalError('You cannot start a chat with yourself.');
      return;
    }

    setStartingChat(true);
    setModalError(null);
    try {
      const conv = await startConversation(trimmed);
      setModalVisible(false);
      setRecipientEmail('');
      router.push(`/(main)/chat/${conv.id}`);
    } catch (err: any) {
      console.error('Start chat error:', err);
      setModalError(err?.message || 'Failed to start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const recipient = c.participants.find(
      (p) => p.toLowerCase() !== user?.email?.toLowerCase()
    );
    const searchLower = searchQuery.toLowerCase();
    return (
      (recipient && recipient.toLowerCase().includes(searchLower)) ||
      (c.last_message && c.last_message.toLowerCase().includes(searchLower))
    );
  });

  const getRecipientEmail = (participants: string[]) => {
    return (
      participants.find(
        (p) => p.toLowerCase() !== user?.email?.toLowerCase()
      ) || participants[0] || 'Unknown User'
    );
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const recipient = getRecipientEmail(item.participants);
    const initials = recipient.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => router.push(`/(main)/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#6C63FF', '#8B5CF6']}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {recipient}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.last_at)}</Text>
          </View>
          <View style={styles.lastMsgRow}>
            <Text style={styles.lastMsgText} numberOfLines={1}>
              {item.last_message
                ? `${item.last_sender === user?.email ? 'You: ' : ''}${item.last_message}`
                : 'No messages yet'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={TextColor.tertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={TextColor.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => {
            setModalError(null);
            setModalVisible(true);
          }}
          style={styles.headerButton}
        >
          <Ionicons name="create-outline" size={26} color={Accent.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={TextColor.tertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or message..."
          placeholderTextColor={TextColor.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={TextColor.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List / Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Accent.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Status.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchConversations()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={
            filteredConversations.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Accent.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color={TextColor.tertiary}
              />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No messages match your search criteria.'
                  : 'Start a new chat with another user using their email address.'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() => setModalVisible(true)}
                >
                  <LinearGradient
                    colors={Accent.buttonGradient}
                    style={styles.gradientBtn}
                  >
                    <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.startBtnText}>New Message</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* New Conversation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Conversation</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={TextColor.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Recipient Email</Text>
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor={TextColor.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={recipientEmail}
              onChangeText={(text) => {
                setRecipientEmail(text);
                setModalError(null);
              }}
            />

            {modalError && (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={Status.error} />
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleStartChat}
              disabled={startingChat}
            >
              <LinearGradient
                colors={Accent.buttonGradient}
                style={styles.gradientBtn}
              >
                {startingChat ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Start Chat</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: TextColor.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.input,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    color: TextColor.primary,
    fontSize: FontSize.body,
  },
  listContainer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  avatarText: {
    color: '#FFF',
    fontSize: FontSize.subtitle,
    fontWeight: '700',
  },
  convInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: TextColor.primary,
    flex: 1,
    marginRight: Spacing.two,
  },
  timeText: {
    fontSize: FontSize.small,
    color: TextColor.tertiary,
  },
  lastMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMsgText: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    flex: 1,
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
    fontSize: FontSize.body,
  },
  errorText: {
    color: Status.error,
    fontSize: FontSize.body,
    textAlign: 'center',
    marginTop: Spacing.two,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  emptyTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  emptySubtitle: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  startBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.lg,
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: FontSize.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    backgroundColor: Surface.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: TextColor.primary,
  },
  inputLabel: {
    fontSize: FontSize.caption,
    color: TextColor.secondary,
    marginBottom: Spacing.one,
  },
  input: {
    backgroundColor: Surface.input,
    color: TextColor.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.three,
    height: 48,
    fontSize: FontSize.body,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Surface.cardBorder,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Status.errorBg,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  modalErrorText: {
    color: Status.error,
    fontSize: FontSize.caption,
    marginLeft: Spacing.one,
    flex: 1,
  },
  submitBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
