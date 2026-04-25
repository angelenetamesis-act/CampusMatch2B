import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, 
  TouchableOpacity, SafeAreaView, ActivityIndicator,
  LayoutAnimation, Platform, UIManager, Modal, TouchableWithoutFeedback, Alert, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Optimized helper for subtle, non-overpowering UI accents
const getPastelColor = (index) => {
  const colors = ['#E1F5FE', '#E8F5E9', '#F3E5F5', '#FFF3E0', '#F1F8E9'];
  return colors[index % colors.length];
};

const PreferenceRow = ({ label, value }) => (
  <View style={styles.prefRow}>
    <Text style={styles.prefLabel}>{label}</Text>
    <View style={styles.prefValueCapsule}>
        <Text style={styles.prefValueText} numberOfLines={2}>{value || "Not Set"}</Text>
    </View>
  </View>
);

const UserCard = ({ item, index, isExpanded, onToggle, onSpark, onPassAttempt, onCancelSpark, hasSentSpark, onGoToChat }) => {
  const formatGenderPref = (val) => {
    if (!val || val.toLowerCase() === 'any') return "Both Men and Women";
    return val;
  };

  return (
    <View style={[styles.cardWrapper, isExpanded && styles.cardWrapperExpanded]}>
      <View style={[styles.mainCard, isExpanded && styles.mainCardExpanded]}>
        {!isExpanded ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onToggle} style={styles.rowLayout}>
            <View style={[styles.avatarCircle, { backgroundColor: '#FFFFFF' }]}>
                {typeof item.avatar === 'string' && (item.avatar.startsWith('http') || item.avatar.startsWith('data:image')) ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarEmoji}>{item.avatar || '👤'}</Text>
                )}
            </View>
            <View style={styles.infoContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.userName}>{item.anonName || item.firstName || "Anonymous"}</Text>
                {item.isMatched ? (
                  <View style={styles.matchedBadgeSmall}>
                    <Text style={styles.matchedBadgeTextSmall}>MATCHED ✨</Text>
                  </View>
                ) : hasSentSpark && (
                  <View style={styles.sentBadgeSmall}>
                    <Text style={styles.sentBadgeTextSmall}>PENDING</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subText}>Looking for {item.purpose || "Friendship"}</Text>
            </View>
            <Text style={{color: '#000', fontSize: 24, fontWeight: '900'}}>›</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.centeredLayout}>
            <View style={styles.expandedHeaderDecor} />
            
            <TouchableOpacity onPress={onToggle} style={styles.closeBtnAbsolute}>
                <Text style={{color: '#000', fontSize: 28, fontWeight: '900', transform: [{rotate: '90deg'}]}}>‹</Text>
            </TouchableOpacity>
            
            <View style={[styles.avatarCircleLarge, { backgroundColor: '#FFFFFF' }]}>
                {typeof item.avatar === 'string' && (item.avatar.startsWith('http') || item.avatar.startsWith('data:image')) ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarEmojiLarge}>{item.avatar || '👤'}</Text>
                )}
            </View>

            <Text style={styles.userNameLarge}>{item.anonName || item.firstName || "Anonymous"}</Text>
            
            {item.isMatched ? (
               <View style={styles.matchedBadgeLarge}>
                 <Text style={styles.matchedBadgeTextLarge}>MATCHED! ✨</Text>
               </View>
            ) : hasSentSpark && (
              <View style={styles.sentBadgeLarge}>
                <Text style={styles.sentBadgeTextLarge}>✨ SPARK PENDING</Text>
              </View>
            )}

            <Text style={styles.userBioLarge}>Searching for {item.purpose || "Friendship"}</Text>

            <View style={styles.compactDetailsSection}>
              <Text style={styles.dropdownHeaderLeft}>USER DETAILS</Text>
              <PreferenceRow label="Campus" value={item.campus} />
              <PreferenceRow label="Course" value={item.course} />
              <PreferenceRow label="Age" value={item.age} />
              <PreferenceRow label="Address" value={item.address} />
            </View>

            <View style={styles.dividerLine} />

            <View style={styles.compactDetailsSection}>
              <Text style={styles.dropdownHeaderLeft}>MATCHING PREFERENCES</Text>
              <PreferenceRow label="Goal" value={item.purpose} />
              <PreferenceRow label="Campus" value={item.prefCampus || item.campus} />
              <PreferenceRow label="Course" value={item.prefCourse || item.course} />
              <PreferenceRow label="Year" value={item.prefYear || item.year} />
              <PreferenceRow label="Interested In" value={formatGenderPref(item.prefGender)} />
              <PreferenceRow label="Ages" value={item.prefAge} />
            </View>

            <View style={[styles.cardActions, item.isMatched && { flexDirection: 'column' }]}>
              {item.isMatched ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.goToChatBtn]} 
                  onPress={() => onGoToChat(item)}
                >
                  <Text style={styles.goToChatText}>GO TO CHAT</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {hasSentSpark ? (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.cancelSparkBtn]} 
                      onPress={() => onCancelSpark(item)}
                    >
                      <Text style={styles.cancelSparkText}>CANCEL SPARK</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.passBtn]} 
                      onPress={() => onPassAttempt(item)}
                    >
                      <Text style={styles.passText}>PASS</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.sparkBtn, hasSentSpark && styles.sparkBtnDisabled]} 
                    onPress={() => !hasSentSpark && onSpark(item)}
                    disabled={hasSentSpark}
                  >
                    <Text style={styles.sparkText}>{hasSentSpark ? "WAITING..." : "CREATE SPARK"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            
            <TouchableOpacity style={styles.closeBtnProfile} onPress={onToggle}>
                <Text style={styles.closeBtnText}>CLOSE PROFILE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default function MatchScreen({ user, userAvatar, onGoToChat }) {
  const [syncedUsers, setSyncedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('uni'); 
  const [sentSparks, setSentSparks] = useState([]); 
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [showSparkSuccess, setShowSparkSuccess] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [passTarget, setPassTarget] = useState(null);

  useEffect(() => {
    loadLocalData();
    const interval = setInterval(loadLocalData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadLocalData = async () => {
    try {
      const allUsersJSON = await AsyncStorage.getItem('@users_db');
      let allUsers = allUsersJSON ? JSON.parse(allUsersJSON) : [];
      
      const sparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
      let mySparks = sparksJSON ? JSON.parse(sparksJSON) : [];

      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

      const sparkedIds = mySparks.filter(s => s.status === 'pending').map(s => s.receiver_id);
      
      const matchedIdsFromMyList = mySparks.filter(s => s.status === 'accepted').map(s => s.receiver_id);
      const matchedIdsFromGlobal = globalSparks
        .filter(s => (s.receiver_id === user.id || s.sender_id === user.id) && s.status === 'accepted')
        .map(s => s.sender_id === user.id ? s.receiver_id : s.sender_id);

      const allMatchedIds = [...new Set([...matchedIdsFromMyList, ...matchedIdsFromGlobal])];

      setSentSparks(sparkedIds);
      const displayUsers = allUsers
        .filter(p => p.email !== user.email) 
        .map(p => ({
          ...p,
          course: p.course || p.userCourse,
          avatar: p.avatar || p.profileImage || '👤',
          isMatched: allMatchedIds.includes(p.id)
        }));
      setSyncedUsers(displayUsers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSpark = async (targetUser) => {
  try {
    const sparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
    let mySparks = sparksJSON ? JSON.parse(sparksJSON) : [];
    
    if (mySparks.some(s => s.receiver_id === targetUser.id)) return;

    mySparks.push({ sender_id: user.id, receiver_id: targetUser.id, status: 'pending' });
    await AsyncStorage.setItem(`sparks_${user.id}`, JSON.stringify(mySparks));

    const globalSparksJSON = await AsyncStorage.getItem('@sparks');
    let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];
    
    const newNotif = {
      id: Date.now().toString(),
      sender_id: user.id,
      receiver_id: targetUser.id, 
      senderName: user.anonName || user.firstName || "Someone",
      action: "sent you a spark!",
      status: 'pending',
      isRead: false,
      created_at: new Date().toISOString(),
    };

    globalSparks.push(newNotif);
    await AsyncStorage.setItem('@sparks', JSON.stringify(globalSparks));

    setSentSparks(prev => [...prev, targetUser.id]);
    setShowSparkSuccess(true);
  } catch (err) {
    console.error("Spark Error:", err);
  }
};

  const handleCancelSpark = async (targetUser) => {
    try {
      const sparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
      let mySparks = sparksJSON ? JSON.parse(sparksJSON) : [];
      const filteredSparks = mySparks.filter(s => s.receiver_id !== targetUser.id);
      await AsyncStorage.setItem(`sparks_${user.id}`, JSON.stringify(filteredSparks));
      
      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];
      const filteredGlobal = globalSparks.filter(s => !(s.sender_id === user.id && s.receiver_id === targetUser.id));
      await AsyncStorage.setItem('@sparks', JSON.stringify(filteredGlobal));

      setSentSparks(prev => prev.filter(id => id !== targetUser.id));
    } catch (err) { Alert.alert("Error", "Could not update."); }
  };

  const filteredUsers = useMemo(() => {
    let baseList = [...syncedUsers];
    if (activeTab === 'uni') return baseList;
    return baseList.filter(other => (user.purpose?.toLowerCase() === other.purpose?.toLowerCase()));
  }, [activeTab, syncedUsers, user]);

  const handleToggle = (userId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedUserId(prevId => (prevId === userId ? null : userId));
  };

  const formatGenderPref = (val) => {
    if (!val || val.toLowerCase() === 'any') return "Both Men and Women";
    return val;
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#000" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.facebookStyleHeader}>
        <View style={styles.selfHeader}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setModalVisible(true)}>
            <View style={styles.myAvatarCircle}>
              {userAvatar?.startsWith('http') || userAvatar?.startsWith('data:image') ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : ( <Text style={{ fontSize: 36 }}>{userAvatar || '👤'}</Text> )}
            </View>
          </TouchableOpacity>
          <View style={styles.myTextInfo}>
            <Text style={styles.myName}>{user.anonName || user.firstName || "Me"}</Text>
            <Text style={styles.subText}>Looking for <Text style={{color: '#2E7D32', fontWeight: '900'}}>{user.purpose || "Friendship"}</Text></Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'uni' && styles.activeTab]} onPress={() => setActiveTab('uni')}>
            <Text style={[styles.tabText, activeTab === 'uni' && styles.activeTabText]}>UNI-VERSE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'match' && styles.activeTabMatch]} onPress={() => setActiveTab('match')}>
            <Text style={[styles.tabText, activeTab === 'match' && styles.activeTabText]}>BEST MATCHES</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />
        
        <View style={styles.discoverHeader}>
          <Text style={styles.screenTitle}>{activeTab === 'uni' ? 'UNIVERSITY FEED' : 'COMPATIBLE WITH YOU'}</Text>
          <Text style={styles.screenSub}>Everyone in the campus is here</Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <UserCard 
            item={item} 
            index={index}
            isExpanded={expandedUserId === item.id} 
            onToggle={() => handleToggle(item.id)} 
            onSpark={handleSpark}
            onCancelSpark={handleCancelSpark}
            onPassAttempt={(u) => { setPassTarget(u); setShowPassConfirm(true); }}
            onGoToChat={onGoToChat}
            hasSentSpark={sentSparks.includes(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found in this category.</Text>}
      />

      {/* Confirmation Modal for Pass Button */}
      <Modal visible={showPassConfirm} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitleLarge}>ARE YOU SURE?</Text>
            <Text style={styles.alertSubTitle}>Are you sure you want to remove this user from your possible matches?</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity 
                style={[styles.confirmBtn, styles.btnNo]} 
                onPress={() => setShowPassConfirm(false)}
              >
                <Text style={styles.confirmBtnText}>NO</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, styles.btnYes]} 
                onPress={() => setShowPassConfirm(false)}
              >
                <Text style={styles.confirmBtnText}>YES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Spark Sent Success Modal */}
      <Modal visible={showSparkSuccess} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.sparkIconCircleLarge}>
                <Text style={{fontSize: 40}}>✨</Text>
            </View>
            <Text style={styles.alertTitleLarge}>SPARK SENT!</Text>
            <Text style={styles.alertSubTitle}>Your interest has been delivered. Now we wait for the magic to happen!</Text>
            <TouchableOpacity 
                style={styles.alertPrimaryBtn} 
                onPress={() => setShowSparkSuccess(false)}
                activeOpacity={0.8}
            >
              <Text style={styles.alertBtnTextLarge}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* My Profile Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
                <View style={styles.modalHeaderDecor} />
                <View style={styles.centeredLayout}>
                  <View style={[styles.avatarCircleLarge, { backgroundColor: '#fff' }]}>
                    {userAvatar?.startsWith('http') || userAvatar?.startsWith('data:image') ? (
                      <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
                    ) : ( <Text style={{ fontSize: 42 }}>{userAvatar || '👤'}</Text> )}
                  </View>
                  <Text style={styles.userNameLarge}>MY PROFILE</Text>
                  <Text style={styles.userStatusSub}>Managing your match preferences</Text>
                  
                  <View style={styles.elegantPrefsWrapper}>
                    <Text style={styles.dropdownHeaderLeft}>MATCHING PREFERENCES</Text>
                    <PreferenceRow label="Goal" value={user.purpose} />
                    <PreferenceRow label="Campus" value={user.prefCampus || user.campus} />
                    <PreferenceRow label="Course" value={user.course || user.userCourse} />
                    <PreferenceRow label="Year" value={user.prefYear || user.year} />
                    <PreferenceRow label="Interested In" value={formatGenderPref(user.prefGender)} />
                    <PreferenceRow label="Ages" value={user.prefAge} />
                  </View>

                  <TouchableOpacity style={styles.closeBtnModal} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9FF' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  facebookStyleHeader: { 
    backgroundColor: '#fff', 
    borderBottomWidth: 1.5, 
    borderColor: '#000',
    paddingTop: 10,
    zIndex: 10
  },
  headerDivider: { height: 1.5, backgroundColor: '#000', width: '100%', marginBottom: 12 },
  selfHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  myAvatarCircle: { 
    width: 54, height: 54, 
    borderRadius: 27, 
    backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 2, borderColor: '#000', 
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  myTextInfo: { marginLeft: 12, flex: 1 },
  myName: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: 0.5 },
  subText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tabButton: { 
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', 
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#000' 
  },
  activeTab: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' }, 
  activeTabMatch: { backgroundColor: '#E0E7FF', borderColor: '#3F51B5' }, 
  tabText: { fontWeight: '900', color: '#1E293B', fontSize: 11, letterSpacing: 1 },
  activeTabText: { color: '#000' },
  discoverHeader: { paddingHorizontal: 16, paddingBottom: 12 },
  screenTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  screenSub: { fontSize: 10, color: '#94A3B8', marginTop: 1, fontWeight: '700' },
  
  cardWrapper: { marginBottom: 12 },
  cardWrapperExpanded: { marginBottom: 16 },
  mainCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 14, 
    borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 
  },
  mainCardExpanded: { width: '100%', elevation: 4, paddingBottom: 20 },
  expandedHeaderDecor: { 
    position: 'absolute', top: -14, left: -14, right: -14, 
    height: 80, backgroundColor: '#F1F8E9', 
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    borderBottomWidth: 2, borderColor: '#000'
  },
  rowLayout: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { 
    width: 48, height: 48, borderRadius: 14, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000', overflow: 'hidden' 
  },
  infoContainer: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  centeredLayout: { alignItems: 'center', width: '100%' },
  closeBtnAbsolute: { position: 'absolute', right: 0, top: 0, padding: 10, zIndex: 10 },
  avatarCircleLarge: { 
    width: 80, height: 80, borderRadius: 40, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000', marginBottom: 10, overflow: 'hidden',
    zIndex: 5
  },
  userNameLarge: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  userStatusSub: { fontSize: 10, color: '#94A3B8', marginBottom: 10, fontWeight: '700' },
  userBioLarge: { fontSize: 12, color: '#455A64', fontWeight: '900', marginBottom: 12, textTransform: 'uppercase' },
  
  compactDetailsSection: { 
    width: '100%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, 
    borderWidth: 2, borderColor: '#000' 
  },
  elegantPrefsWrapper: { 
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 14, 
    borderWidth: 2, borderColor: '#000' 
  },
  dropdownHeaderLeft: { fontSize: 10, fontWeight: '900', color: '#000', marginBottom: 8, letterSpacing: 0.5 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  prefLabel: { fontSize: 11, color: '#64748B', fontWeight: '800', marginTop: 4 },
  prefValueCapsule: { 
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, 
    borderWidth: 1.5, borderColor: '#000', maxWidth: '65%'
  },
  prefValueText: { fontSize: 10, fontWeight: '900', color: '#000', textAlign: 'right' },
  dividerLine: { width: '100%', height: 2, backgroundColor: '#000', marginVertical: 12, opacity: 0.08 },
  
  cardActions: { flexDirection: 'row', marginTop: 12, gap: 8, width: '100%' },
  actionBtn: { 
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', 
    borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  passBtn: { backgroundColor: '#FFEBEE' }, // Soft Red
  sparkBtn: { backgroundColor: '#E8F5E9' }, // Soft Green
  passText: { color: '#B71C1C', fontWeight: '900', fontSize: 11 },
  sparkText: { color: '#1B5E20', fontWeight: '900', fontSize: 11 },

  closeBtnProfile: {
    marginTop: 15, width: '100%', paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F5F5F5', alignItems: 'center', 
    borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { 
    width: '90%', backgroundColor: '#fff', borderRadius: 25, padding: 16, 
    borderWidth: 3, borderColor: '#000', overflow: 'hidden' 
  },
  modalHeaderDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 50, backgroundColor: '#E8F5E9' },
  closeBtnModal: { 
    marginTop: 15, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 12, 
    backgroundColor: '#F5F5F5', borderWidth: 2, borderColor: '#000' 
  },
  closeBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
  
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 22 },
  avatarEmojiLarge: { fontSize: 38 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontWeight: '800', fontSize: 12 },
  
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertCard: { 
    backgroundColor: '#fff', width: '100%', borderRadius: 25, padding: 25, 
    alignItems: 'center', borderWidth: 3, borderColor: '#000' 
  },
  sparkIconCircleLarge: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#000' 
  },
  alertTitleLarge: { fontSize: 20, fontWeight: '900', color: '#000', marginBottom: 10 },
  alertSubTitle: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20, fontWeight: '600' },
  alertPrimaryBtn: { 
    width: '100%', paddingVertical: 14, borderRadius: 15, backgroundColor: '#E8F5E9', 
    alignItems: 'center', borderWidth: 2, borderColor: '#2E7D32',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 
  },
  alertBtnTextLarge: { color: '#1B5E20', fontWeight: '900', fontSize: 14 },
  
  cancelSparkBtn: { backgroundColor: '#F5F5F5' },
  cancelSparkText: { color: '#616161', fontWeight: '900', fontSize: 11 },
  
  sentBadgeSmall: { backgroundColor: '#F5F5F5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, marginLeft: 6, borderWidth: 1, borderColor: '#000' },
  sentBadgeTextSmall: { color: '#757575', fontSize: 8, fontWeight: '900' },
  sentBadgeLarge: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12, borderWidth: 2, borderColor: '#000' },
  sentBadgeTextLarge: { color: '#757575', fontSize: 10, fontWeight: '900' },
  
  matchedBadgeSmall: { backgroundColor: '#E8F5E9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, marginLeft: 6, borderWidth: 1, borderColor: '#2E7D32' },
  matchedBadgeTextSmall: { color: '#1B5E20', fontSize: 8, fontWeight: '900' },
  matchedBadgeLarge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12, borderWidth: 2, borderColor: '#2E7D32' },
  matchedBadgeTextLarge: { color: '#1B5E20', fontSize: 10, fontWeight: '900' },
  
  goToChatBtn: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  goToChatText: { color: '#1B5E20', fontWeight: '900', fontSize: 12 },
  sparkBtnDisabled: { backgroundColor: '#F5F5F5', opacity: 0.6, borderColor: '#BDBDBD' },

  confirmRow: { flexDirection: 'row', gap: 8, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  btnNo: { backgroundColor: '#F5F5F5' },
  btnYes: { backgroundColor: '#FFEBEE', borderColor: '#B71C1C' },
  confirmBtnText: { fontWeight: '900', color: '#000', fontSize: 12 },
});