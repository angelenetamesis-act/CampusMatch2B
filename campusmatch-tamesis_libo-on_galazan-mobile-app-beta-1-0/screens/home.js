import React, { useState, useEffect } from "react";
import { 
  View, StyleSheet, SafeAreaView, TouchableOpacity, 
  Text, Image, Modal, Dimensions, ScrollView, TextInput, Alert, Platform 
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import FeedScreen from "./feed";
import MatchScreen from "./match";
import ChatScreen from "./chat";
import ProfileScreen from "./profile";
import NotificationModal from "./notif"; 
import SettingsScreen from "../settings/settings";

const { height, width } = Dimensions.get('window');

const HomeScreen = ({ user, allUsers, onLogout, onUpdateUser, notifications: initialNotifications }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userAvatar, setUserAvatar] = useState("👤"); 
  const [localNotifications, setLocalNotifications] = useState(initialNotifications || []);
  
  // NEW STATES FOR GLOBAL BADGES
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [hasNewMatch, setHasNewMatch] = useState(false);

  const [pendingSpark, setPendingSpark] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const savedAvatar = await AsyncStorage.getItem(`@avatar_${user.email}`);
        if (savedAvatar) setUserAvatar(savedAvatar);
      } catch (e) { console.log("Error loading avatar:", e); }
    };
    if (user?.email) loadAvatar();
  }, [user.email]);

  const handleAvatarChange = async (newAvatar) => {
    setUserAvatar(newAvatar);
    try {
      await AsyncStorage.setItem(`@avatar_${user.email}`, newAvatar);
      const allUsersJSON = await AsyncStorage.getItem('@users_db');
      if (allUsersJSON) {
        let usersDb = JSON.parse(allUsersJSON);
        const userIndex = usersDb.findIndex(u => u.email === user.email);
        if (userIndex !== -1) {
          usersDb[userIndex].avatar = newAvatar;
          await AsyncStorage.setItem('@users_db', JSON.stringify(usersDb));
        }
      }
      if (onUpdateUser) onUpdateUser({ ...user, avatar: newAvatar });
    } catch (e) { console.log("Error saving avatar:", e); }
  };

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        // Check Messages
        const chatData = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
        if (chatData) {
          const parsed = JSON.parse(chatData);
          const unreadExists = parsed.some(chat => chat.unread === true);
          setHasNewMessage(activeTab !== 'Chat' ? unreadExists : false);
        }

        // Check New Feed/Matches (Assuming you store flags in Async)
        const feedFlag = await AsyncStorage.getItem(`@new_feed_${user.id}`);
        setHasNewFeed(feedFlag === 'true');
        
        const matchFlag = await AsyncStorage.getItem(`@new_match_${user.id}`);
        setHasNewMatch(matchFlag === 'true');

      } catch (e) { console.log(e); }
    };
    const interval = setInterval(checkUpdates, 2000);
    return () => clearInterval(interval);
  }, [user.id, activeTab]);

  const handleLogoutPress = () => {
    setShowSettings(false);
    setShowLogoutConfirm(true);
  };

  const handleForcedLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) onLogout();
  };

  const navigateToChat = (partner) => {
    setChatPartner(partner); 
    setActiveTab('Chat');    
    setHasNewMessage(false);
  };

  const renderContent = () => {
    if (showSettings) {
      return (
        <SettingsScreen 
          user={user} 
          onBack={() => setShowSettings(false)} 
          onLogout={handleLogoutPress}
          onUpdateUser={onUpdateUser}
        />
      );
    }

    switch (activeTab) {
      case 'Home':
        return (
          <FeedScreen
            user={user}
            userAvatar={userAvatar}
            navigation={{ navigate: setActiveTab }}
            onLogout={handleForcedLogout}
          />
        );
      case 'Match':
        return (
          <MatchScreen
            user={user}
            allUsers={allUsers}
            userAvatar={userAvatar}
            onGoToChat={navigateToChat}
          />
        );
      case 'Chat':
        return (
          <ChatScreen 
            user={user} 
            initialPartner={chatPartner} 
            onClearPartner={() => setChatPartner(null)} 
            navigation={{ navigate: setActiveTab }} 
            onChatOpen={(partner) => setChatPartner(partner)}
            onLogout={handleForcedLogout}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen
            user={user}
            onLogout={onLogout}
            userAvatar={userAvatar}
            onAvatarChange={handleAvatarChange}
          />
        );
      default:
        return (
          <FeedScreen
            user={user}
            userAvatar={userAvatar}
            navigation={{ navigate: setActiveTab }}
            onLogout={handleForcedLogout}
          />
        );
    }
  };

  const navIcons = {
    Home: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
    Match: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
    Chat: 'https://cdn-icons-png.flaticon.com/512/589/589708.png',
    Profile: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'
  };

  return (
    <SafeAreaView style={styles.container}>
      {!(activeTab === 'Chat' && chatPartner) && !showSettings && (
        <View style={styles.topHeader}>
          <Text style={styles.logoText}>CampusMatch</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {activeTab !== 'Profile' && (
              <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.stampedIconBtn}>
                  <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png' }} style={styles.headerIcon} />
                  {localNotifications.some(n => !n.isRead && !n.is_read) && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            )}
            {activeTab === 'Profile' && (
              <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.stampedIconBtn}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2040/2040504.png' }} style={styles.headerIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>{renderContent()}</View>

      <Modal visible={showLogoutConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Logout?</Text>
            <Text style={styles.confirmSub}>Are you sure you want to end your session?</Text>
            <View style={styles.confirmActionRow}>
              <TouchableOpacity style={styles.confirmBtnNo} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.confirmBtnTextNo}>No, Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnYes} onPress={onLogout}>
                <Text style={styles.confirmBtnTextYes}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={localNotifications} 
        setNotifications={setLocalNotifications}
        pendingSpark={pendingSpark}
        setPendingSpark={setPendingSpark}
        user={user} 
        setActiveTab={(tab, partner = null) => {
          setActiveTab(tab);
          if (partner) setChatPartner(partner);
        }} 
      />

      {!(activeTab === 'Chat' && chatPartner !== null) && !showSettings && (
        <View style={styles.bottomNav}>
          {['Home', 'Match', 'Chat', 'Profile'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                  <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.navTab, isActive && styles.navTabActive]}>
                      <Image source={{ uri: navIcons[tab] }} style={[styles.navIcon, { tintColor: isActive ? '#000' : '#64748B' }]} />
                      <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>{tab.toUpperCase()}</Text>
                      {tab === 'Chat' && hasNewMessage && <View style={styles.chatBadgeDot} />}
                      {tab === 'Home' && hasNewFeed && <View style={styles.chatBadgeDot} />}
                      {tab === 'Match' && hasNewMatch && <View style={styles.chatBadgeDot} />}
                  </TouchableOpacity>
              )
          })}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  topHeader: { 
    height: 65, flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#fff' 
  },
  logoText: { fontSize: 24, fontWeight: '900', color: '#000', letterSpacing: -1.2 },
  stampedIconBtn: {
    backgroundColor: '#fff', padding: 8, borderRadius: 12, borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  headerIcon: { width: 20, height: 20 },
  notifBadge: { position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5C5C', borderWidth: 1.5, borderColor: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: {
    width: width * 0.8, backgroundColor: '#fff', borderRadius: 25, 
    borderWidth: 3, borderColor: '#000', padding: 25, alignItems: 'center'
  },
  confirmTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10, color: '#000' },
  confirmSub: { fontSize: 14, fontWeight: '700', color: '#64748B', textAlign: 'center', marginBottom: 25 },
  confirmActionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  confirmBtnNo: { 
    flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 12, 
    borderWidth: 2, borderColor: '#000', backgroundColor: '#F1F5F9' 
  },
  confirmBtnYes: { 
    flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 12, 
    borderWidth: 2, borderColor: '#000', backgroundColor: '#FF5C5C' 
  },
  confirmBtnTextNo: { textAlign: 'center', fontWeight: '900', color: '#000' },
  confirmBtnTextYes: { textAlign: 'center', fontWeight: '900', color: '#fff' },
  bottomNav: {
    height: 55, marginHorizontal: 15, marginBottom: Platform.OS === 'ios' ? 25 : 15,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 15, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4
  },
  navTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navTabActive: { backgroundColor: '#FFD700' }, 
  navIcon: { width: 18, height: 18, marginBottom: 2 },
  navTabText: { fontSize: 10, fontWeight: '900', color: '#64748B' },
  navTabTextActive: { color: '#000' },
  chatBadgeDot: { position: 'absolute', top: 10, right: 20, width: 7, height: 7, backgroundColor: '#FF5C5C', borderRadius: 3.5, borderWidth: 1, borderColor: '#000' },
});

export default HomeScreen;