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

const { height, width } = Dimensions.get('window');

const HomeScreen = ({ user, allUsers, onLogout, onUpdateUser, notifications: initialNotifications }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userAvatar, setUserAvatar] = useState("👤"); 
  const [localNotifications, setLocalNotifications] = useState(initialNotifications || []);
  
  const [pendingSpark, setPendingSpark] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  // NEW STATE FOR LOGOUT CONFIRMATION
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- PREFERENCE STATES ---
  const [tempPurpose, setTempPurpose] = useState(user.purpose || "");
  const [tempPrefCampus, setTempPrefCampus] = useState(user.prefCampus || "");
  const [tempPrefCourse, setTempPrefCourse] = useState(user.prefCourse || "");
  const [tempPrefYear, setTempPrefYear] = useState(user.prefYear || "");
  const [tempPrefGender, setTempPrefGender] = useState(user.prefGender || "");
  const [tempPrefAge, setTempPrefAge] = useState(user.prefAge || "");

  const campusCourses = {
    "Talisay": ["BSIT", "BSCE", "BSEd", "BSPsych", "BSHM", "BSArch"],
    "Alijis": ["BSIT", "BSEMC", "BSIS", "BSTCM"],
    "Fortune Town": ["BSBA", "BSOA", "BSEntrep", "BSCA"],
    "Binalbagan": ["BS Fisheries", "BS Agriculture", "BSEd", "BS Crim"],
    "Any": ["Any"]
  };

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
    const checkNewMessages = async () => {
      try {
        const data = await AsyncStorage.getItem(`@chat_meta_${user.id}`);
        if (data) {
          const parsed = JSON.parse(data);
          const unreadExists = parsed.some(chat => chat.unread === true);
          setHasNewMessage(activeTab !== 'Chat' ? unreadExists : false);
        }
      } catch (e) { console.log(e); }
    };
    const msgInterval = setInterval(checkNewMessages, 2000);
    return () => clearInterval(msgInterval);
  }, [user.id, activeTab]);

  const handleSavePreferences = async () => {
    if (!tempPurpose || !tempPrefCampus || !tempPrefCourse || !tempPrefGender || !tempPrefYear) {
      Alert.alert("Incomplete", "Please finish all fields.");
      return;
    }
    const updatedUser = { 
      ...user, purpose: tempPurpose, prefCampus: tempPrefCampus, 
      prefCourse: tempPrefCourse, prefYear: tempPrefYear, 
      prefGender: tempPrefGender, prefAge: tempPrefAge, avatar: userAvatar 
    };
    try {
      if (onUpdateUser) await onUpdateUser(updatedUser);
      setShowPreferences(false);
      Alert.alert("Success", "Preferences updated!");
    } catch (e) { Alert.alert("Error", "Failed to save."); }
  };

  // HANDLER TO SHOW LOGOUT QUESTION
  const handleLogoutPress = () => {
    setShowProfileMenu(false);
    setShowLogoutConfirm(true);
  };

  const navigateToChat = (partner) => {
    setChatPartner(partner); 
    setActiveTab('Chat');    
    setHasNewMessage(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home': return <FeedScreen user={user} userAvatar={userAvatar} />;
      case 'Match': return <MatchScreen user={user} allUsers={allUsers} userAvatar={userAvatar} onGoToChat={navigateToChat} />;
      case 'Chat': return <ChatScreen user={user} initialPartner={chatPartner} onClearPartner={() => setChatPartner(null)} navigation={{ navigate: setActiveTab }} />;

      case 'Profile': return <ProfileScreen user={user} onLogout={onLogout} userAvatar={userAvatar} onAvatarChange={handleAvatarChange} />;
      default: return <FeedScreen user={user} userAvatar={userAvatar} />;
    }
  };

  const DataItem = ({ label, value, isPassword = false }) => (
    <View style={styles.dataRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.dataLabel}>{label}</Text>
        <Text style={styles.dataValue}>
          {isPassword && securePassword ? "••••••••" : (value || "Not Provided")}
        </Text>
      </View>
      {isPassword && (
        <TouchableOpacity onPress={() => setSecurePassword(!securePassword)} style={styles.eyeBtn}>
          <Text style={styles.eyeIconText}>{securePassword ? "👁" : "×"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SelectionRow = ({ label, items, selected, onSelect }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {items.map(item => (
          <TouchableOpacity 
            key={item} 
            style={selected === item ? styles.chipSelected : styles.chip} 
            onPress={() => onSelect(item)}
          >
            <Text style={selected === item ? styles.chipTextSelected : styles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const navIcons = {
    Home: 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
    Match: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
    Chat: 'https://cdn-icons-png.flaticon.com/512/589/589708.png',
    Profile: 'https://cdn-icons-png.flaticon.com/512/1144/1144760.png'
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <TouchableOpacity onPress={() => setShowProfileMenu(true)} style={styles.stampedIconBtn}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1828/1828859.png' }} style={styles.headerIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* 3-LINE MENU MODAL */}
      <Modal visible={showProfileMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.sparkOptionsCard}>
            <View style={styles.sparkHeader}>
                <Text style={styles.sparkHeaderText}>OPTIONS</Text>
            </View>
            <TouchableOpacity style={styles.sparkItem} onPress={() => { setShowProfileMenu(false); setShowAccountDetails(true); }}>
              <Text style={styles.sparkTextMain}>ACCOUNT DETAILS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sparkItem} onPress={() => { setShowProfileMenu(false); setShowPreferences(true); }}>
              <Text style={styles.sparkTextMain}>EDIT PREFERENCES</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sparkItem, {borderBottomWidth: 0}]} onPress={handleLogoutPress}>
              <Text style={[styles.sparkTextMain, {color: '#FF5C5C'}]}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
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

      {/* ACCOUNT DETAILS MODAL */}
      <Modal visible={showAccountDetails} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.bottomSheet, { height: height * 0.9 }]}>
            <View style={styles.sheetHeaderLine} />
            <Text style={styles.sheetTitle}>Personal Account Information</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <DataItem label="University" value={user.selectedUni || "CHMSU"} />
              <DataItem label="Campus" value={user.campus || user.selectedCampus || "Talisay"} />
              <DataItem label="Course" value={user.userCourse || user.selectedCourse || "BSIT"} />
              <DataItem label="School ID" value={user.schoolId || "GKM07060600"} />
              <DataItem label="Full Name" value={`${user.firstName || "Keisha"} ${user.middleName || "Medina"} ${user.surname || "Galazan"}`.trim()} />
              <DataItem label="Birthday" value={user.birthdayText || "07-06-06"} />
              <DataItem label="Age" value={user.age || "19"} />
              <DataItem label="Address" value={user.address || "Bacolod City"} />
              <DataItem label="Email" value={user.email} />
              <DataItem label="Password" value={user.password} isPassword={true} />
              <View style={styles.privacyNote}>
                <Text style={styles.privacyNoteText}>🛡️ Your real identity is hidden. Your alias: <Text style={{fontWeight:'bold'}}>{user.anonName || "User"}</Text></Text>
              </View>
              <TouchableOpacity style={styles.closeActionBtn} onPress={() => setShowAccountDetails(false)}>
                <Text style={{fontWeight:'900', color: '#000'}}>BACK TO PROFILE</Text>
              </TouchableOpacity>
              <View style={{height: 40}} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT PREFERENCES MODAL */}
      <Modal visible={showPreferences} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.bottomSheet, { height: height * 0.9 }]}>
            <View style={styles.sheetHeaderLine} />
            <Text style={styles.sheetTitle}>Edit Match Preferences</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
                <SelectionRow 
                  label="I am looking for..." 
                  items={["Dating", "Friend/Company", "Study Buddy"]} 
                  selected={tempPurpose} 
                  onSelect={setTempPurpose} 
                />
                
                <SelectionRow 
                  label="Preferred Campus" 
                  items={["Talisay", "Alijis", "Fortune Town", "Binalbagan", "Any"]} 
                  selected={tempPrefCampus} 
                  onSelect={(val) => { 
                    setTempPrefCampus(val); 
                    if (val === "Any") setTempPrefCourse("Any"); 
                    else setTempPrefCourse(""); 
                  }} 
                />

                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.inputLabel}>Preferred Course</Text>
                  {tempPrefCampus === "Any" ? (
                    <View style={[styles.modalInput, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                      <Text style={{ color: '#64748B', fontWeight: '700' }}>Any</Text>
                    </View>
                  ) : (
                    Platform.OS === 'web' ? (
                      <select 
                        style={webStyles.select} 
                        value={tempPrefCourse} 
                        onChange={(e) => setTempPrefCourse(e.target.value)}
                      >
                        <option value="">Select Course</option>
                        {tempPrefCampus && campusCourses[tempPrefCampus]?.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <TextInput 
                        placeholder="Type preferred course..." 
                        style={styles.modalInput} 
                        value={tempPrefCourse} 
                        onChangeText={setTempPrefCourse} 
                      />
                    )
                  )}
                </View>

                <SelectionRow 
                  label="Preferred Year Level" 
                  items={["1st Year", "2nd Year", "3rd Year", "4th Year", "Any"]} 
                  selected={tempPrefYear} 
                  onSelect={setTempPrefYear} 
                />

                <SelectionRow 
                  label="Interested In" 
                  items={["Men", "Women", "Both"]} 
                  selected={tempPrefGender} 
                  onSelect={setTempPrefGender} 
                />

                <Text style={styles.inputLabel}>Age Range (Optional)</Text>
                <TextInput 
                  placeholder="e.g. 18-22" 
                  style={styles.modalInput} 
                  value={tempPrefAge} 
                  onChangeText={setTempPrefAge} 
                  keyboardType="numeric"
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={handleSavePreferences}>
                  <Text style={{color: '#fff', textAlign: 'center', fontWeight: '900'}}>SAVE CHANGES</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{marginTop: 20, marginBottom: 40, alignItems: 'center'}} 
                  onPress={() => setShowPreferences(false)}
                >
                  <Text style={{color: '#94A3B8', fontWeight: '900'}}>CANCEL</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NotificationModal 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={localNotifications} 
        setNotifications={setLocalNotifications}
        user={user} 
        setActiveTab={setActiveTab} 
      />

      {/* BOTTOM NAV BAR */}
      <View style={styles.bottomNav}>
        {['Home', 'Match', 'Chat', 'Profile'].map((tab) => {
            const isActive = activeTab === tab;
            return (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.navTab, isActive && styles.navTabActive]}>
                    <Image source={{ uri: navIcons[tab] }} style={[styles.navIcon, { tintColor: isActive ? '#000' : '#64748B' }]} />
                    <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>{tab.toUpperCase()}</Text>
                    {tab === 'Chat' && hasNewMessage && <View style={styles.chatBadgeDot} />}
                </TouchableOpacity>
            )
        })}
      </View>
    </SafeAreaView>
  );
};

const webStyles = {
  select: { 
    width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #000', 
    backgroundColor: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '10px', outline: 'none' 
  }
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
  sparkOptionsCard: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2, borderColor: '#000', overflow: 'hidden' },
  sparkHeader: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  sparkHeaderText: { fontWeight: '900', fontSize: 12, color: '#1E293B', letterSpacing: 1 },
  sparkItem: { paddingVertical: 18, alignItems: 'center', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  sparkTextMain: { fontWeight: '900', fontSize: 16, color: '#1E293B' },

  // LOGOUT CONFIRMATION BOX STYLES
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

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  sheetHeaderLine: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  sheetTitle: { fontSize: 20, fontWeight: '900', marginBottom: 25, color: '#000' },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dataLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  dataValue: { fontWeight: '700', color: '#000', fontSize: 15 },
  eyeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  eyeIconText: { fontSize: 16 },
  privacyNote: { backgroundColor: '#f0f9ff', padding: 15, borderRadius: 12, marginTop: 15 },
  privacyNoteText: { color: '#0369a1', fontSize: 12, textAlign: 'center' },
  closeActionBtn: { marginTop: 20, padding: 15, backgroundColor: '#FFD700', borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { 
    paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, 
    marginRight: 10, marginBottom: 10, borderWidth: 2, borderColor: '#E2E8F0' 
  },
  chipSelected: { 
    paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFD700', borderRadius: 12, 
    marginRight: 10, marginBottom: 10, borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0
  },
  chipText: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  chipTextSelected: { color: '#000', fontSize: 12, fontWeight: '900' },
  
  primaryBtn: { 
    backgroundColor: '#000', padding: 18, borderRadius: 15, marginTop: 15, 
    borderWidth: 2, borderColor: '#000' 
  },
  inputLabel: { fontSize: 12, fontWeight: '900', color: '#000', marginBottom: 8, textTransform: 'uppercase' },
  modalInput: { 
    backgroundColor: "#fff", padding: 14, borderRadius: 12, fontSize: 14, 
    borderWidth: 2, borderColor: "#000", color: '#000', fontWeight: '700' 
  }
});

export default HomeScreen;