import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal,
  Platform, KeyboardAvoidingView, ScrollView, FlatList,
  TextInput, Animated, Easing
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const Access = ({ user, userAvatar }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);

  const [showApproachModal, setShowApproachModal] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [approachMode, setApproachMode] = useState("list");
  const [showApproachChat, setShowApproachChat] = useState(false);
  const [approachMessage, setApproachMessage] = useState("");
  const [approachThread, setApproachThread] = useState(null);
  const [allApproachThreads, setAllApproachThreads] = useState([]);
  const [hasUnreadApproach, setHasUnreadApproach] = useState(false);
  const approachFlatRef = useRef(null);

  const [fabOpen, setFabOpen] = useState(false);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const annScale = useRef(new Animated.Value(0)).current;
  const adminScale = useRef(new Animated.Value(0)).current;
  const annTranslateY = useRef(new Animated.Value(0)).current;
  const adminTranslateY = useRef(new Animated.Value(0)).current;
  const annOpacity = useRef(new Animated.Value(0)).current;
  const adminOpacity = useRef(new Animated.Value(0)).current;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleFab = () => {
    if (fabOpen) {
      Animated.parallel([
        Animated.timing(fabRotate, { toValue: 0, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(annScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(adminScale, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(annTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(adminTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(annOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(adminOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => setFabOpen(false));
    } else {
      setFabOpen(true);
      Animated.parallel([
        Animated.timing(fabRotate, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.spring(annScale, { toValue: 1, delay: 80, useNativeDriver: true, tension: 120, friction: 6 }),
        Animated.spring(adminScale, { toValue: 1, delay: 160, useNativeDriver: true, tension: 120, friction: 6 }),
        Animated.spring(annTranslateY, { toValue: -1, delay: 80, useNativeDriver: true }),
        Animated.spring(adminTranslateY, { toValue: -1, delay: 160, useNativeDriver: true }),
        Animated.timing(annOpacity, { toValue: 1, duration: 200, delay: 80, useNativeDriver: true }),
        Animated.timing(adminOpacity, { toValue: 1, duration: 200, delay: 160, useNativeDriver: true }),
      ]).start();
    }
  };

  const closeFab = () => {
    if (!fabOpen) return;
    Animated.parallel([
      Animated.timing(fabRotate, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(annScale, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(adminScale, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(annTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(adminTranslateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(annOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(adminOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setFabOpen(false));
  };

  const spinInterpolate = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@admin_announcements");
      const parsed = raw ? JSON.parse(raw) : [];
      setAnnouncements(parsed);
      if (parsed.length > 0) {
        const latestId = parsed[0].id;
        const seenRaw = await AsyncStorage.getItem("@last_seen_announcement_" + (user?.email || ""));
        setHasNewAnnouncement(seenRaw !== latestId);
      } else {
        setHasNewAnnouncement(false);
      }
    } catch (e) { console.error(e); }
  }, [user?.email]);

  const fetchAdmins = useCallback(async () => {
    try {
      // Fetching directly from the source used by AdminAuthController
      const raw = await AsyncStorage.getItem("@admins_db");
      console.log("[Access] DEBUG: Fetched @admins_db:", raw); 
      const parsed = raw ? JSON.parse(raw) : [];
      setAdmins(parsed);
    } catch (e) { 
      console.error("[Access] Error fetching admins:", e); 
      setAdmins([]);
    }
  }, []);

  const fetchApproachThreads = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const myThreads = all.filter(t => t.email === user?.email);
      setAllApproachThreads(myThreads);
      const anyUnread = myThreads.some(t =>
        t.messages?.some(m => m.sender === "admin" && !m.readByUser)
      );
      setHasUnreadApproach(anyUnread);
    } catch (e) { console.error(e); }
  }, [user?.email]);

  useEffect(() => {
    fetchAnnouncements();
    fetchAdmins();
    fetchApproachThreads();
    const timer = setInterval(() => {
      fetchAnnouncements();
      fetchAdmins();
      fetchApproachThreads();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchAnnouncements, fetchAdmins, fetchApproachThreads]);

  const handleOpenAnnouncements = async () => {
    closeFab();
    setShowAnnouncementsModal(true);
    if (announcements.length > 0) {
      const latestId = announcements[0].id;
      await AsyncStorage.setItem("@last_seen_announcement_" + (user?.email || ""), latestId);
      setHasNewAnnouncement(false);
    }
  };

  const handleOpenAdminModal = async () => {
    closeFab();
    await fetchAdmins();
    await fetchApproachThreads();
    setApproachMode("list");
    setShowApproachModal(true);
  };

  const markAdminMessagesRead = async (threadId) => {
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.map(t => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map(m =>
            m.sender === "admin" ? { ...m, readByUser: true } : m
          )
        };
      });
      await AsyncStorage.setItem("@admin_approaches", JSON.stringify(updated));
      fetchApproachThreads();
    } catch (e) { console.error(e); }
  };

  const initChat = async (initialMessage) => {
    if (!selectedAdmin) return;
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      let thread = all.find(t => t.adminEmail === selectedAdmin.email && t.email === user?.email);
      
      if (!thread) {
        thread = {
          id: Date.now().toString(),
          adminEmail: selectedAdmin.email,
          email: user?.email,
          anonName: user?.anonName || "Anonymous",
          userAvatar: userAvatar,
          messages: []
        };
        const updated = [thread, ...all];
        await AsyncStorage.setItem("@admin_approaches", JSON.stringify(updated));
      }
      
      setApproachThread(thread);
      setApproachMode("chat");
      setShowApproachChat(true);
      if (initialMessage) {
        setApproachMessage(initialMessage);
      }
      await markAdminMessagesRead(thread.id);
    } catch (e) { console.error(e); }
  };

  const handleReportBehavior = () => {
    initChat("I would like to report bad behavior: ");
  };

  const handleAppFeedback = () => {
    initChat("I have some feedback regarding the app: ");
  };

  const selectAdmin = (admin) => {
    setSelectedAdmin(admin);
    setApproachMode("select");
  };

  const handleCloseChatToList = () => {
    setShowApproachChat(false);
    setApproachThread(null);
    setApproachMode("list");
    fetchApproachThreads();
  };

  const handleCloseApproachCompletely = () => {
    setShowApproachModal(false);
    setShowApproachChat(false);
    setApproachThread(null);
    setSelectedAdmin(null);
    setApproachMode("list");
    fetchApproachThreads();
  };

  const handleSendApproach = async () => {
    if (!approachMessage.trim() || !approachThread) return;
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const newMsg = {
        id: Date.now().toString(),
        sender: "user",
        senderName: user?.anonName || "Anonymous",
        content: approachMessage.trim(),
        timestamp: Date.now(),
        read: false
      };
      const updatedAll = all.map(t => {
        if (t.id === approachThread.id) {
          return { ...t, messages: [...(t.messages || []), newMsg] };
        }
        return t;
      });
      await AsyncStorage.setItem("@admin_approaches", JSON.stringify(updatedAll));
      const updatedThread = updatedAll.find(t => t.id === approachThread.id);
      setApproachThread(updatedThread);
      setApproachMessage("");
      setTimeout(() => approachFlatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) { console.error(e); }
  };

  const refreshApproachThread = useCallback(async () => {
    if (!approachThread) return;
    try {
      const raw = await AsyncStorage.getItem("@admin_approaches");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.find(t => t.id === approachThread.id);
      if (updated) setApproachThread(updated);
    } catch (e) { console.error(e); }
  }, [approachThread?.id]);

  useEffect(() => {
    if (!showApproachChat) return;
    const t = setInterval(refreshApproachThread, 4000);
    return () => clearInterval(t);
  }, [showApproachChat, refreshApproachThread]);

  const adminThreadHasUnread = (adminEmail) => {
    const thread = allApproachThreads.find(t => t.adminEmail === adminEmail);
    if (!thread) return false;
    return thread.messages?.some(m => m.sender === "admin" && !m.readByUser) || false;
  };

  const getRelativeTime = (timestamp) => {
    const diff = Math.floor((now - timestamp) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const hasAnyBadge = hasNewAnnouncement || hasUnreadApproach;

  const renderAnnouncementCard = (item) => (
    <View key={item.id} style={[styles.announcementCard, { borderLeftColor: item.typeColor, backgroundColor: item.typeBg }]}>
      <View style={[styles.announcementTypePill, { backgroundColor: item.typeColor }]}>
        <Text style={styles.announcementTypePillText}>{item.typeLabel}</Text>
      </View>
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementBody}>{item.body}</Text>
      {item.eventDate ? (
        <View style={styles.announcementDateRow}>
          <Text>📅 </Text>
          <Text style={styles.announcementDateText}>
            {item.eventDate}{item.eventTime ? ` at ${item.eventTime}` : ""}
          </Text>
        </View>
      ) : null}
      <Text style={styles.announcementMeta}>
        Posted by {item.adminName} • {getRelativeTime(item.timestamp)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.fabWrapper}>
        <Animated.View style={[styles.fabSubBtn, styles.fabAnnBtn, { opacity: annOpacity, transform: [{ scale: annScale }, { translateY: annTranslateY }] }]}>
          <TouchableOpacity style={styles.fabSubBtnInner} onPress={handleOpenAnnouncements} activeOpacity={0.8}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8992/8992456.png' }} style={styles.fabSubIcon} />
            {hasNewAnnouncement && <View style={styles.fabSubDot} />}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.fabSubBtn, styles.fabAdminBtn, { opacity: adminOpacity, transform: [{ scale: adminScale }, { translateY: adminTranslateY }] }]}>
          <TouchableOpacity style={styles.fabSubBtnInner} onPress={handleOpenAdminModal} activeOpacity={0.8}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/12724/12724695.png' }} style={styles.fabSubIcon} />
            {hasUnreadApproach && <View style={styles.fabSubDot} />}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.fabMain} onPress={toggleFab} activeOpacity={0.85}>
          <Animated.Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/11450/11450628.png' }}
            style={[styles.fabMainIcon, { transform: [{ rotate: spinInterpolate }] }]}
          />
          {hasAnyBadge && !fabOpen && <View style={styles.fabMainDot} />}
        </TouchableOpacity>
      </View>

      {fabOpen && (
        <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={closeFab} />
      )}

      <Modal visible={showAnnouncementsModal} transparent animationType="fade">
        <View style={styles.floatingOverlay}>
          <View style={styles.floatingModal}>
            <View style={styles.floatingModalHeader}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8992/8992456.png' }} style={styles.floatingModalHeaderIcon} />
              <Text style={styles.floatingModalTitle}>Announcements</Text>
              <TouchableOpacity onPress={() => setShowAnnouncementsModal(false)}>
                <Text style={styles.floatingModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {announcements.length === 0 ? (
              <View style={styles.floatingEmpty}>
                <Text style={styles.floatingEmptyIcon}>📋</Text>
                <Text style={styles.floatingEmptyText}>No announcements yet.</Text>
              </View>
            ) : (
              <ScrollView style={styles.floatingScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                {announcements.map(a => renderAnnouncementCard(a))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showApproachModal} transparent animationType="fade">
        <View style={styles.floatingOverlay}>
          <View style={styles.floatingModal}>
            <View style={styles.floatingModalHeader}>
              <Text style={styles.floatingModalTitle}>
                {approachMode === "list" ? "Approach Admin" : "Select Topic"}
              </Text>
              <TouchableOpacity onPress={handleCloseApproachCompletely}>
                <Text style={styles.floatingModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {approachMode === "list" && (
              admins.length === 0 ? (
                <View style={styles.floatingEmpty}>
                  <Text style={styles.floatingEmptyIcon}>🛡️</Text>
                  <Text style={styles.floatingEmptyText}>No admins available.</Text>
                </View>
              ) : (
                <ScrollView style={styles.floatingScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                  {admins.map(item => {
                    const hasUnread = adminThreadHasUnread(item.email);
                    return (
                      <TouchableOpacity key={item.id} style={styles.adminCard} onPress={() => selectAdmin(item)}>
                        <View style={styles.adminCardAvatarWrapper}>
                          <View style={styles.adminCardAvatar}><Text style={{ fontSize: 22 }}>🛡️</Text></View>
                          {hasUnread && <View style={styles.adminRedDot} />}
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={styles.adminCardName}>Admin</Text>
                          <Text style={styles.adminCardEmail}>{item.email}</Text>
                        </View>
                        <Text style={styles.adminCardChevron}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )
            )}

            {approachMode === "select" && (
              <View style={{ padding: 20, gap: 15 }}>
                <TouchableOpacity style={styles.optionBtn} onPress={handleReportBehavior}>
                  <Text style={styles.optionBtnText}>⚠️ Report Bad Behavior</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionBtn} onPress={handleAppFeedback}>
                  <Text style={styles.optionBtnText}>💡 App Feedback</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: '#fff', borderWidth: 2 }]} onPress={() => setApproachMode("list")}>
                  <Text style={[styles.optionBtnText, { color: '#000' }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showApproachChat} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.floatingOverlay}>
          <View style={styles.approachChatFloating}>
            <View style={styles.approachChatHeader}>
              <View style={styles.approachChatAvatar}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/12724/12724695.png' }} style={{ width: 26, height: 26, tintColor: '#FFD700' }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.approachChatName}>Admin</Text>
                <Text style={styles.approachChatEmail}>{selectedAdmin?.email || ""}</Text>
              </View>
              <TouchableOpacity style={styles.approachChatClose} onPress={handleCloseChatToList}>
                <Text style={styles.approachChatCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              ref={approachFlatRef}
              data={approachThread?.messages || []}
              keyExtractor={m => m.id}
              contentContainerStyle={{ padding: 14, paddingBottom: 10 }}
              onContentSizeChange={() => approachFlatRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={<View style={styles.approachChatEmpty}><Text style={styles.approachChatEmptyText}>No messages yet. Say something! 👋</Text></View>}
              renderItem={({ item }) => {
                const isMe = item.sender === "user";
                return (
                  <View style={[styles.approachBubbleRow, isMe && styles.approachBubbleRowRight]}>
                    {!isMe && (
                      <View style={styles.approachBubbleAvatar}>
                        <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/12724/12724695.png' }} style={{ width: 14, height: 14, tintColor: '#FFD700' }} />
                      </View>
                    )}
                    <View style={[styles.approachBubble, isMe ? styles.approachBubbleMe : styles.approachBubbleAdmin]}>
                      <Text style={[styles.approachBubbleText, isMe && styles.approachBubbleTextMe]}>{item.content}</Text>
                      <Text style={[styles.approachBubbleTime, isMe && { color: "rgba(255,255,255,0.6)" }]}>{getRelativeTime(item.timestamp)}</Text>
                    </View>
                  </View>
                );
              }}
            />
            <View style={styles.approachInputBar}>
              <TextInput style={styles.approachInput} placeholder="Type your message..." placeholderTextColor="#94a3b8" value={approachMessage} onChangeText={setApproachMessage} multiline />
              <TouchableOpacity style={[styles.approachSendBtn, !approachMessage.trim() && { opacity: 0.5 }]} onPress={handleSendApproach} disabled={!approachMessage.trim()}>
                <Text style={styles.approachSendBtnText}>SEND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, pointerEvents: 'box-none' },
  optionBtn: { padding: 16, backgroundColor: '#000', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  optionBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  fabWrapper: { position: 'absolute', bottom: 90, right: 20, zIndex: 999 },
  fabMain: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  fabMainIcon: { width: 26, height: 26 },
  fabMainDot: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },
  fabSubBtn: { position: 'absolute', right: 3 },
  fabAnnBtn: { bottom: 65 },
  fabAdminBtn: { bottom: 120 },
  fabSubBtnInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#000', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 },
  fabSubIcon: { width: 24, height: 24 },
  fabSubDot: { position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 5 },
  floatingOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  floatingModal: { backgroundColor: '#fff', width: '90%', maxHeight: '75%', borderRadius: 24, borderWidth: 3, borderColor: '#000', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 },
  floatingModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 2, borderColor: '#000', backgroundColor: '#F8FAFC', gap: 10 },
  floatingModalHeaderIcon: { width: 22, height: 22 },
  floatingModalTitle: { fontSize: 17, fontWeight: '900', color: '#000', flex: 1 },
  floatingModalClose: { fontSize: 18, color: '#94a3b8', fontWeight: '900', padding: 4 },
  floatingScroll: { flexGrow: 0 },
  floatingEmpty: { alignItems: 'center', padding: 40 },
  floatingEmptyIcon: { fontSize: 40, marginBottom: 12 },
  floatingEmptyText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  announcementCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#000', borderLeftWidth: 5, shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 2 },
  announcementTypePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  announcementTypePillText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  announcementTitle: { fontSize: 15, fontWeight: '900', color: '#000', marginBottom: 4 },
  announcementBody: { fontSize: 13, color: '#334155', lineHeight: 19, fontWeight: '500', marginBottom: 8 },
  announcementDateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 7, padding: 7, marginBottom: 6 },
  announcementDateText: { fontWeight: '800', fontSize: 12, color: '#1E293B' },
  announcementMeta: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  adminCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 2 },
  adminCardAvatarWrapper: { position: 'relative' },
  adminCardAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  adminRedDot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
  adminCardName: { fontWeight: '900', color: '#000', fontSize: 14 },
  adminCardEmail: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  adminUnreadLabel: { fontSize: 10, color: '#EF4444', fontWeight: '800', marginTop: 3 },
  adminCardChevron: { fontSize: 22, color: '#CBD5E1' },
  approachChatFloating: { backgroundColor: '#F5F7FF', width: '92%', maxHeight: '82%', borderRadius: 24, borderWidth: 3, borderColor: '#000', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 },
  approachChatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 2.5, borderColor: '#000', gap: 12 },
  approachChatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  approachChatName: { fontWeight: '900', color: '#000', fontSize: 15 },
  approachChatEmail: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  approachChatClose: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 10, borderWidth: 2, borderColor: '#000' },
  approachChatCloseText: { fontWeight: '900', color: '#000', fontSize: 14 },
  approachChatEmpty: { alignItems: 'center', marginTop: 40 },
  approachChatEmptyText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
  approachBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  approachBubbleRowRight: { justifyContent: 'flex-end' },
  approachBubbleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 2, borderColor: '#FFD700' },
  approachBubble: { maxWidth: '72%', borderRadius: 18, padding: 12, borderWidth: 2, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 },
  approachBubbleMe: { backgroundColor: '#000', borderBottomRightRadius: 4 },
  approachBubbleAdmin: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  approachBubbleText: { fontSize: 14, color: '#000', fontWeight: '600', lineHeight: 20 },
  approachBubbleTextMe: { color: '#FFD700' },
  approachBubbleTime: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  approachInputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderTopWidth: 2.5, borderColor: '#000', gap: 10, paddingBottom: Platform.OS === 'ios' ? 18 : 12 },
  approachInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '700', maxHeight: 80, borderWidth: 2, borderColor: '#000', color: '#000' },
  approachSendBtn: { backgroundColor: '#FFD700', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 2.5, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  approachSendBtnText: { fontWeight: '900', color: '#000', fontSize: 13 },
});

export default Access;