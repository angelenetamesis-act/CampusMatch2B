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
    await markSpecificAsRead(notif.id);
    
    if (notif.status === 'declined_info') {
        setDeclinedInfo(notif); 
        return;
    }
    
    if (notif.status === 'accepted') {
        onClose();
        setActiveTab('Chat');
        return;
    }

    if (notif.status === 'declined') {
        return;
    }

    // This opens the Spark Card Message Box
    setPendingSpark(notif);
  };

  const handleAcceptSpark = async () => {
    try {
      if (pendingSpark) {
        const storedSparks = await AsyncStorage.getItem('@sparks');
        const sparks = storedSparks ? JSON.parse(storedSparks) : [];
        
        const updatedSparks = sparks.map(s => 
          s.id === pendingSpark.id ? { ...s, status: 'accepted', isRead: true, is_read: true } : s
        );
        await AsyncStorage.setItem('@sparks', JSON.stringify(updatedSparks));

        const matchKey = `@matches_${user.email}`;
        const existingMatches = await AsyncStorage.getItem(matchKey);
        let parsedMatches = existingMatches ? JSON.parse(existingMatches) : [];
        
        if (!parsedMatches.find(m => m.email === pendingSpark.sender_id)) {
            parsedMatches.push({
                id: pendingSpark.sender_id,
                email: pendingSpark.sender_id,
                name: pendingSpark.senderName,
                avatar: pendingSpark.senderAvatar || "👤"
            });
            await AsyncStorage.setItem(matchKey, JSON.stringify(parsedMatches));
        }

        const chatData = await AsyncStorage.getItem(`@chats_${user.email}`);
        let parsedChats = chatData ? JSON.parse(chatData) : [];
        
        const chatExists = parsedChats.find(c => c.otherId === pendingSpark.sender_id);
        if (!chatExists) {
            parsedChats.push({
                otherId: pendingSpark.sender_id,
                otherName: pendingSpark.senderName,
                avatar: pendingSpark.senderAvatar || "👤",
                lastMessage: `You and ${pendingSpark.senderName} have created a spark! You can now talk with each other.`,
                timestamp: new Date().toISOString(),
                unread: true
            });
            await AsyncStorage.setItem(`@chats_${user.email}`, JSON.stringify(parsedChats));
        }
        setNotifications(updatedSparks.filter(n => n.receiver_id === user?.id).reverse());
      }
    } catch (e) { console.log("Error accepting spark:", e); }
    
    // CLOSE ALL AND NAVIGATE TO CHAT
    setPendingSpark(null);
    onClose(); 
    setActiveTab('Chat'); 
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
    } catch (e) { console.log("Error declining spark:", e); }
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
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: '#000', fontWeight: '800' }}>No new notifications</Text>
                </View>
              }
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

        {/* SPARK CARD MESSAGE BOX */}
        <Modal visible={!!pendingSpark} transparent animationType="fade">
            <View style={styles.sparkOverlay}>
                <View style={styles.sparkCard}>
                    <TouchableOpacity style={styles.cardCloseBtn} onPress={markAsSeenAndClose}>
                        <Text style={styles.cardCloseText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.sparkIconCircle}><Text style={{fontSize: 35}}>✨</Text></View>
                    <Text style={styles.sparkTitle}>New Spark Found!</Text>
                    <Text style={styles.sparkDescription}>
                        <Text style={{fontWeight: '900', color: '#000'}}>{pendingSpark?.senderName}</Text> has a spark on you. 
                        {"\n"}Would you like to accept and proceed to chat?
                    </Text>
                    <View style={styles.sparkActionRow}>
                        <TouchableOpacity style={styles.sparkDeclineBtn} onPress={handleDeclineSpark}>
                            <Text style={styles.sparkDeclineText}>No, Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sparkAcceptBtn} onPress={handleAcceptSpark}>
                            <Text style={styles.sparkAcceptText}>Yes, Proceed</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* DECLINED INFO MESSAGE BOX */}
        <Modal visible={!!declinedInfo} transparent animationType="fade">
            <View style={styles.sparkOverlay}>
                <View style={styles.sparkCard}>
                    <View style={styles.sparkIconCircle}><Text style={{fontSize: 35}}>🌊</Text></View>
                    <Text style={styles.sparkTitle}>Don't look back!</Text>
                    <Text style={styles.sparkDescription}>
                        <Text style={{fontWeight: '900', color: '#000'}}>{declinedInfo?.senderName}</Text> isn't the one this time. 
                        {"\n\n"}But don't worry, there are plenty of fishes in the sea!
                    </Text>
                    <TouchableOpacity style={[styles.sparkAcceptBtn, { width: '100%' }]} onPress={() => setDeclinedInfo(null)}>
                        <Text style={styles.sparkAcceptText}>I know, thank you!</Text>
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
  notifText: { fontSize: 14, color: '#000', flex: 1, paddingRight: 8, lineHeight: 20, fontWeight: '600' },
  notifTime: { fontSize: 11, color: '#000', marginTop: 4, fontWeight: '800', opacity: 0.6 },
  seenBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 2, borderColor: '#000' },
  seenText: { fontSize: 10, fontWeight: '900', color: '#000' },
  sparkOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  sparkCard: { 
    backgroundColor: '#fff', width: '100%', borderRadius: 30, padding: 30, alignItems: 'center', position: 'relative',
    borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, elevation: 8
  },
  cardCloseBtn: { 
    position: 'absolute', right: 15, top: 15, padding: 8,
    backgroundColor: '#fff', borderWidth: 3, borderColor: '#000', borderRadius: 12
  },
  cardCloseText: { fontSize: 16, color: '#000', fontWeight: '900' },
  sparkIconCircle: { 
    width: 85, height: 85, borderRadius: 25, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#000' 
  },
  sparkTitle: { fontSize: 26, fontWeight: '900', color: '#000', marginBottom: 12 },
  sparkDescription: { fontSize: 16, color: '#000', textAlign: 'center', lineHeight: 24, marginBottom: 30, fontWeight: '500' },
  sparkActionRow: { flexDirection: 'row', width: '100%', gap: 15 },
  sparkDeclineBtn: { 
    flex: 1, paddingVertical: 16, borderRadius: 15, backgroundColor: '#fff', 
    alignItems: 'center', borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1
  },
  sparkDeclineText: { color: '#000', fontWeight: '900' },
  sparkAcceptBtn: { 
    flex: 1, paddingVertical: 16, borderRadius: 15, backgroundColor: '#fff', 
    alignItems: 'center', borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1
  },
  sparkAcceptText: { color: '#000', fontWeight: '900' }
});

export default NotificationModal;