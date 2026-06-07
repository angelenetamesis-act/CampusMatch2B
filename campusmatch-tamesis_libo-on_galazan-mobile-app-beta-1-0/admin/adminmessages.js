import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getRelativeTime = (ts) => {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

export default function AdminMessagesScreen({ adminUser }) {
  const [threads, setThreads]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [reply, setReply]           = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow]               = useState(Date.now());
  const flatRef                     = useRef(null);

  // Load all approach threads from AsyncStorage
  const loadThreads = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const parsed = raw ? JSON.parse(raw) : [];

      // Deduplicate and filter out threads with no messages
      const seen = {};
      const deduped = [];
      
      // Sort by latest message timestamp descending before processing
      const presorted = [...parsed].sort((a, b) => {
        const aLast = a.messages?.slice(-1)[0]?.timestamp || a.id || 0;
        const bLast = b.messages?.slice(-1)[0]?.timestamp || b.id || 0;
        return bLast - aLast;
      });

      presorted.forEach(t => {
        // CONSTRAINT: Only keep threads that have messages
        if (t.messages && t.messages.length > 0) {
          const key = `${t.email}__${t.adminEmail || ""}`;
          if (!seen[key]) {
            seen[key] = true;
            deduped.push(t);
          }
        }
      });

      // Sort: unread first, then by latest message timestamp
      deduped.sort((a, b) => {
        const aUnread = a.messages?.some(m => m.sender !== "admin" && !m.read) ? 1 : 0;
        const bUnread = b.messages?.some(m => m.sender !== "admin" && !m.read) ? 1 : 0;
        if (bUnread !== aUnread) return bUnread - aUnread;
        const aLast = a.messages?.slice(-1)[0]?.timestamp || 0;
        const bLast = b.messages?.slice(-1)[0]?.timestamp || 0;
        return bLast - aLast;
      });

      setThreads(deduped);
      // Refresh selected thread if open
      if (selected) {
        const updated = deduped.find(t => t.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) { console.error(e); }
  }, [selected?.id]);

  useEffect(() => {
    loadThreads();
    const t = setInterval(() => { setNow(Date.now()); loadThreads(); }, 4000);
    return () => clearInterval(t);
  }, [loadThreads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  };

  // Mark all student messages in a thread as read
  const markAsRead = async (threadId) => {
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.map(t => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map(m =>
            m.sender !== "admin" ? { ...m, read: true } : m
          )
        };
      });
      await AsyncStorage.setItem("@admin_approaches", JSON.stringify(updated));
      setThreads(prev => prev.map(t => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map(m =>
            m.sender !== "admin" ? { ...m, read: true } : m
          )
        };
      }));
      const updatedThread = updated.find(t => t.id === threadId);
      if (updatedThread) setSelected(updatedThread);
    } catch (e) { console.error(e); }
  };

  const openThread = async (thread) => {
    setSelected(thread);
    await markAsRead(thread.id);
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selected) return;
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const newMsg = {
        id: Date.now().toString(),
        sender: "admin",
        senderName: "Admin",
        content: reply.trim(),
        timestamp: Date.now(),
        read: true
      };
      const updated = all.map(t => {
        if (t.id !== selected.id) return t;
        return { ...t, messages: [...(t.messages || []), newMsg] };
      });
      await AsyncStorage.setItem("@admin_approaches", JSON.stringify(updated));
      setReply("");
      const updatedThread = updated.find(t => t.id === selected.id);
      setSelected(updatedThread);
      setThreads(prev => prev.map(t => t.id === selected.id ? updatedThread : t));
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { console.error(e); }
  };

  const getUnreadCount = (thread) =>
    thread.messages?.filter(m => m.sender !== "admin" && !m.read).length || 0;

  const getLastMessage = (thread) => {
    const msgs = thread.messages || [];
    if (!msgs.length) return "No messages yet.";
    return msgs[msgs.length - 1].content;
  };

  const renderThread = ({ item }) => {
    const unread = getUnreadCount(item);
    const lastMsg = getLastMessage(item);
    const lastTs = item.messages?.slice(-1)[0]?.timestamp;
    return (
      <TouchableOpacity
        style={[styles.threadCard, unread > 0 && styles.threadCardUnread]}
        onPress={() => openThread(item)}
        activeOpacity={0.85}
      >
        <View style={styles.threadLeft}>
          <View style={styles.threadAvatar}>
            <Text style={{ fontSize: 22 }}>{item.userAvatar || "👤"}</Text>
          </View>
          {unread > 0 && (
            <View style={styles.unreadDot}>
              <Text style={styles.unreadDotText}>{unread}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.threadTopRow}>
            <Text style={styles.threadName}>{item.anonName || "Anonymous"}</Text>
            <Text style={styles.threadTime}>{getRelativeTime(lastTs)}</Text>
          </View>
          <Text style={styles.threadSubtitle} numberOfLines={1}>{lastMsg}</Text>
          <Text style={styles.threadRealName}>{item.email || ""}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FF" }}>

      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>💬</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Student Approaches</Text>
          <Text style={styles.headerSubtitle}>
            {threads.length} thread{threads.length !== 1 ? "s" : ""} ·{" "}
            {threads.filter(t => getUnreadCount(t) > 0).length} unread
          </Text>
        </View>
      </View>

      <FlatList
        data={threads}
        renderItem={renderThread}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Approaches Yet</Text>
            <Text style={styles.emptySubtitle}>
              Students who contact admin will appear here.
            </Text>
          </View>
        }
      />

      {/* CHAT MODAL — floating, not slide */}
      <Modal visible={!!selected} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatOverlay}
        >
          <View style={styles.chatFloating}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatAvatar}>
                <Text style={{ fontSize: 26 }}>{selected?.userAvatar || "👤"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatName}>{selected?.anonName || "Anonymous"}</Text>
                <Text style={styles.chatEmail}>{selected?.email || ""}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatRef}
              data={selected?.messages || []}
              keyExtractor={m => m.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyText}>No messages yet.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isAdmin = item.sender === "admin";
                return (
                  <View style={[styles.bubbleRow, isAdmin && styles.bubbleRowRight]}>
                    {!isAdmin && (
                      <View style={styles.bubbleAvatar}>
                        <Text style={{ fontSize: 14 }}>{selected?.userAvatar || "👤"}</Text>
                      </View>
                    )}
                    <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleStudent]}>
                      <Text style={[styles.bubbleText, isAdmin && styles.bubbleTextAdmin]}>
                        {item.content}
                      </Text>
                      <Text style={[styles.bubbleTime, isAdmin && { color: "rgba(255,255,255,0.6)" }]}>
                        {getRelativeTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            {/* Reply Input */}
            <View style={styles.replyBar}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type a reply..."
                placeholderTextColor="#94a3b8"
                value={reply}
                onChangeText={setReply}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !reply.trim() && { opacity: 0.5 }]}
                onPress={handleSendReply}
                disabled={!reply.trim()}
              >
                <Text style={styles.sendBtnText}>SEND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 16, borderBottomWidth: 2.5, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 2, gap: 12
  },
  headerBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#000",
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFD700"
  },
  headerBadgeText: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#000" },
  headerSubtitle: { fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 2 },
  threadCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 2
  },
  threadCardUnread: {
    borderColor: "#8B5CF6", backgroundColor: "#FAFAFF",
    shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.2
  },
  threadLeft: { position: "relative" },
  threadAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#000"
  },
  unreadDot: {
    position: "absolute", top: -4, right: -4, backgroundColor: "#8B5CF6",
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center",
    alignItems: "center", borderWidth: 2, borderColor: "#fff", paddingHorizontal: 3
  },
  unreadDotText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  threadTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  threadName: { fontWeight: "900", color: "#000", fontSize: 14 },
  threadTime: { fontSize: 10, color: "#94a3b8", fontWeight: "700" },
  threadSubtitle: { fontSize: 12, color: "#64748B", fontWeight: "600", marginBottom: 2 },
  threadRealName: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  chevron: { fontSize: 22, color: "#CBD5E1" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#000", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#64748B", fontWeight: "600", textAlign: "center" },
  // ── Floating Chat Modal ──
  chatOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center"
  },
  chatFloating: {
    backgroundColor: "#F5F7FF", width: "92%", height: "82%",
    borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10
  },
  chatHeader: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 16, borderBottomWidth: 2.5, borderColor: "#000", gap: 12
  },
  chatAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", borderWidth: 2.5, borderColor: "#000"
  },
  chatName: { fontWeight: "900", color: "#000", fontSize: 15 },
  chatEmail: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  closeBtn: {
    backgroundColor: "#F1F5F9", padding: 8, borderRadius: 10,
    borderWidth: 2, borderColor: "#000"
  },
  closeBtnText: { fontWeight: "900", color: "#000", fontSize: 14 },
  chatEmpty: { alignItems: "center", marginTop: 40 },
  chatEmptyText: { color: "#94a3b8", fontWeight: "700" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center", marginRight: 8,
    borderWidth: 2, borderColor: "#000"
  },
  bubble: {
    maxWidth: "72%", borderRadius: 18, padding: 12,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2
  },
  bubbleStudent: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleAdmin: {
    backgroundColor: "#000", borderBottomRightRadius: 4,
    shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1
  },
  bubbleText: { fontSize: 14, color: "#000", fontWeight: "600", lineHeight: 20 },
  bubbleTextAdmin: { color: "#FFD700", fontWeight: "700" },
  bubbleTime: { fontSize: 10, color: "#94a3b8", marginTop: 4, fontWeight: "600" },
  replyBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 12, borderTopWidth: 2.5, borderColor: "#000", gap: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 12
  },
  replyInput: {
    flex: 1, backgroundColor: "#F8FAFC", borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, fontWeight: "700", maxHeight: 80,
    borderWidth: 2, borderColor: "#000", color: "#000"
  },
  sendBtn: {
    backgroundColor: "#FFD700", paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14, borderWidth: 2.5, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  sendBtnText: { fontWeight: "900", color: "#000", fontSize: 13 },
});