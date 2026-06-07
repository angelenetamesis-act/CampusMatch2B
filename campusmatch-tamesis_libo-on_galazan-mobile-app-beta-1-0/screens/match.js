import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, 
  TouchableOpacity, SafeAreaView, ActivityIndicator,
  LayoutAnimation, Platform, UIManager, Modal, TouchableWithoutFeedback, Alert, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const campusCourses = {
  "Talisay": ["BS Information Technology", "BS Science in Civil Engineering", "BS Education", "BS Psychology", "BS Hospitality Management", "BS Architecture"],
  "Alijis": ["BS Information Technology", "BS Information Systems", "BT-Vocational Teacher Education", "BS Engineering", "Bachelor of Industrial Technology"],
  "Fortune Town": ["BS Business Administration", "BS Office Administration", "BS Entrepreneurship", "BS Customs Administration"],
  "Binalbagan": ["BS Fisheries", "BS Agriculture", "Bachelor of Secondary Education", "BS Criminology"],
};

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
            <View style={styles.expandedHeaderDecor}>
               {item.bgImage ? (
                  <Image source={{ uri: item.bgImage }} style={styles.headerImageFull} />
               ) : null}
            </View>
            
            <TouchableOpacity onPress={onToggle} style={styles.closeBtnAbsolute}>
                <View style={styles.backArrowWrapper}>
                  <Text style={{color: '#000', fontSize: 28, fontWeight: '900', transform: [{rotate: '90deg'}]}}>‹</Text>
                </View>
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
  const [myBgImage, setMyBgImage] = useState(null);

  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterMenu, setFilterMenu] = useState('main'); // 'main', 'campus', 'course', 'year', 'gender', 'age'
  const [activeFilters, setActiveFilters] = useState({ 
    campus: 'Any', 
    course: 'Any', 
    year: 'Any', 
    gender: 'Any', 
    age: 'Any' 
  });
  const filterIconRef = useRef();

  useEffect(() => {
    loadLocalData();
    const interval = setInterval(loadLocalData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadLocalData = async () => {
    try {
      const savedMyBg = await AsyncStorage.getItem(`@bg_${user.email}`);
      if (savedMyBg) setMyBgImage(savedMyBg);
      const allUsersJSON = await AsyncStorage.getItem('@users_db');
      let allUsers = allUsersJSON ? JSON.parse(allUsersJSON) : [];
      const sparksJSON = await AsyncStorage.getItem(`sparks_${user.id}`);
      let mySparks = sparksJSON ? JSON.parse(sparksJSON) : [];
      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

      const sparkedIds = mySparks.filter(s => s.status === 'pending').map(s => s.receiver_id);
      setSentSparks(sparkedIds);

      const displayUsers = allUsers
        .filter(p => p.email !== user.email) 
        .map(p => {
          const iSparkedThem = mySparks.some(s => s.receiver_id === p.id && s.status === 'accepted');
          const theySparkedMe = globalSparks.some(
            s => s.sender_id === p.id && s.receiver_id === user.id && s.status === 'accepted'
          );
          const isMatched = iSparkedThem && theySparkedMe;
          return { ...p, course: p.course || p.userCourse, avatar: p.avatar || p.profileImage || '👤', bgImage: p.bgImage || null, isMatched };
        });
      setSyncedUsers(displayUsers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredUsers = useMemo(() => {
    let list = [...syncedUsers];
    if (activeTab === 'match') {
      list = list.filter(other => (user.purpose?.toLowerCase() === other.purpose?.toLowerCase()));
      if (activeFilters.campus !== 'Any') list = list.filter(u => u.campus === activeFilters.campus);
      if (activeFilters.course !== 'Any') list = list.filter(u => u.course === activeFilters.course);
      if (activeFilters.year !== 'Any') list = list.filter(u => u.year === activeFilters.year);
      if (activeFilters.gender !== 'Any') list = list.filter(u => u.gender === activeFilters.gender);
      if (activeFilters.age !== 'Any') list = list.filter(u => u.age === activeFilters.age);
    }
    return list;
  }, [activeTab, syncedUsers, user, activeFilters]);

  const renderFilterOptions = () => {
    switch (filterMenu) {
      case 'campus':
        return ['Talisay', 'Alijis', 'Fortune Town', 'Binalbagan', 'Any'].map(c => (
          <TouchableOpacity key={c} style={styles.menuItem} onPress={() => { setActiveFilters({...activeFilters, campus: c, course: 'Any'}); setFilterMenu('main'); }}>
            <Text style={styles.menuText}>{c}</Text>
          </TouchableOpacity>
        ));
      case 'course':
        const courses = activeFilters.campus === 'Any' ? [] : [...campusCourses[activeFilters.campus], 'Any'];
        return courses.length === 0 ? <Text style={styles.menuText}>Select Campus First</Text> : courses.map(c => (
          <TouchableOpacity key={c} style={styles.menuItem} onPress={() => { setActiveFilters({...activeFilters, course: c}); setFilterMenu('main'); }}>
            <Text style={styles.menuText}>{c}</Text>
          </TouchableOpacity>
        ));
      case 'year':
        return ['1', '2', '3', '4', 'Any'].map(y => (
          <TouchableOpacity key={y} style={styles.menuItem} onPress={() => { setActiveFilters({...activeFilters, year: y}); setFilterMenu('main'); }}>
            <Text style={styles.menuText}>{y}</Text>
          </TouchableOpacity>
        ));
      case 'gender':
        return ['Male', 'Female', 'Any'].map(g => (
          <TouchableOpacity key={g} style={styles.menuItem} onPress={() => { setActiveFilters({...activeFilters, gender: g}); setFilterMenu('main'); }}>
            <Text style={styles.menuText}>{g}</Text>
          </TouchableOpacity>
        ));
      case 'age':
        return ['18-60', 'Any'].map(a => (
          <TouchableOpacity key={a} style={styles.menuItem} onPress={() => { setActiveFilters({...activeFilters, age: a}); setFilterMenu('main'); }}>
            <Text style={styles.menuText}>{a}</Text>
          </TouchableOpacity>
        ));
      default:
        return ['Campus', 'Course', 'Year', 'Gender', 'Age'].map(f => (
          <TouchableOpacity key={f} style={styles.menuItem} onPress={() => setFilterMenu(f.toLowerCase())}>
            <Text style={styles.menuText}>{f}: {activeFilters[f.toLowerCase()]}</Text>
          </TouchableOpacity>
        ));
    }
  };

  // ─────────────────────────────────────────────
  // FIXED: handleSpark — sends spark to target user
  // ─────────────────────────────────────────────
  const handleSpark = async (targetUser) => {
    try {
      const myId = user?.id;
      const targetId = targetUser?.id;
      if (!myId || !targetId) return;

      // 1. Update MY personal sparks list (sparks_${myId})
      const mySparksKey = `sparks_${myId}`;
      const mySparksJSON = await AsyncStorage.getItem(mySparksKey);
      let mySparks = mySparksJSON ? JSON.parse(mySparksJSON) : [];

      // Prevent duplicate pending spark
      const alreadySent = mySparks.some(s => s.receiver_id === targetId && s.status === 'pending');
      if (alreadySent) return;

      const newSparkEntry = {
        id: Date.now().toString(),
        sender_id: myId,
        receiver_id: targetId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      mySparks.push(newSparkEntry);
      await AsyncStorage.setItem(mySparksKey, JSON.stringify(mySparks));

      // 2. Add notification to global @sparks list so target user sees it in their Notifications
      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];

      // Prevent duplicate notification
      const notifAlreadyExists = globalSparks.some(
        s => s.sender_id === myId && s.receiver_id === targetId && s.status === 'pending'
      );
      if (!notifAlreadyExists) {
        const notification = {
          id: Date.now().toString() + '_notif',
          sender_id: myId,
          receiver_id: targetId,
          senderName: user?.anonName || user?.name || user?.firstName || "Someone",
          senderAvatar: user?.avatar || "👤",
          action: "sent you a spark!",
          status: 'pending',
          isRead: false,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        globalSparks.push(notification);
        await AsyncStorage.setItem('@sparks', JSON.stringify(globalSparks));
      }

      // 3. Update local sentSparks state so UI reflects immediately
      setSentSparks(prev => [...prev, targetId]);

      // 4. Show success popup
      setShowSparkSuccess(true);

    } catch (e) {
      console.log("Error sending spark:", e);
    }
  };

  // ─────────────────────────────────────────────
  // FIXED: handleCancelSpark — cancels a pending spark
  // ─────────────────────────────────────────────
  const handleCancelSpark = async (targetUser) => {
    try {
      const myId = user?.id;
      const targetId = targetUser?.id;
      if (!myId || !targetId) return;

      // 1. Remove/update from MY personal sparks list
      const mySparksKey = `sparks_${myId}`;
      const mySparksJSON = await AsyncStorage.getItem(mySparksKey);
      let mySparks = mySparksJSON ? JSON.parse(mySparksJSON) : [];
      mySparks = mySparks.filter(s => !(s.receiver_id === targetId && s.status === 'pending'));
      await AsyncStorage.setItem(mySparksKey, JSON.stringify(mySparks));

      // 2. Remove the pending notification from global @sparks list
      const globalSparksJSON = await AsyncStorage.getItem('@sparks');
      let globalSparks = globalSparksJSON ? JSON.parse(globalSparksJSON) : [];
      globalSparks = globalSparks.filter(
        s => !(s.sender_id === myId && s.receiver_id === targetId && s.status === 'pending')
      );
      await AsyncStorage.setItem('@sparks', JSON.stringify(globalSparks));

      // 3. Update local sentSparks state so UI reflects immediately
      setSentSparks(prev => prev.filter(id => id !== targetId));

    } catch (e) {
      console.log("Error cancelling spark:", e);
    }
  };

  const handleToggle = (userId) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedUserId(prevId => (prevId === userId ? null : userId)); };

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
        
        <View style={[styles.discoverHeader, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
          <Text style={styles.screenTitle}>{activeTab === 'uni' ? 'UNIVERSITY FEED' : 'COMPATIBLE WITH YOU'}</Text>
          {activeTab === 'match' && (
            <TouchableOpacity ref={filterIconRef} style={styles.filterIconBtn} onPress={() => setShowFilterModal(true)}>
              <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2040/2040523.png'}} style={{width: 20, height: 20}} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
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
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
      />

      {/* SPARK SUCCESS MODAL */}
      <Modal visible={showSparkSuccess} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.sparkIconCircleLarge}>
              <Text style={{ fontSize: 32 }}>✨</Text>
            </View>
            <Text style={styles.alertTitleLarge}>Spark Sent!</Text>
            <Text style={styles.alertSubTitle}>
              Your spark has been sent! Wait for them to accept your spark.
            </Text>
            <TouchableOpacity
              style={styles.alertPrimaryBtn}
              onPress={() => setShowSparkSuccess(false)}
            >
              <Text style={styles.alertBtnTextLarge}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PASS CONFIRM MODAL */}
      <Modal visible={showPassConfirm} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.sparkIconCircleLarge}>
              <Text style={{ fontSize: 32 }}>🌊</Text>
            </View>
            <Text style={styles.alertTitleLarge}>Pass on this one?</Text>
            <Text style={styles.alertSubTitle}>
              Are you sure you want to pass on{' '}
              <Text style={{ fontWeight: '900', color: '#000' }}>
                {passTarget?.anonName || passTarget?.firstName || "this user"}
              </Text>
              ?
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.btnNo]}
                onPress={() => { setShowPassConfirm(false); setPassTarget(null); }}
              >
                <Text style={styles.confirmBtnText}>No, Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.btnYes]}
                onPress={() => { setShowPassConfirm(false); setPassTarget(null); }}
              >
                <Text style={[styles.confirmBtnText, { color: '#B71C1C' }]}>Yes, Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} transparent animationType="none">
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.filterModalOverlay}>
            <View style={styles.filterModalCard}>
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>FILTER</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}><Text style={{fontWeight: '900'}}>X</Text></TouchableOpacity>
              </View>
              {renderFilterOptions()}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterIconBtn: { padding: 8, borderWidth: 2, borderColor: '#000', borderRadius: 8, backgroundColor: '#fff', elevation: 2 },
  filterModalOverlay: { flex: 1, paddingTop: 140, paddingRight: 20, alignItems: 'flex-end' },
  filterModalCard: { width: 180, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 10, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, paddingBottom: 5 },
  filterModalTitle: { fontWeight: '900', fontSize: 12 },
  menuItem: { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  menuText: { fontSize: 11, fontWeight: '700' },
  
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
    borderBottomWidth: 2, borderColor: '#000',
    overflow: 'hidden'
  },
  headerImageFull: { width: '100%', height: '100%' }, 
  rowLayout: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { 
    width: 48, height: 48, borderRadius: 14, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000', overflow: 'hidden' 
  },
  infoContainer: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  centeredLayout: { alignItems: 'center', width: '100%' },
  closeBtnAbsolute: { position: 'absolute', right: 5, top: 5, padding: 5, zIndex: 99 },
  backArrowWrapper: {
    backgroundColor: 'rgba(255,255,255,0.9)', 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5
  },
  avatarCircleLarge: { 
    width: 100, height: 100, borderRadius: 50, 
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
  passBtn: { backgroundColor: '#FFEBEE' }, 
  sparkBtn: { backgroundColor: '#E8F5E9' }, 
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
  modalHeaderDecor: { 
    position: 'absolute', top: 0, left: 0, right: 0, 
    height: SCREEN_HEIGHT * 0.14, 
    backgroundColor: '#E8F5E9', overflow: 'hidden',
    borderBottomWidth: 2, borderColor: '#000'
  },
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