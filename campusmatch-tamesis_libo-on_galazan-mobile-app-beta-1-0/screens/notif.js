import React, { useEffect, useState } from "react";
import { 
  View, StyleSheet, Text, TouchableOpacity, Modal, FlatList, Dimensions 
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

const NotificationModal = ({ 
  visible, 
  onClose, 
  notifications, 
  setNotifications, 
  pendingSpark,
  setPendingSpark,
  setActiveTab,
  user 
}) => {
  const [declinedInfo, setDeclinedInfo] = useState(null);
  const [acceptedInfo, setAcceptedInfo] = useState(null);

  useEffect(() => {
    let interval;
    if (visible) {
      refreshData();
      interval = setInterval(refreshData, 2000);
    }
    return () => clearInterval(interval);
  }, [visible]);

  const refreshData = async () => {
    try {
      const stored = await AsyncStorage.getItem('@sparks');
      if (stored) {
        const parsed = JSON.parse(stored);
        const myNotifs = parsed.filter(n => n.receiver_id === user?.id).reverse();
        if (JSON.stringify(myNotifs) !== JSON.stringify(notifications)) {
           setNotifications(myNotifs);
        }
      }
    } catch (e) {
      console.log("Error refreshing:", e);
    }
  };

  const markSpecificAsRead = async (notifId) => {
    try {
      const storedSparks = await AsyncStorage.getItem('@sparks');
      if (storedSparks) {
        const sparks = JSON.parse(storedSparks);
        const updatedSparks = sparks.map(s => 
          s.id === notifId ? { ...s, isRead: true, is_read: true } : s
        );
        await AsyncStorage.setItem('@sparks', JSON.stringify(updatedSparks));
        setNotifications(updatedSparks.filter(n => n.receiver_id === user?.id).reverse());
      }
    } catch (e) { 
      console.log("Error marking as seen:", e); 
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.status === 'declined_info') {
        await markSpecificAsRead(notif.id);
        setDeclinedInfo(notif); 
        return;
    }
    
    if (notif.status === 'accepted') {
        await markSpecificAsRead(notif.id);
        setAcceptedInfo(notif);
        return;
    }

    if (notif.status === 'declined') {
        await markSpecificAsRead(notif.id);
        return;
    }

    setPendingSpark(notif);
  };

  const handleAcceptSpark = async () => {
    try {
      if (!pendingSpark) return;

      const senderId = pendingSpark.sender_id; // person who sent the spark (the one I'm accepting)
      const myId = user?.id;                   // me (the one accepting)

      // ── 1. Update @sparks global list: mark the incoming notification as accepted ──
      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

      // Mark the original pending notification as accepted + read
      globalSparks = globalSparks.map(s =>
        s.id === pendingSpark.id
          ? { ...s, status: 'accepted', isRead: true, is_read: true }
          : s
      );

      // Add a reverse accepted record so the sender's ChatScreen can see theySparkedMe
      // (ChatScreen checks: globalSparks where sender_id === partner && receiver_id === me && status === 'accepted')
      const reverseAlreadyExists = globalSparks.some(
        s => s.sender_id === myId && s.receiver_id === senderId && s.status === 'accepted'
      );
      if (!reverseAlreadyExists) {
        globalSparks.push({
          id: Date.now().toString(),
          sender_id: myId,
          receiver_id: senderId,
          senderName: user?.anonName || user?.name || user?.firstName || "Someone",
          senderAvatar: user?.avatar || "👤",
          action: "accepted your spark! You are matched!",
          status: 'accepted',
          isRead: false,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      await AsyncStorage.setItem('@sparks', JSON.stringify(globalSparks));

      // ── 2. Update SENDER's personal spark list: pending → accepted ──
      // ChatScreen checks: sparks_${user.id} where receiver_id === partner && status === 'accepted'
      // The sender's entry in their own list is: { sender_id: senderId, receiver_id: myId, status: 'pending' }
      const senderSparksKey = `sparks_${senderId}`;
      const senderSparksJSON = await AsyncStorage.getItem(senderSparksKey);
      let senderSparks = senderSparksJSON ? JSON.parse(senderSparksJSON) : [];

      const senderIdx = senderSparks.findIndex(s => s.receiver_id === myId);
      if (senderIdx > -1) {
        senderSparks[senderIdx].status = 'accepted';
      } else {
        // Safety insert in case it's missing
        senderSparks.push({ sender_id: senderId, receiver_id: myId, status: 'accepted' });
      }
      await AsyncStorage.setItem(senderSparksKey, JSON.stringify(senderSparks));

      // ── 3. Update MY personal spark list: add accepted record pointing to sender ──
      // ChatScreen checks: sparks_${user.id} where receiver_id === partner && status === 'accepted'
      // I need an accepted entry in my own list pointing at the sender
      const mySparksKey = `sparks_${myId}`;
      const mySparksJSON = await AsyncStorage.getItem(mySparksKey);
      let mySparks = mySparksJSON ? JSON.parse(mySparksJSON) : [];

      const myIdx = mySparks.findIndex(s => s.receiver_id === senderId);
      if (myIdx > -1) {
        // Already have an entry (e.g. I previously sparked them) — update to accepted
        mySparks[myIdx].status = 'accepted';
      } else {
        // First time — insert accepted record
        mySparks.push({ sender_id: myId, receiver_id: senderId, status: 'accepted' });
      }
      await AsyncStorage.setItem(mySparksKey, JSON.stringify(mySparks));

      // ── 4. Handle re-spark reunion flag ──
      // If there's prior message history between us, set isReunion on both sides' chat meta
      const sharedChatKey = [myId, senderId].sort().join('_');
      const existingHistory = await AsyncStorage.getItem(`@msg_history_${sharedChatKey}`);
      const hasHistory = existingHistory && JSON.parse(existingHistory).length > 0;

      if (hasHistory) {
        // Set reunion flag on SENDER's chat meta so they see "The Spark is Back!" banner
        const senderMetaKey = `@chat_meta_${senderId}`;
        const senderMetaJSON = await AsyncStorage.getItem(senderMetaKey);
        let senderMeta = senderMetaJSON ? JSON.parse(senderMetaJSON) : [];
        const senderMetaIdx = senderMeta.findIndex(m => m.otherId === myId);
        if (senderMetaIdx > -1) {
          senderMeta[senderMetaIdx].isReunion = true;
        } else {
          senderMeta.push({ otherId: myId, isReunion: true, unread: false });
        }
        await AsyncStorage.setItem(senderMetaKey, JSON.stringify(senderMeta));

        // Set reunion flag on MY chat meta too
        const myMetaKey = `@chat_meta_${myId}`;
        const myMetaJSON = await AsyncStorage.getItem(myMetaKey);
        let myMeta = myMetaJSON ? JSON.parse(myMetaJSON) : [];
        const myMetaIdx = myMeta.findIndex(m => m.otherId === senderId);
        if (myMetaIdx > -1) {
          myMeta[myMetaIdx].isReunion = true;
        } else {
          myMeta.push({ otherId: senderId, isReunion: true, unread: false });
        }
        await AsyncStorage.setItem(myMetaKey, JSON.stringify(myMeta));
      }

      // ── 5. Legacy: keep @matches and @chats writes for backward compat ──
      const matchKey = `@matches_${user.email}`;
      const existingMatches = await AsyncStorage.getItem(matchKey);
      let parsedMatches = existingMatches ? JSON.parse(existingMatches) : [];
      if (!parsedMatches.find(m => m.id === senderId)) {
        parsedMatches.push({
          id: senderId,
          email: senderId,
          name: pendingSpark.senderName,
          avatar: pendingSpark.senderAvatar || "👤"
        });
        await AsyncStorage.setItem(matchKey, JSON.stringify(parsedMatches));
      }

      const chatData = await AsyncStorage.getItem(`@chats_${user.email}`);
      let parsedChats = chatData ? JSON.parse(chatData) : [];
      const chatExists = parsedChats.find(c => c.otherId === senderId);
      if (!chatExists) {
        parsedChats.push({
          otherId: senderId,
          otherName: pendingSpark.senderName,
          avatar: pendingSpark.senderAvatar || "👤",
          lastMessage: `You and ${pendingSpark.senderName} have matched!`,
          timestamp: new Date().toISOString(),
          unread: true
        });
        await AsyncStorage.setItem(`@chats_${user.email}`, JSON.stringify(parsedChats));
      }

      // ── 6. Refresh notification list and show accepted banner ──
      const finalSparks = await AsyncStorage.getItem('@sparks');
      const finalParsed = finalSparks ? JSON.parse(finalSparks) : [];
      setNotifications(finalParsed.filter(n => n.receiver_id === myId).reverse());
      setAcceptedInfo(pendingSpark);
      setPendingSpark(null);

    } catch (e) { 
      console.log("Error accepting spark:", e); 
    }
  };

  const handleDeclineSpark = async () => {
    try {
      if (pendingSpark) {
        const storedSparks = await AsyncStorage.getItem('@sparks');
        const sparks = storedSparks ? JSON.parse(storedSparks) : [];
        const updatedSparks = sparks.map(s => 
          s.id === pendingSpark.id ? { ...s, status: 'declined', isRead: true, is_read: true } : s
        );

        const declineNotification = {
          id: Date.now() + 1,
          sender_id: user?.id,
          senderName: user?.name || "Someone",
          receiver_id: pendingSpark.sender_id,
          status: 'declined_info', 
          action: `declined your spark.`,
          time: new Date().toISOString(),
          isRead: false
        };

        updatedSparks.push(declineNotification);
        await AsyncStorage.setItem('@sparks', JSON.stringify(updatedSparks));
        setNotifications(updatedSparks.filter(n => n.receiver_id === user?.id).reverse());
      }
    } catch (e) { 
        console.log("Error declining spark:", e); 
    }
    setPendingSpark(null);
  };

  const markAsSeenAndClose = async () => {
    if (pendingSpark) { await markSpecificAsRead(pendingSpark.id); }
    setPendingSpark(null);
  };

  const getRelativeTime = (timeValue) => {
    if (!timeValue) return "just now";
    const now = new Date();
    const past = new Date(timeValue);
    if (isNaN(past.getTime())) return timeValue;
    const diffInSeconds = Math.floor((now - past) / 1000);
    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}hr ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
          <View style={[styles.bottomSheet, { height: height * 0.65 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList 
              data={notifications}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.notifItem, (item.isRead || item.is_read) && { opacity: 0.6 }]} 
                  onPress={() => handleNotificationClick(item)}
                >
                  <View style={styles.notifAvatar}>
                      <Text style={{fontSize: 20}}>{item.status === 'accepted' ? '💖' : item.status === 'declined' || item.status === 'declined_info' ? '☁️' : '✨'}</Text>
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.notifText} numberOfLines={2}>
                        <Text style={{ fontWeight: '900' }}>{item.senderName}</Text> {
                          item.status === 'accepted' ? "is now your match!" : 
                          item.status === 'declined' ? "spark was declined by you." :
                          item.status === 'declined_info' ? "declined your spark." :
                          (item.action || "sent you a spark!")
                        }
                      </Text>
                      {(item.isRead || item.is_read) && (
                        <View style={styles.seenBadge}><Text style={styles.seenText}>Seen</Text></View>
                      )}
                    </View>
                    <Text style={styles.notifTime}>{getRelativeTime(item.created_at || item.time)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        {/* SPARK CARD MESSAGE BOX (CONFIRMATION) */}
        <Modal visible={!!pendingSpark} transparent animationType="fade">
            <View style={styles.sparkOverlay}>
                <View style={styles.sparkCard}>
                    <TouchableOpacity style={styles.cardCloseBtn} onPress={markAsSeenAndClose}>
                        <Text style={styles.cardCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.sparkIconCircle}><Text style={{fontSize: 28}}>✨</Text></View>
                    <Text style={styles.sparkTitle}>New Spark Found!</Text>
                    <Text style={styles.sparkDescription}>
                        <Text style={{fontWeight: '900', color: '#000'}}>{pendingSpark?.senderName}</Text> has a spark on you. Would you like to match?
                    </Text>
                    <View style={styles.sparkActionRow}>
                        <TouchableOpacity style={styles.sparkDeclineBtn} onPress={handleDeclineSpark}>
                            <Text style={styles.sparkDeclineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sparkAcceptBtn} onPress={handleAcceptSpark}>
                            <Text style={styles.sparkAcceptText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* DECLINED INFO MESSAGE BOX */}
        <Modal visible={!!declinedInfo} transparent animationType="fade">
            <View style={styles.sparkOverlay}>
                <View style={styles.sparkCard}>
                    <TouchableOpacity style={styles.cardCloseBtn} onPress={() => setDeclinedInfo(null)}>
                        <Text style={styles.cardCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.sparkIconCircle}><Text style={{fontSize: 28}}>🌊</Text></View>
                    <Text style={styles.sparkTitle}>Don't look back!</Text>
                    <Text style={styles.sparkDescription}>
                        <Text style={{fontWeight: '900', color: '#000'}}>{declinedInfo?.senderName}</Text> isn't the one. There are plenty of fishes in the sea!
                    </Text>
                    <TouchableOpacity style={[styles.sparkAcceptBtn, { width: '100%' }]} onPress={() => setDeclinedInfo(null)}>
                        <Text style={styles.sparkAcceptText}>Understood</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* ACCEPTED MATCH INFO MESSAGE BOX */}
        <Modal visible={!!acceptedInfo} transparent animationType="fade">
            <View style={styles.sparkOverlay}>
                <View style={styles.sparkCard}>
                    <TouchableOpacity style={styles.cardCloseBtn} onPress={() => setAcceptedInfo(null)}>
                        <Text style={styles.cardCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.sparkIconCircle}><Text style={{fontSize: 28}}>💖</Text></View>
                    <Text style={styles.sparkTitle}>You are Matched!</Text>
                    <Text style={styles.sparkDescription}>
                        You and <Text style={{fontWeight: '900', color: '#000'}}>{acceptedInfo?.senderName}</Text> are connected. Go to chat to create a spark!
                    </Text>
                    <TouchableOpacity 
                        style={[styles.sparkAcceptBtn, { width: '100%' }]} 
                        onPress={async () => {
                            const chatParams = {
                                id: acceptedInfo.sender_id,
                                name: acceptedInfo.senderName,
                                avatar: acceptedInfo.senderAvatar || "👤"
                            };
                            
                            await AsyncStorage.setItem('@pending_chat', JSON.stringify(chatParams));
                            
                            setAcceptedInfo(null);
                            onClose();
                            
                            setActiveTab('Chat');
                        }}
                    >
                        <Text style={styles.sparkAcceptText}>Go to Chat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { 
    backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20,
    borderWidth: 3, borderColor: '#000', borderBottomWidth: 0,
  },
  sheetHandle: { width: 45, height: 6, backgroundColor: '#000', alignSelf: 'center', marginBottom: 15, borderRadius: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, width: '100%' },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#000' },
  closeButton: { 
    padding: 8, backgroundColor: '#fff', borderWidth: 3, borderColor: '#000', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, elevation: 3
  },
  closeX: { fontSize: 18, color: '#000', fontWeight: '900' },
  notifItem: { 
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 16, backgroundColor: '#fff', 
    borderRadius: 20, borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, elevation: 4
  },
  notifAvatar: { 
    width: 50, height: 50, borderRadius: 15, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' 
  },
  notifText: { fontSize: 13, color: '#000', flex: 1, paddingRight: 8, lineHeight: 18, fontWeight: '600' },
  notifTime: { fontSize: 10, color: '#000', marginTop: 4, fontWeight: '800', opacity: 0.6 },
  seenBadge: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: '#000' },
  seenText: { fontSize: 9, fontWeight: '900', color: '#000' },
  sparkOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sparkCard: { 
    backgroundColor: '#fff', width: '90%', maxWidth: 320, borderRadius: 25, padding: 25, alignItems: 'center', position: 'relative',
    borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, elevation: 8
  },
  cardCloseBtn: { 
    position: 'absolute', right: 8, top: 8, padding: 8, zIndex: 999,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, elevation: 5
  },
  cardCloseText: { fontSize: 12, color: '#000', fontWeight: '900' },
  sparkIconCircle: { 
    width: 65, height: 65, borderRadius: 20, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#000' 
  },
  sparkTitle: { fontSize: 20, fontWeight: '900', color: '#000', marginBottom: 8 },
  sparkDescription: { fontSize: 14, color: '#000', textAlign: 'center', lineHeight: 20, marginBottom: 20, fontWeight: '500' },
  sparkActionRow: { flexDirection: 'row', width: '100%', gap: 12 },
  sparkDeclineBtn: { 
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', 
    alignItems: 'center', borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1
  },
  sparkDeclineText: { color: '#000', fontWeight: '900', fontSize: 13 },
  sparkAcceptBtn: { 
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', 
    alignItems: 'center', borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1
  },
  sparkAcceptText: { color: '#000', fontWeight: '900', fontSize: 13 }
});

export default NotificationModal;