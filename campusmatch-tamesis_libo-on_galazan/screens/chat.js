import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, SafeAreaView, Image, Animated, Alert, Modal, TouchableWithoutFeedback, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen({ user, initialPartner, onClearPartner, navigation }) {
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null); 
  const [inputText, setInputText] = useState('');
  
  // Modals & UI States
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [msgOptionsVisible, setMsgOptionsVisible] = useState(false);
  const [msgDeleteVisible, setMsgDeleteVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Selection States
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editText, setEditText] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

  const flatListRef = useRef(null);
  const introAnim = useRef(new Animated.Value(0)).current;

  const activeChat = useMemo(() => 
    conversations.find(c => c.otherId === activeChatId), 
    [conversations, activeChatId]
  );

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        const allUsersJSON = await AsyncStorage.getItem('@users_db');
        const allUsers = allUsersJSON ? JSON.parse(allUsersJSON) : [];

        if (activeChatId) {
          const partner = allUsers.find(u => u.id === activeChatId);
          setIsPartnerOnline(partner?.isOnline || false);
        }

        const sparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
        const mySparks = sparksJSON ? JSON.parse(sparksJSON) : [];
        const globalSparksJSON = await AsyncStorage.getItem('@sparks');
        const globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

        const matchedIdsFromMyList = mySparks.filter(s => s.status === 'accepted').map(s => s.receiver_id);
        const matchedIdsFromGlobal = globalSparks
          .filter(s => (s.receiver_id === user.id || s.sender_id === user.id) && s.status === 'accepted')
          .map(s => s.sender_id === user.id ? s.receiver_id : s.sender_id);

        const allMatchedIds = [...new Set([...matchedIdsFromMyList, ...matchedIdsFromGlobal])]
          .filter(id => id !== user.id);

        const chatMetadata = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
        let myInboxMetadata = chatMetadata ? JSON.parse(chatMetadata) : [];

        let syncList = [];
        for (const mId of allMatchedIds) {
          const matchProfile = allUsers.find(u => u.id === mId);
          if (!matchProfile) continue;

          const sharedChatKey = [user.id, mId].sort().join('_');
          const sharedHistory = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
          const messages = sharedHistory ? JSON.parse(sharedHistory) : [];
          
          const metaEntry = myInboxMetadata.find(m => m.otherId === mId);
          const displayName = matchProfile.anonName || matchProfile.firstName || "Anonymous";

          syncList.push({
            otherId: mId,
            otherName: displayName,
            avatar: matchProfile.avatar || matchProfile.profileImage || '👤',
            messages: messages,
            lastMessage: messages.length > 0 
                ? messages[0].text 
                : metaEntry?.lastMessage || `You sparked with ${displayName}!`,
            timestamp: messages.length > 0 ? messages[0].timestamp : metaEntry?.timestamp || null,
            unread: metaEntry ? metaEntry.unread : false,
          });
        }

        setConversations(syncList.sort((a, b) => (new Date(b.timestamp) || 0) - (new Date(a.timestamp) || 0)));
      } catch (e) { console.error("Sync Error:", e); }
    };

    loadData();
    const interval = setInterval(loadData, 2000); 
    return () => clearInterval(interval);
  }, [user?.id, activeChatId]);

  useEffect(() => {
    if (initialPartner) { handleOpenChat(initialPartner); }
  }, [initialPartner]);

  const handleOpenChat = async (convo) => {
    setActiveChatId(convo.otherId);
    await toggleReadStatus(convo.otherId, true);
    Animated.spring(introAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
  };

  const toggleReadStatus = async (otherId, forceRead = false) => {
    try {
      const data = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
      let parsed = data ? JSON.parse(data) : [];
      const index = parsed.findIndex(c => c.otherId === otherId);
      if (index > -1) { parsed[index].unread = forceRead ? false : !parsed[index].unread; }
      else { parsed.push({ otherId, unread: forceRead ? false : true }); }
      await AsyncStorage.setItem(`@chat_meta_${user.id}`, JSON.stringify(parsed));
    } catch (e) { console.error(e); }
  };

  const confirmDeleteChat = async () => {
    try {
        const data = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
        let parsed = data ? JSON.parse(data) : [];
        await AsyncStorage.setItem(`@chat_meta_${user.id}`, JSON.stringify(parsed.filter(c => c.otherId !== selectedConvoId)));
        const sharedChatKey = [user.id, selectedConvoId].sort().join('_');
        await AsyncStorage.removeItem(`@msg_history_${sharedChatKey}`);
        setConversations(prev => prev.filter(c => c.otherId !== selectedConvoId));
        setDeleteModalVisible(false);
        setSelectedConvoId(null);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || !user?.id) return;
    const newMessage = { id: Date.now().toString(), sender: user.id, text: inputText.trim(), timestamp: new Date().toISOString() };
    try {
      const sharedChatKey = [user.id, activeChat.otherId].sort().join('_');
      const sharedData = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
      let sharedMessages = sharedData ? JSON.parse(sharedData) : [];
      sharedMessages = [newMessage, ...sharedMessages];
      await AsyncStorage.setItem(`@msg_history_${sharedChatKey}`, JSON.stringify(sharedMessages));
      updateRecipientMeta(activeChat.otherId, newMessage.text, newMessage.timestamp);
      setInputText('');
    } catch (e) { Alert.alert("Error", "Message failed to send."); }
  };

  const updateRecipientMeta = async (recipientId, text, time) => {
    const key = `@chat_meta_${recipientId}`;
    const data = await AsyncStorage.getItem(key);
    let parsed = data ? JSON.parse(data) : [];
    const idx = parsed.findIndex(c => c.otherId === user.id);
    if (idx > -1) {
      parsed[idx] = { ...parsed[idx], unread: true, lastMessage: text, timestamp: time };
    } else {
      parsed.push({ otherId: user.id, unread: true, lastMessage: text, timestamp: time });
    }
    await AsyncStorage.setItem(key, JSON.stringify(parsed));
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const sharedChatKey = [user.id, activeChat.otherId].sort().join('_');
      const data = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
      let messages = data ? JSON.parse(data) : [];
      const index = messages.findIndex(m => m.id === selectedMsg.id);
      if (index > -1) {
        messages[index].text = editText;
        await AsyncStorage.setItem(`@msg_history_${sharedChatKey}`, JSON.stringify(messages));
      }
      setEditModalVisible(false);
    } catch (e) { console.error(e); }
  };

  const confirmDeleteMessage = async () => {
    try {
      const sharedChatKey = [user.id, activeChat.otherId].sort().join('_');
      const data = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
      let messages = data ? JSON.parse(data) : [];
      const filtered = messages.filter(m => m.id !== selectedMsg.id);
      await AsyncStorage.setItem(`@msg_history_${sharedChatKey}`, JSON.stringify(filtered));
      setMsgDeleteVisible(false);
    } catch (e) { console.error(e); }
  };

  const renderAvatar = (source, size = 40, isCircular = false) => {
    const isUri = typeof source === 'string' && (source.startsWith('http') || source.startsWith('data:image'));
    return (
      <View style={[styles.avatarBox, { width: size, height: size, borderRadius: isCircular ? size / 2 : 16 }]}>
        {isUri ? <Image source={{ uri: source }} style={styles.avatarFull} /> : <Text style={{ fontSize: size * 0.5 }}>{source || '👤'}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {activeChat ? (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setActiveChatId(null); onClearPartner?.(); }} style={styles.backBtn}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
               <View style={styles.headerRow}>
                  {renderAvatar(activeChat.avatar, 40, true)}
                  <View style={styles.headerTextWrap}>
                      <Text style={styles.headerName}>{activeChat.otherName}</Text>
                      <View style={styles.statusRow}>
                          <View style={[styles.dot, { backgroundColor: isPartnerOnline ? '#22c55e' : '#94a3b8' }]} />
                          <Text style={styles.statusText}>{isPartnerOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                      </View>
                  </View>
               </View>
            </View>
          </View>
          
          <View style={styles.chatBackground}>
            <FlatList
              ref={flatListRef}
              data={activeChat.messages || []}
              inverted={true}
              keyExtractor={(item) => item.id}
              ListFooterComponent={() => (
                <Animated.View style={[styles.introSection, { opacity: introAnim, transform: [{ scale: introAnim }] }]}>
                  {renderAvatar(activeChat.avatar, 90, true)}
                  <Text style={styles.introTitle}>Match with {activeChat.otherName}</Text>
                  <Text style={styles.introSub}>The spark is ignited! Break the ice.</Text>
                </Animated.View>
              )}
              renderItem={({ item }) => {
                const isMine = item.sender === user.id;
                return (
                  <View style={[styles.bubbleWrap, isMine ? styles.myWrap : styles.theirWrap]}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => {
                        if(isMine) {
                          setSelectedMsg(item);
                          setMsgOptionsVisible(true);
                        }
                      }}
                      style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}
                    >
                      <Text style={[styles.msgText, { color: '#000' }]}>{item.text}</Text>
                    </TouchableOpacity>
                    <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={styles.inputBar}>
              <TextInput 
                style={styles.input} 
                placeholder="Type a spark..." 
                placeholderTextColor="#64748B"
                value={inputText} 
                onChangeText={setInputText} 
              />
              <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && { opacity: 0.6 }]} onPress={sendMessage} disabled={!inputText.trim()}>
                <Text style={styles.sendBtnText}>POST</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <>
          <View style={styles.matchesContainer}>
             <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>YOUR SPARKS</Text>
             </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.matchItem}>
                <TouchableOpacity 
                  style={styles.addMatchBtn} 
                  onPress={() => {
                    // Check if navigation exist, else alert to help you debug
                    if (navigation && typeof navigation.navigate === 'function') {
                      navigation.navigate('Match'); 
                    } else {
                      Alert.alert("Navigation Error", "The navigation prop is not linked correctly. Check HomeScreen.js.");
                    }
                  }}
                >
                  <Text style={styles.addIcon}>+</Text>
                </TouchableOpacity>
                <Text style={styles.matchNameLabel}>Find More</Text>
              </View>

              {conversations.map((item) => (
                <TouchableOpacity key={item.otherId} style={styles.matchItem} onPress={() => handleOpenChat(item)}>
                  {renderAvatar(item.avatar, 60, true)}
                  <Text style={styles.matchNameLabel} numberOfLines={1}>{item.otherName.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.thickDivider} />

          <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>CONVERSATIONS</Text>
          </View>

          <FlatList
            data={conversations}
            keyExtractor={(item) => item.otherId}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.row} 
                onPress={() => handleOpenChat(item)} 
                onLongPress={() => { setSelectedConvoId(item.otherId); setMenuVisible(true); }}
              >
                {renderAvatar(item.avatar, 65, true)}
                <View style={styles.rowRight}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.otherName}</Text>
                    <Text style={styles.rowTime}>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "NOW"}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={[styles.rowMsg, item.unread && { fontWeight: '900', color: '#000' }]} numberOfLines={1}>{item.lastMessage}</Text>
                    {item.unread && <View style={styles.unreadBadge}><Text style={styles.unreadText}>NEW</Text></View>}
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.threeDotBtn} 
                  onPress={() => { setSelectedConvoId(item.otherId); setMenuVisible(true); }}
                >
                  <Text style={styles.threeDotText}>⋮</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No sparks found yet. Visit the Match tab!</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </>
      )}

      {/* --- MODALS (Unchanged) --- */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.fadeOverlay}>
            <View style={styles.imageMenuCard}>
              <View style={styles.imageMenuHeader}>
                <Text style={styles.imageMenuHeaderText}>CHAT OPTIONS</Text>
              </View>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { toggleReadStatus(selectedConvoId); setMenuVisible(false); }}>
                <Text style={styles.imageMenuTextBlue}>TOGGLE READ STATUS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { setMenuVisible(false); setTimeout(() => setDeleteModalVisible(true), 300); }}>
                <Text style={styles.imageMenuTextRed}>DELETE CHAT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuClose} onPress={() => setMenuVisible(false)}>
                <Text style={styles.imageMenuTextGrey}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={msgOptionsVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMsgOptionsVisible(false)}>
          <View style={styles.fadeOverlay}>
            <View style={styles.imageMenuCard}>
              <View style={styles.imageMenuHeader}>
                <Text style={styles.imageMenuHeaderText}>MESSAGE OPTIONS</Text>
              </View>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { setEditText(selectedMsg?.text); setMsgOptionsVisible(false); setEditModalVisible(true); }}>
                <Text style={styles.imageMenuTextBlue}>EDIT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { setMsgOptionsVisible(false); setMsgDeleteVisible(true); }}>
                <Text style={styles.imageMenuTextRed}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuClose} onPress={() => setMsgOptionsVisible(false)}>
                <Text style={styles.imageMenuTextGrey}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>REFINE YOUR SPARK</Text>
            <TextInput style={styles.editInput} value={editText} onChangeText={setEditText} multiline />
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.noBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.noText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible || msgDeleteVisible} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>EXTINGUISH PERMANENTLY?</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={styles.noBtn} onPress={() => { setDeleteModalVisible(false); setMsgDeleteVisible(false); }}>
                <Text style={styles.noText}>NO</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.yesBtn} onPress={msgDeleteVisible ? confirmDeleteMessage : confirmDeleteChat}>
                <Text style={styles.yesBtnText}>YES, DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 3, borderColor: '#000', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, backgroundColor: '#C7D2FE', borderWidth: 2, borderColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  backIcon: { fontSize: 28, color: '#000', fontWeight: '900', marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTextWrap: { marginLeft: 12 },
  headerName: { fontSize: 16, fontWeight: '900', color: '#2563EB' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, borderWidth: 1.5, borderColor: '#000' },
  statusText: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  sectionTitleRow: { paddingHorizontal: 16, marginTop: 18, marginBottom: 8, alignItems: 'flex-start' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1.5 },
  matchesContainer: { paddingBottom: 15 },
  matchesScroll: { paddingHorizontal: 16, marginTop: 5 },
  matchItem: { alignItems: 'center', marginRight: 20, width: 65, position: 'relative' },
  addMatchBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  addIcon: { fontSize: 30, fontWeight: '900', color: '#2563EB' },
  matchNameLabel: { fontSize: 11, fontWeight: '800', marginTop: 10, color: '#000' },
  thickDivider: { height: 3, backgroundColor: '#000', marginVertical: 10 },
  row: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, padding: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4 },
  rowRight: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 17, fontWeight: '900', color: '#000' },
  rowTime: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rowMsg: { color: '#64748B', fontSize: 13, flex: 1, fontWeight: '600' },
  unreadBadge: { backgroundColor: '#DCFCE7', borderWidth: 2, borderColor: '#000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  unreadText: { fontSize: 8, fontWeight: '900' },
  threeDotBtn: { padding: 5, marginLeft: 10 },
  threeDotText: { fontSize: 22, fontWeight: '900', color: '#000' },
  chatBackground: { flex: 1, backgroundColor: '#F8FAFF' },
  introSection: { alignItems: 'center', marginVertical: 50, paddingHorizontal: 40 },
  introTitle: { fontSize: 20, fontWeight: '900', marginTop: 20, textAlign: 'center', color: '#000' },
  introSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 10, fontWeight: '600' },
  avatarBox: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarFull: { width: '100%', height: '100%' },
  bubbleWrap: { marginVertical: 8, maxWidth: '80%' },
  myWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, borderWidth: 2, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  myBubble: { backgroundColor: '#DCFCE7', borderBottomRightRadius: 4 }, 
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, fontWeight: '700' },
  msgTime: { fontSize: 9, color: '#94A3B8', marginTop: 8, fontWeight: '800' },
  inputBar: { flexDirection: 'row', padding: 16, alignItems: 'center', borderTopWidth: 3, borderColor: '#000', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 15, paddingHorizontal: 15, height: 50, marginRight: 12, fontWeight: '700', color: '#000' },
  sendBtn: { backgroundColor: '#C7D2FE', height: 50, paddingHorizontal: 22, borderRadius: 15, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  sendBtnText: { color: '#2563EB', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  imageMenuCard: { backgroundColor: '#fff', width: '85%', borderRadius: 25, borderWidth: 3, borderColor: '#000', overflow: 'hidden' },
  imageMenuHeader: { padding: 18, backgroundColor: '#F0F7FF', borderBottomWidth: 2, borderColor: '#000', alignItems: 'center' },
  imageMenuHeaderText: { fontWeight: '900', color: '#1E293B', fontSize: 14 },
  imageMenuItem: { paddingVertical: 20, borderBottomWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  imageMenuTextBlue: { fontWeight: '900', color: '#2563EB', fontSize: 16 },
  imageMenuTextRed: { fontWeight: '900', color: '#F87171', fontSize: 16 },
  imageMenuClose: { paddingVertical: 18, alignItems: 'center' },
  imageMenuTextGrey: { color: '#94A3B8', fontWeight: '900', fontSize: 16 },
  confirmBox: { backgroundColor: '#fff', width: '90%', borderRadius: 25, padding: 25, borderWidth: 3, borderColor: '#000' },
  confirmTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  noBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 15, borderWidth: 2, borderColor: '#000', marginRight: 8 },
  noText: { fontWeight: '900', color: '#000' },
  yesBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#FECACA', borderRadius: 15, borderWidth: 2, borderColor: '#000', marginLeft: 8 },
  yesBtnText: { fontWeight: '900', color: '#000' },
  saveBtn: { flex: 1, padding: 15, alignItems: 'center', backgroundColor: '#C7D2FE', borderRadius: 15, borderWidth: 2, borderColor: '#000', marginLeft: 8 },
  saveBtnText: { fontWeight: '900', color: '#2563EB' },
  editInput: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 15, height: 100, borderWidth: 2, borderColor: '#000', marginBottom: 20, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#94A3B8', fontWeight: '800' }
});