import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, SafeAreaView, Image, Animated, Modal, TouchableWithoutFeedback, ScrollView, Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecentDelModal from "./modals/recentdelmodal"; 
import UnsparkedMsg from "./modals/unsparkedmsg";
// Violation logic imports
import { checkViolation, recordViolation, checkSuspension } from "../settings/warning&violation"; 
import WarningsModal from "../settings/warnings"; 
import UserSuspensionModal from "../settings/usersuspension";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <View style={styles.detailValueBox}>
      <Text style={styles.detailValueText} numberOfLines={1}>{value || "Not Set"}</Text>
    </View>
  </View>
);

export default function ChatScreen({ user, initialPartner, onClearPartner, navigation, onChatOpen, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [deletedConversations, setDeletedConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null); 
  const [inputText, setInputText] = useState('');
  const [sparkList, setSparkList] = useState([]);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [msgOptionsVisible, setMsgOptionsVisible] = useState(false);
  const [msgDeleteVisible, setMsgDeleteVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [trashModalVisible, setTrashModalVisible] = useState(false);

  // Violation System
  const [violationModalVisible, setViolationModalVisible] = useState(false);
  const [detectedWords, setDetectedWords] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // ── Self suspension state ─────────────────────────────────────────────────
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const suspensionPollRef = useRef(null);

  // ── Partner suspension state ──────────────────────────────────────────────
  // { isSuspended: bool, daysRemaining: number, suspensionUntil: number }
  const [partnerSuspension, setPartnerSuspension] = useState(null);

  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [editText, setEditText] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [partnerDetails, setPartnerDetails] = useState(null);

  const flatListRef = useRef(null);
  const introAnim = useRef(new Animated.Value(0)).current;

  const renderAvatar = (source, size = 40, isCircular = false) => {
    const isUri = typeof source === 'string' && (source.startsWith('http') || source.startsWith('data:image'));
    return (
      <View style={[styles.avatarBox, { width: size, height: size, borderRadius: isCircular ? size / 2 : 12 }]}>
        {isUri ? <Image source={{ uri: source }} style={styles.avatarFull} /> : <Text style={{ fontSize: size * 0.5 }}>{source || '👤'}</Text>}
      </View>
    );
  };

  const activeChat = useMemo(() => 
    conversations.find(c => c.otherId === activeChatId) || 
    deletedConversations.find(c => c.otherId === activeChatId) || 
    sparkList.find(c => c.otherId === activeChatId), 
    [conversations, deletedConversations, sparkList, activeChatId]
  );

  // ── Poll OWN suspension every 5 s ────────────────────────────────────────
  const pollSelfSuspension = async () => {
    if (!user?.email) return;
    const status = await checkSuspension(user.email);
    if (status.isSuspended || status.isPending) {
      setShowSuspensionModal(true);
    } else {
      setShowSuspensionModal(false);
    }
  };

  useEffect(() => {
    pollSelfSuspension();
    suspensionPollRef.current = setInterval(pollSelfSuspension, 5000);
    return () => clearInterval(suspensionPollRef.current);
  }, [user?.email]);

  // ── Poll PARTNER suspension when a chat is open ───────────────────────────
  useEffect(() => {
    if (!activeChatId) {
      setPartnerSuspension(null);
      return;
    }
    let partnerPollRef;
    const pollPartner = async () => {
      const status = await checkSuspension(activeChatId);
      if (status.isSuspended && status.suspensionData) {
        const msRemaining = Math.max(0, status.suspensionData.suspensionUntil - Date.now());
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        setPartnerSuspension({
          isSuspended: true,
          daysRemaining,
          suspensionUntil: status.suspensionData.suspensionUntil,
          days: status.suspensionData.days,
        });
      } else {
        setPartnerSuspension(null);
      }
    };
    pollPartner();
    partnerPollRef = setInterval(pollPartner, 5000);
    return () => clearInterval(partnerPollRef);
  }, [activeChatId]);

  // UPDATED LOGIC: Find the boundary where "New Session" ends and "Old History" begins
  const buildMessagesWithBanner = () => {
    const messages = activeChat?.messages || [];
    const showReunionBanner = activeChat?.isSparked && messages.length > 0;
    
    if (!showReunionBanner) return messages;

    const bannerItem = { id: 'reunion-banner', type: 'banner' };
    
    let lastNewMsgIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].isNewSession) {
        lastNewMsgIndex = i;
      } else {
        break; 
      }
    }

    if (lastNewMsgIndex === -1) {
      return [bannerItem, ...messages];
    }

    const result = [...messages];
    result.splice(lastNewMsgIndex + 1, 0, bannerItem);
    return result;
  };

  useEffect(() => {
    if (!user?.id) return;
    const loadData = async () => {
      try {
        const allUsersJSON = await AsyncStorage.getItem('@users_db');
        const allUsers = allUsersJSON ? JSON.parse(allUsersJSON) : [];

        if (activeChatId) {
          const partner = allUsers.find(u => u.id === activeChatId);
          setIsPartnerOnline(partner?.isOnline || false);
          setPartnerDetails(partner);
        }

        const mySparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
        const mySparks = mySparksJSON ? JSON.parse(mySparksJSON) : [];
        
        const globalSparksJSON = await AsyncStorage.getItem('@sparks');
        const globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

        const chatMetadata = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
        let myInboxMetadata = chatMetadata ? JSON.parse(chatMetadata) : [];
        
        const deletedJSON = await AsyncStorage.getItem(`@deleted_chats_${user.id}`);
        const deletedIds = deletedJSON ? JSON.parse(deletedJSON) : [];

        let syncList = [];
        let trashList = [];
        let horizontalMatches = []; 

        const allPotentialIds = [...new Set([
            ...mySparks.map(s => s.receiver_id),
            ...globalSparks.filter(s => s.receiver_id === user.id).map(s => s.sender_id),
            ...myInboxMetadata.map(m => m.otherId)
        ])].filter(id => id && id !== user.id);

        for (const mId of allPotentialIds) {
          const matchProfile = allUsers.find(u => u.id === mId);
          if (!matchProfile) continue;

          const sharedChatKey = [user.id, mId].sort().join('_');
          const sharedHistory = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
          const messages = sharedHistory ? JSON.parse(sharedHistory) : [];
          
          const metaEntry = myInboxMetadata.find(m => m.otherId === mId);
          const displayName = matchProfile.anonName || matchProfile.firstName || "Anonymous";
          
          const iSparkedThem = mySparks.some(s => s.receiver_id === mId && s.status === 'accepted');
          const theySparkedMe = globalSparks.some(s => s.sender_id === mId && s.receiver_id === user.id && s.status === 'accepted');
          const currentlySparked = iSparkedThem && theySparkedMe;

          let displayMsg = '';
          let isItalic = false;

          const lastVisibleMessage = messages.find(m => !m.isViolation || (m.isViolation && m.sender === user.id));
          
          if (!currentlySparked) {
            if (!iSparkedThem) {
              displayMsg = "You unsparked this user.";
            } else if (!theySparkedMe) {
              displayMsg = `${displayName} unsparked you.`;
            }
            isItalic = true;
          } else if (lastVisibleMessage) {
            displayMsg = lastVisibleMessage.isViolation ? "Message contains a violation" : lastVisibleMessage.text;
            isItalic = false;
          } else {
            displayMsg = `You sparked with ${displayName}!`;
            isItalic = false;
          }

          const isMeeUnsparked = !iSparkedThem; 

          const convoObj = {
            otherId: mId,
            otherName: displayName,
            avatar: matchProfile.avatar || matchProfile.profileImage || '👤',
            bgImage: matchProfile.bgImage || null,
            purpose: matchProfile.purpose || "Friendship",
            campus: matchProfile.campus,
            course: matchProfile.course || matchProfile.userCourse,
            age: matchProfile.age,
            address: matchProfile.address,
            prefCampus: matchProfile.prefCampus,
            prefCourse: matchProfile.prefCourse,
            prefYear: matchProfile.prefYear,
            prefGender: matchProfile.prefGender,
            prefAge: matchProfile.prefAge,
            messages: messages,
            lastMessage: displayMsg,
            isItalic: isItalic,
            timestamp: messages.length > 0 ? messages[0].timestamp : metaEntry?.timestamp || new Date(0).toISOString(),
            unread: metaEntry ? metaEntry.unread : false,
            isSparked: currentlySparked,
            isMeeUnsparked: isMeeUnsparked,
          };

          if (currentlySparked) horizontalMatches.push(convoObj);

          if (deletedIds.includes(mId)) {
            trashList.push(convoObj);
          } else {
            syncList.push(convoObj);
          }
        }

        setConversations(syncList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        setDeletedConversations(trashList);
        setSparkList(horizontalMatches); 
      } catch (e) { console.error("Sync Error:", e); }
    };

    loadData();
    const interval = setInterval(loadData, 2000); 
    return () => clearInterval(interval);
  }, [user?.id, activeChatId]);

  const handleOpenChat = async (convo) => {
    setActiveChatId(convo.otherId);
    if (onChatOpen) onChatOpen(convo);
    await toggleReadStatus(convo.otherId, true);
    Animated.timing(introAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleBackToList = () => {
    setActiveChatId(null);
    introAnim.setValue(0);
    if (onClearPartner) onClearPartner(); 
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
        const deletedJSON = await AsyncStorage.getItem(`@deleted_chats_${user.id}`);
        let deletedIds = deletedJSON ? JSON.parse(deletedJSON) : [];
        if (!deletedIds.includes(selectedConvoId)) {
          deletedIds.push(selectedConvoId);
          await AsyncStorage.setItem(`@deleted_chats_${user.id}`, JSON.stringify(deletedIds));
        }
        setDeleteModalVisible(false);
        setSelectedConvoId(null);
        setMenuVisible(false);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChat || !user?.id) return;

    const { isViolated, violatedWords } = checkViolation(inputText);
    
    const newMessage = { 
        id: Date.now().toString(), 
        sender: user.id, 
        text: inputText.trim(), 
        timestamp: new Date().toISOString(),
        isViolation: isViolated,
        isNewSession: true 
    };

    if (isViolated) {
        setDetectedWords(violatedWords);
        setViolationModalVisible(true);
        await recordViolation(user.email, inputText, 'Chat Message', violatedWords);
        // Re-check own suspension
        pollSelfSuspension();
    }

    try {
      const sharedChatKey = [user.id, activeChat.otherId].sort().join('_');
      const sharedData = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
      let sharedMessages = sharedData ? JSON.parse(sharedData) : [];
      
      const lastMsg = sharedMessages[0];
      let updatedHistory;

      if (lastMsg && !lastMsg.isNewSession) {
          updatedHistory = sharedMessages.map(m => ({...m, isNewSession: false}));
      } else {
          updatedHistory = sharedMessages;
      }

      const finalMessages = [newMessage, ...updatedHistory];
      await AsyncStorage.setItem(`@msg_history_${sharedChatKey}`, JSON.stringify(finalMessages));
      
      const myMetaKey = `@chat_meta_${user.id}`;
      const myMetaData = await AsyncStorage.getItem(myMetaKey);
      let myMeta = myMetaData ? JSON.parse(myMetaData) : [];
      const myIdx = myMeta.findIndex(m => m.otherId === activeChat.otherId);

      const displayMessage = isViolated ? "Message contains a violation" : newMessage.text;

      if (myIdx > -1) {
          myMeta[myIdx] = { ...myMeta[myIdx], lastMessage: displayMessage, timestamp: newMessage.timestamp };
      } else {
          myMeta.push({ otherId: activeChat.otherId, unread: false, lastMessage: displayMessage, timestamp: newMessage.timestamp });
      }
      await AsyncStorage.setItem(myMetaKey, JSON.stringify(myMeta));
      setInputText('');
    } catch (e) { console.error(e); }
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

  // ── Helper: format suspension time for partner banner ────────────────────
  const formatPartnerSuspensionTime = () => {
    if (!partnerSuspension) return "";
    const { daysRemaining, suspensionUntil } = partnerSuspension;
    const liftsOn = new Date(suspensionUntil).toLocaleDateString(undefined, {
      month: "short", day: "numeric",
    });
    if (daysRemaining <= 1) return `less than 1 day (lifts ${liftsOn})`;
    return `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} (lifts ${liftsOn})`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
          <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>YOUR SPARKS</Text>
          </View>
          <View style={styles.matchesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesScroll}>
              <View style={styles.matchItem}>
                <TouchableOpacity style={styles.addMatchBtn} onPress={() => navigation.navigate('Match')}>
                  <Text style={styles.addIcon}>+</Text>
                </TouchableOpacity>
                <Text style={styles.matchNameLabel}>Find More</Text>
              </View>

              {sparkList.map((item) => (
                <TouchableOpacity key={item.otherId} style={styles.matchItem} onPress={() => handleOpenChat(item)}>
                  {renderAvatar(item.avatar, 60, true)}
                  <Text style={styles.matchNameLabel} numberOfLines={1}>{item.otherName.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.thickDivider} />

          <View style={styles.convoHeaderRow}>
                <Text style={styles.convoTitleLarge}>CONVERSATIONS</Text>
                <TouchableOpacity style={styles.trashBtn} onPress={() => setTrashModalVisible(true)}>
                   <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4402/4402561.png' }} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
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
                {renderAvatar(item.avatar, 55, true)}
                <View style={styles.rowRight}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.otherName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.rowTime}>{item.timestamp !== new Date(0).toISOString() ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "NEW"}</Text>
                        <TouchableOpacity 
                            style={styles.moreBtn} 
                            onPress={() => { setSelectedConvoId(item.otherId); setMenuVisible(true); }}
                        >
                            <Text style={styles.moreIcon}>⋮</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text 
                      style={[
                        styles.rowMsg, 
                        item.unread && { fontWeight: '900', color: '#000' },
                        item.isItalic && { fontStyle: 'italic', color: '#94a3b8' }
                      ]} 
                      numberOfLines={1}
                    >
                        {item.lastMessage}
                    </Text>
                    {item.unread && <View style={styles.unreadBadge}><Text style={styles.unreadText}>NEW</Text></View>}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No active sparks. Find some matches!</Text>}
          />
      </View>

      {activeChat && (
        <View style={styles.activeChatOverlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <View style={styles.headerRow}>
                   {renderAvatar(activeChat.avatar, 40, true)}
                  <View style={styles.headerTextWrap}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={styles.headerName}>{activeChat.otherName}</Text>
                      <TouchableOpacity style={styles.infoIconButton} onPress={() => setInfoModalVisible(true)}>
                         <Text style={styles.infoIconText}>i</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.statusRow}>
                        {partnerSuspension?.isSuspended ? (
                          <View style={styles.suspendedBadge}>
                            <Text style={styles.suspendedBadgeText}>🚫 SUSPENDED</Text>
                          </View>
                        ) : (
                          <>
                            <View style={[styles.dot, { backgroundColor: isPartnerOnline ? '#22c55e' : '#94a3b8' }]} />
                            <Text style={styles.statusText}>{isPartnerOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                          </>
                        )}
                    </View>
                  </View>
               </View>
            </View>
          </View>

          {/* ── Partner suspended banner ── */}
          {partnerSuspension?.isSuspended && (
            <View style={styles.partnerSuspendedBanner}>
              <Text style={styles.partnerSuspendedIcon}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerSuspendedTitle}>
                  This account is suspended
                </Text>
                <Text style={styles.partnerSuspendedSub}>
                  {activeChat.otherName} cannot send or receive messages for{" "}
                  <Text style={{ fontWeight: "900", color: "#EF4444" }}>
                    {formatPartnerSuspensionTime()}
                  </Text>
                  . You cannot message them during this period.
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.chatBackground}>
            <FlatList
              ref={flatListRef}
              data={buildMessagesWithBanner()}
              inverted={true}
              keyExtractor={(item) => (item.id === 'reunion-banner' ? 'reunion-banner' : item.id)}
              ListFooterComponent={() => (
                <Animated.View style={[styles.introSection, { opacity: introAnim }]}>
                  {renderAvatar(activeChat.avatar, 90, true)}
                  <Text style={styles.introTitle}>
                    {activeChat.isSparked && activeChat.messages.length === 0 
                      ? `You sparked with ${activeChat.otherName}!` 
                      : `Spark with ${activeChat.otherName}`}
                  </Text>
                  <Text style={styles.introSub}>Start the conversation and let it glow!</Text>
                </Animated.View>
              )}
              renderItem={({ item }) => {
                if (item.type === 'banner') {
                  return (
                    <UnsparkedMsg 
                      onlyShowBanner={true} 
                      showReunionBanner={true} 
                      otherUserName={activeChat.otherName} 
                    />
                  );
                }

                const isMine = item.sender === user.id;
                if (item.isViolation && !isMine) return null;

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
                      style={[
                        styles.bubble, 
                        isMine ? styles.myBubble : styles.theirBubble,
                        item.isViolation && { borderStyle: 'dashed', borderColor: '#EF4444', backgroundColor: '#F8FAFC' }
                      ]}
                    >
                      {item.isViolation && <Text style={{fontSize: 9, fontWeight: '900', color: '#EF4444', marginBottom: 4}}>VIOLATION</Text>}
                      <Text style={[styles.msgText, item.isViolation && { color: '#94A3B8' }]}>{item.text}</Text>
                    </TouchableOpacity>
                    <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                );
              }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            />
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ width: '100%' }}
          >
            {/* ── If partner is suspended, show blocked input ── */}
            {partnerSuspension?.isSuspended ? (
              <View style={styles.blockedInputBar}>
                <Text style={styles.blockedInputText}>
                  🚫 Messaging unavailable — this account is currently suspended
                </Text>
              </View>
            ) : activeChat.isSparked ? (
                <View style={styles.inputBar}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Type your spark..." 
                    placeholderTextColor="#94A3B8"
                    value={inputText} 
                    onChangeText={setInputText} 
                  />
                  <TouchableOpacity 
                    style={[styles.sendBtn, !inputText.trim() && { opacity: 0.6 }]} 
                    onPress={sendMessage} 
                    disabled={!inputText.trim()}
                  >
                    <Text style={styles.sendBtnText}>SEND</Text>
                  </TouchableOpacity>
                </View>
            ) : (
              <UnsparkedMsg 
                otherUserName={activeChat.otherName} 
                isMeeUnsparked={activeChat.isMeeUnsparked} 
                onlyShowBanner={false}
                showReunionBanner={false}
                onSparkAgain={() => {
                  handleBackToList();
                  navigation.navigate('Match');
                }} 
              />
            )}
          </KeyboardAvoidingView>
        </View>
      )}

      {/* VIOLATION MODAL */}
      <Modal visible={violationModalVisible} transparent animationType="fade">
        <View style={styles.violationOverlay}>
          <View style={styles.violationCard}>
            <Text style={styles.violationTitle}>SPARK EXTINGUISHED!</Text>
            <Text style={styles.violationSub}>Your message was flagged for containing forbidden language:</Text>
            
            <View style={styles.violationWordBox}>
              <Text style={styles.violationWordsText}>{detectedWords.join(', ')}</Text>
            </View>

            <TouchableOpacity 
              style={styles.violationUnderstandBtn} 
              onPress={() => setViolationModalVisible(false)}
            >
              <Text style={styles.violationUnderstandText}>I UNDERSTAND</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setViolationModalVisible(false);
              setHistoryModalVisible(true);
            }}>
              <Text style={styles.viewHistoryText}>VIEW WARNINGS HISTORY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WarningsModal 
        visible={historyModalVisible} 
        onClose={() => setHistoryModalVisible(false)} 
        user={user} 
      />

      {/* ── SELF SUSPENSION MODAL ── */}
      <UserSuspensionModal
        visible={showSuspensionModal}
        user={user}
        onLogout={onLogout}
        onClose={() => setShowSuspensionModal(false)}
      />

      <RecentDelModal 
        visible={trashModalVisible}
        onClose={() => setTrashModalVisible(false)}
        user={user}
        deletedConversations={deletedConversations}
        setDeletedConversations={setDeletedConversations}
        renderAvatar={renderAvatar}
      />

      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoCoverWrapper}>
                {activeChat?.bgImage ? (
                   <Image source={{ uri: activeChat.bgImage }} style={styles.avatarFull} />
                ) : <View style={{flex:1, backgroundColor: '#E0E7FF'}} />}
            </View>

            <View style={styles.infoContent}>
              <View style={styles.infoAvatarFloating}>
                  {renderAvatar(activeChat?.avatar, 60, true)}
              </View>

              <Text style={styles.infoNameLarge}>{activeChat?.otherName}</Text>
              <Text style={styles.infoPurposeText}>Goal: {activeChat?.purpose}</Text>

              <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.infoSectionHeader}>PROFILE DETAILS</Text>
                <View style={styles.detailsGroup}>
                  <DetailRow label="Campus" value={activeChat?.campus} />
                  <DetailRow label="Course" value={activeChat?.course} />
                  <DetailRow label="Age" value={activeChat?.age} />
                  <DetailRow label="Location" value={activeChat?.address} />
                </View>

                <Text style={styles.infoSectionHeader}>IDEAL MATCH</Text>
                <View style={styles.detailsGroup}>
                  <DetailRow label="Campus" value={activeChat?.prefCampus} />
                  <DetailRow label="Course" value={activeChat?.prefCourse} />
                  <DetailRow label="Year" value={activeChat?.prefYear} />
                  <DetailRow label="Looking for" value={activeChat?.prefGender} />
                  <DetailRow label="Age Range" value={activeChat?.prefAge} />
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setInfoModalVisible(false)}>
                  <Text style={styles.infoCloseText}>CLOSE PROFILE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.fadeOverlay}>
            <View style={styles.imageMenuCard}>
              <View style={styles.imageMenuHeader}>
                <Text style={styles.imageMenuHeaderText}>CHAT SETTINGS</Text>
              </View>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { toggleReadStatus(selectedConvoId); setMenuVisible(false); }}>
                <Text style={styles.imageMenuTextBlue}>MARK AS READ / UNREAD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { setMenuVisible(false); setTimeout(() => setDeleteModalVisible(true), 300); }}>
                <Text style={styles.imageMenuTextRed}>DELETE CONVERSATION</Text>
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
                <Text style={styles.imageMenuTextBlue}>EDIT MESSAGE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuItem} onPress={() => { setMsgOptionsVisible(false); setMsgDeleteVisible(true); }}>
                <Text style={styles.imageMenuTextRed}>DELETE MESSAGE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageMenuClose} onPress={() => setMsgOptionsVisible(false)}>
                <Text style={styles.imageMenuTextGrey}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>EDIT SPARK</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{msgDeleteVisible ? 'DELETE MESSAGE?' : 'DELETE CHAT?'}</Text>
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
  activeChatOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: '#F8FAFF', 
    zIndex: 999 
  },
  container: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 3, borderColor: '#000', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, backgroundColor: '#C7D2FE', borderWidth: 2, borderColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  backIcon: { fontSize: 28, color: '#000', fontWeight: '900', marginTop: -4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTextWrap: { marginLeft: 12 },
  headerName: { fontSize: 16, fontWeight: '900', color: '#000' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, borderWidth: 1.5, borderColor: '#000' },
  statusText: { fontSize: 10, color: '#64748B', fontWeight: '800' },
  // Suspended partner badge in header
  suspendedBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1.5, borderColor: '#EF4444' },
  suspendedBadgeText: { fontSize: 9, fontWeight: '900', color: '#991B1B' },
  // Partner suspended banner (below header)
  partnerSuspendedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 2.5,
    borderColor: '#EF4444',
    padding: 14,
    gap: 10,
  },
  partnerSuspendedIcon: { fontSize: 22 },
  partnerSuspendedTitle: { fontSize: 13, fontWeight: '900', color: '#991B1B', marginBottom: 3 },
  partnerSuspendedSub: { fontSize: 11, fontWeight: '600', color: '#475569', lineHeight: 16 },
  // Blocked input bar
  blockedInputBar: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderTopWidth: 2.5,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  blockedInputText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
  },
  infoIconButton: { marginLeft: 8, width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  infoIconText: { fontSize: 11, fontWeight: '900', fontStyle: 'italic' },
  sectionTitleRow: { paddingHorizontal: 16, marginTop: 18, marginBottom: 8, alignItems: 'flex-start' },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1.5 },
  matchesContainer: { paddingBottom: 15 },
  matchesScroll: { paddingHorizontal: 16, marginTop: 5 },
  matchItem: { alignItems: 'center', marginRight: 20, width: 65, position: 'relative' },
  addMatchBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  addIcon: { fontSize: 30, fontWeight: '900', color: '#2563EB' },
  matchNameLabel: { fontSize: 11, fontWeight: '800', marginTop: 10, color: '#000' },
  thickDivider: { height: 3, backgroundColor: '#000', marginVertical: 10 },
  convoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 5 },
  convoTitleLarge: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 1 },
  trashBtn: { width: 36, height: 36, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#000', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, padding: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4 },
  rowRight: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontSize: 17, fontWeight: '900', color: '#000' },
  rowTime: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  moreBtn: { marginLeft: 10, paddingHorizontal: 5 },
  moreIcon: { fontSize: 20, fontWeight: '900', color: '#000' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rowMsg: { color: '#64748B', fontSize: 13, flex: 1, fontWeight: '600' },
  unreadBadge: { backgroundColor: '#DCFCE7', borderWidth: 2, borderColor: '#000', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  unreadText: { fontSize: 8, fontWeight: '900' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
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
  emptyText: { textAlign: 'center', marginTop: 100, color: '#94A3B8', fontWeight: '800' },
  infoModalCard: { width: '85%', height: 'auto', maxHeight: '85%', backgroundColor: '#fff', borderRadius: 25, borderWidth: 3, borderColor: '#000', overflow: 'hidden' },
  infoCoverWrapper: { height: 100, width: '100%', borderBottomWidth: 2, borderColor: '#000' },
  infoContent: { padding: 15, alignItems: 'center' },
  infoAvatarFloating: { marginTop: -45, marginBottom: 8, zIndex: 10 },
  infoNameLarge: { fontSize: 18, fontWeight: '900', color: '#000' },
  infoPurposeText: { fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  infoScroll: { width: '100%', maxHeight: 400 },
  infoSectionHeader: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1.2, marginBottom: 8, marginTop: 10 },
  detailsGroup: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#000', borderRadius: 15, padding: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  detailLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  detailValueBox: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#000', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '70%' },
  detailValueText: { fontSize: 9, fontWeight: '900', color: '#000' },
  infoCloseBtn: { marginTop: 15, width: '100%', backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 2, height: 2}, shadowOpacity: 1, shadowRadius: 0 },
  infoCloseText: { fontWeight: '900', fontSize: 11 },
  // Violation styles
  violationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  violationCard: { backgroundColor: '#fff', width: '88%', borderRadius: 30, padding: 28, alignItems: 'center', borderWidth: 3.5, borderColor: '#000' },
  violationTitle: { fontSize: 22, fontWeight: '900', color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  violationSub: { fontSize: 13, fontWeight: '700', color: '#475569', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  violationWordBox: { width: '100%', borderWidth: 2, borderColor: '#000', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 20, backgroundColor: '#FFF5F5', alignItems: 'center' },
  violationWordsText: { fontSize: 16, fontWeight: '900', color: '#EF4444', textAlign: 'center' },
  violationUnderstandBtn: { width: '100%', backgroundColor: '#EEF2FF', paddingVertical: 16, borderRadius: 15, alignItems: 'center', borderWidth: 2.5, borderColor: '#000', marginBottom: 16 },
  violationUnderstandText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  viewHistoryText: { fontSize: 12, fontWeight: '900', color: '#64748B', textDecorationLine: 'underline' },
});