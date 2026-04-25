import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, FlatList, Modal, KeyboardAvoidingView, Platform,
  Animated, ScrollView, Dimensions
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ user, userAvatar, onAvatarChange }) => {
  const [myPosts, setMyPosts] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [showPrefs, setShowPrefs] = useState(false); 
  const [bio, setBio] = useState("");
  const [bgImage, setBgImage] = useState("https://i.pinimg.com/1200x/f9/1b/fc/f91bfc1a9425e643a9f369edfe578f18.jpg");
  
  const [localAvatar, setLocalAvatar] = useState(userAvatar);

  const [showPostOptions, setShowPostOptions] = useState(false);
  const [showCommentOptions, setShowCommentOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [activePostId, setActivePostId] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [editText, setEditText] = useState("");

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [newComment, setNewComment] = useState("");
  
  const [optionsPosition, setOptionsPosition] = useState({ top: 0, right: 0 });
  const touchableRefs = useRef({});

  const rollAnim = useRef(new Animated.Value(0)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const avatars = ["🦁", "🐯", "🪶", "🐼", "🍓","🧸", "🪐", "🎧", "🐼", "🐨", "🐸", "🐧", "🦄", "📜", "🐙", "🐝", "🦖", "🦥", "🐲", "🤖", "🚀", "🍕"];

  useEffect(() => {
    if (userAvatar) {
      setLocalAvatar(userAvatar);
    }
  }, [userAvatar]);

  const fetchMyPosts = useCallback(async () => {
    try {
        const storedPosts = await AsyncStorage.getItem('@all_sparks');
        const allPosts = storedPosts ? JSON.parse(storedPosts) : [];
        
        const filtered = allPosts.filter(p => 
            p.user_id === user?.email && p.expiryTime > Date.now()
        );
        const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
        setMyPosts(sorted);

        if (activeCommentPost) {
          const updated = allPosts.find(p => p.id === activeCommentPost.id);
          if (updated) setActiveCommentPost(updated);
        }
    } catch (e) { console.log("Profile Fetch Error:", e); }
  }, [user?.email, activeCommentPost?.id]);

  useEffect(() => {
    if (user?.email) {
      loadProfile();
      fetchMyPosts();
    }
    const timer = setInterval(() => {
        setNow(Date.now());
        fetchMyPosts();
    }, 5000);
    return () => clearInterval(timer);
  }, [user, fetchMyPosts]);

  const loadProfile = async () => {
    try {
        const savedBio = await AsyncStorage.getItem(`@bio_${user.email}`);
        const savedBg = await AsyncStorage.getItem(`@bg_${user.email}`);
        if (savedBio) setBio(savedBio);
        if (savedBg) setBgImage(savedBg);
    } catch (e) { console.log(e); }
  };

  const rollAvatar = async () => {
    Animated.sequence([
      Animated.timing(rollAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(rollAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();

    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    setLocalAvatar(randomAvatar);
    if(onAvatarChange) onAvatarChange(randomAvatar);

    try {
        const storedPosts = await AsyncStorage.getItem('@all_sparks');
        if (storedPosts) {
            let allPosts = JSON.parse(storedPosts);
            allPosts = allPosts.map(p => {
                let updatedPost = p.user_id === user?.email ? { ...p, userAvatar: randomAvatar } : p;
                if (updatedPost.comments) {
                    updatedPost.comments = updatedPost.comments.map(c => 
                        c.user_id === user?.email ? { ...c, userAvatar: randomAvatar } : c
                    );
                }
                return updatedPost;
            });
            await AsyncStorage.setItem('@all_sparks', JSON.stringify(allPosts));
            fetchMyPosts(); 
        }
    } catch (e) { console.log(e); }
  };

  const handleUpdateAction = async () => {
    if (!editText.trim()) return;
    try {
      const stored = await AsyncStorage.getItem('@all_sparks');
      let currentPosts = stored ? JSON.parse(stored) : [];
      
      let updated;
      if (activeCommentId) {
          updated = currentPosts.map(p => ({
              ...p,
              comments: p.comments.map(c => c.id === activeCommentId ? { ...c, content: editText } : c)
          }));
      } else {
          updated = currentPosts.map(p => p.id === activePostId ? { ...p, content: editText } : p);
      }

      await AsyncStorage.setItem('@all_sparks', JSON.stringify(updated));
      setShowEditModal(false);
      setEditText("");
      setActiveCommentId(null);
      fetchMyPosts();
    } catch (e) { console.error(e); }
  };

  const handleDeleteAction = async () => {
    try {
      const stored = await AsyncStorage.getItem('@all_sparks');
      const currentPosts = stored ? JSON.parse(stored) : [];
      
      let updated;
      if (activeCommentId) {
          updated = currentPosts.map(p => ({
              ...p,
              comments: p.comments.filter(c => c.id !== activeCommentId)
          }));
      } else {
          updated = currentPosts.filter(p => p.id !== activePostId);
      }

      await AsyncStorage.setItem('@all_sparks', JSON.stringify(updated));
      setShowDeleteModal(false);
      setActiveCommentId(null);
      fetchMyPosts();
    } catch (e) { console.error(e); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const stored = await AsyncStorage.getItem('@all_sparks');
      let allPosts = stored ? JSON.parse(stored) : [];
      
      const commentObj = {
        id: Date.now().toString(),
        user_id: user?.email,
        userName: user?.anonName || "Anonymous",
        userAvatar: localAvatar, 
        content: newComment,
        timestamp: Date.now()
      };

      const updatedPosts = allPosts.map(p => 
        p.id === activeCommentPost.id ? { ...p, comments: [...(p.comments || []), commentObj] } : p
      );

      await AsyncStorage.setItem('@all_sparks', JSON.stringify(updatedPosts));
      setNewComment("");
      fetchMyPosts(); 
    } catch (e) { console.error(e); }
  };

  const handleOptionsPress = (itemId, content, type) => {
    if (type === 'post') {
        setActivePostId(itemId);
        setActiveCommentId(null);
    } else {
        setActiveCommentId(itemId);
        setActivePostId(null);
    }
    setEditText(content);
    
    const ref = touchableRefs.current[itemId];
    if (ref) {
      ref.measure((x, y, width, height, px, py) => {
        setOptionsPosition({ 
          top: py + height, 
          right: Dimensions.get('window').width - (px + width) 
        });
        type === 'post' ? setShowPostOptions(true) : setShowCommentOptions(true);
      });
    }
  };

  const getExpiryLabel = (expiry) => {
    const diff = Math.max(0, Math.floor((expiry - now) / 60000));
    if (diff >= 60) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${diff}m`;
  };

  const getRelativeTime = (timestamp) => {
    const diff = Math.floor((now - timestamp) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  const rollBackground = async () => {
    const bgs = [
      "https://i.pinimg.com/1200x/f9/1b/fc/f91bfc1a9425e643a9f369edfe578f18.jpg",
      "https://i.pinimg.com/736x/92/d4/aa/92d4aaa36b5316a668a9f9c531889d7a.jpg",
      "https://i.pinimg.com/1200x/65/2e/35/652e3586dbfdb6a9d6d4929efc3217c0.jpg"
    ];
    const newBg = bgs[Math.floor(Math.random() * bgs.length)];
    setBgImage(newBg);
    await AsyncStorage.setItem(`@bg_${user.email}`, newBg);
  };

  const togglePrefs = () => {
    if (showPrefs) {
      Animated.timing(dropdownAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start(() => setShowPrefs(false));
    } else {
      setShowPrefs(true);
      Animated.timing(dropdownAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    }
  };

  const renderPost = ({ item }) => {
    return (
      <View style={styles.postCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarMini}><Text style={{fontSize: 18}}>{localAvatar}</Text></View>
            <View style={{ marginLeft: 12 }}> 
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.postAuthor}>{item.userName}</Text>
                <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>
              </View>
              <Text style={styles.postTime}>{getRelativeTime(item.timestamp)} • Exp: {getExpiryLabel(item.expiryTime)}</Text>
            </View>
          </View>
          <TouchableOpacity 
            ref={el => touchableRefs.current[item.id] = el}
            onPress={() => handleOptionsPress(item.id, item.content, 'post')}
            style={{ padding: 5 }}
          >
             <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2311/2311524.png' }} style={styles.threeDotsIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}><Text style={styles.postText}>{item.content}</Text></View>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.commentBtn} onPress={() => { setActiveCommentPost(item); setShowCommentModal(true); }}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/13/13673.png' }} style={styles.commentIcon} />
            <Text style={styles.commentLabel}>
                {item.comments?.length || 0} {item.comments?.length === 1 ? 'REPLY' : 'REPLIES'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.fullHeader}>
        <View style={styles.bgWrapper}>
          <Image source={{ uri: bgImage }} style={styles.coverPhoto} resizeMode="cover" />
          <TouchableOpacity style={styles.bgDice} onPress={rollBackground}>
              <Text style={{ fontSize: 16 }}>🎲</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.mainInfoRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorder}>
                <View style={styles.fbAvatar}>
                  <Text style={{ fontSize: 45, color: '#000' }}>{localAvatar || "👤"}</Text>
                </View>
              </View>
              <Animated.View style={[styles.diceContainer, { transform: [{ rotate: rollAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                <TouchableOpacity style={styles.diceButton} onPress={rollAvatar}><Text style={{ fontSize: 13 }}>🎲</Text></TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.profileName}>{user?.anonName || "New User"}</Text>
              <TextInput 
                placeholder="Write a bio..." 
                value={bio} 
                onChangeText={setBio} 
                style={styles.bioInput} 
                placeholderTextColor="#94a3b8" 
                multiline 
                onBlur={() => user?.email && AsyncStorage.setItem(`@bio_${user.email}`, bio)}
              />
            </View>

            <TouchableOpacity onPress={togglePrefs} style={styles.toggleWrapper}>
              <Animated.Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2722/2722987.png' }} 
                  style={[styles.prefToggleIcon, { transform: [{ rotate: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]} 
              />
            </TouchableOpacity>
          </View>

          {showPrefs && (
            <Animated.View style={[styles.inlinePrefsCard, { height: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] }), opacity: dropdownAnim }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inlinePrefsHeader}><Text style={styles.inlinePrefsTitle}>MATCHING PREFS</Text></View>
                <View style={styles.inlinePrefsContent}>
                  <PrefRow label="Goal" value={user?.purpose} />
                  <PrefRow label="Campus" value={user?.prefCampus} />
                  <PrefRow label="Course" value={user?.prefCourse} />
                  <PrefRow label="Year" value={user?.prefYear} />
                  <PrefRow label="Interested In" value={user?.prefGender} />
                  <PrefRow label="Ages" value={user?.prefAge} />
                </View>
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </View>

      <FlatList
        data={myPosts}
        renderItem={renderPost}
        keyExtractor={p => p.id}
        ListHeaderComponent={<View style={styles.listHeader}><Text style={styles.sectionTitle}>YOUR ACTIVE SPARKS ({myPosts.length})</Text></View>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* --- MODALS --- */}

      <Modal visible={showCommentModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.commentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.commentHeader}>
                <Text style={styles.commentTitle}>The Conversation</Text>
                <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                    <Text style={{color: '#000', fontWeight: '900'}}>CLOSE</Text>
                </TouchableOpacity>
            </View>
            <FlatList 
              data={activeCommentPost?.comments || []} 
              keyExtractor={item => item.id} 
              renderItem={({ item }) => {
                const isMyComment = item.user_id === user.email;
                const displayCommentAvatar = isMyComment ? localAvatar : (item.userAvatar || '👤');
                return (
                    <View style={styles.commentContainer}>
                        <View style={styles.commentMain}>
                            <View style={styles.commentAvatarSmall}><Text style={{fontSize: 16}}>{displayCommentAvatar}</Text></View>
                            <View style={styles.commentContentWrapper}>
                                <View style={styles.commentInfoRow}>
                                    <Text style={styles.commentUser}>{item.userName}{isMyComment && " (You)"}</Text>
                                    <Text style={styles.commentTime}>{getRelativeTime(item.timestamp)}</Text>
                                </View>
                                <Text style={styles.commentBody}>{item.content}</Text>
                            </View>
                            {isMyComment && (
                                <TouchableOpacity 
                                    style={styles.commentDots}
                                    onPress={() => handleOptionsPress(item.id, item.content, 'comment')}
                                    ref={el => touchableRefs.current[item.id] = el}
                                >
                                     <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2311/2311524.png' }} style={styles.commentDotsIcon} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
              }} 
            />
            <View style={styles.inputContainer}>
              <TextInput placeholder="Write a reply..." style={styles.commentInput} value={newComment} onChangeText={setNewComment} />
              <TouchableOpacity onPress={handleAddComment}><Text style={[styles.postActionText, !newComment.trim() && { opacity: 0.5 }]}>POST</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showPostOptions || showCommentOptions} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => { setShowPostOptions(false); setShowCommentOptions(false); }}
        >
            <View style={[styles.inlineMenu, { top: optionsPosition.top, right: optionsPosition.right }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuHeaderText}>{showPostOptions ? 'SPARK OPTIONS' : 'REPLY OPTIONS'}</Text>
                </View>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowPostOptions(false); setShowCommentOptions(false); setShowEditModal(true); }}>
                  <Text style={{ color: '#000', fontWeight: '900' }}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowPostOptions(false); setShowCommentOptions(false); setShowDeleteModal(true); }}>
                  <Text style={{ color: '#F87171', fontWeight: '900' }}>DELETE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inlineOption, { borderBottomWidth: 0 }]} onPress={() => { setShowPostOptions(false); setShowCommentOptions(false); }}>
                  <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.modalTitle}>Refine Your Spark</Text>
            <TextInput style={styles.editInput} multiline value={editText} onChangeText={setEditText} autoFocus />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={{color: '#94A3B8', fontWeight: 'bold'}}>Abort</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateAction}>
                <Text style={{color: '#fff', fontWeight: '900'}}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.deleteConfirmCard}>
            <Text style={styles.deleteTitle}>Extinguish this spark permanently?</Text>
            <View style={styles.deleteActionRow}>
              <TouchableOpacity style={styles.noBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.noText}>Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.yesDeleteBtn} onPress={handleDeleteAction}>
                <Text style={styles.yesDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const PrefRow = ({ label, value }) => (
  <View style={styles.prefRow}>
    <Text style={styles.prefLabel}>{label}:</Text>
    <Text style={styles.prefValue}>{value || "Any"}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9FF' },
  fullHeader: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1.5, borderColor: '#000' },
  bgWrapper: { height: 180, width: '100%', position: 'relative', backgroundColor: '#e2e8f0', borderBottomWidth: 2, borderColor: '#000' },
  coverPhoto: { width: '100%', height: '100%' },
  bgDice: { 
    position: 'absolute', 
    top: 50, 
    right: 15, 
    backgroundColor: '#fff', 
    padding: 8, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#000',
    zIndex: 10 
  },
  profileCard: { 
    marginHorizontal: 16, marginTop: -45, backgroundColor: '#fff', borderRadius: 25, padding: 18, 
    borderWidth: 3, borderColor: '#000', elevation: 4, 
    shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4 
  },
  mainInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginRight: 15 },
  avatarBorder: { padding: 3, borderRadius: 45, borderWidth: 2, borderColor: '#000' },
  fbAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  diceContainer: { position: 'absolute', bottom: -2, right: -2 },
  diceButton: { backgroundColor: '#fff', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  textContainer: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  bioInput: { fontSize: 13, color: '#64748B', marginTop: 4, padding: 0, fontWeight: '600' },
  toggleWrapper: { paddingLeft: 10 },
  prefToggleIcon: { width: 22, height: 22, tintColor: '#000' },
  inlinePrefsCard: { 
    marginTop: 15, backgroundColor: '#E0E7FF', borderRadius: 18, 
    borderWidth: 2, borderColor: '#000', overflow: 'hidden' 
  },
  inlinePrefsHeader: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
  inlinePrefsTitle: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1 },
  inlinePrefsContent: { paddingHorizontal: 15, paddingBottom: 15 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  prefLabel: { color: '#000', fontSize: 12, fontWeight: '600' },
  prefValue: { color: '#000', fontWeight: '900', fontSize: 12 },
  listHeader: { paddingHorizontal: 20, paddingTop: 25 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' },

  // Updated Synced Post Card Styles
  postCard: { 
    backgroundColor: '#fff', borderRadius: 25, 
    marginHorizontal: 16, marginBottom: 20, padding: 18, 
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  postAuthor: { fontWeight: '900', color: '#1E293B', fontSize: 16 },
  youBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8, borderWidth: 1.5, borderColor: '#000' },
  youBadgeText: { fontSize: 10, fontWeight: '900', color: '#000' },
  postTime: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  threeDotsIcon: { width: 18, height: 18, tintColor: '#000' },
  contentArea: { paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9' },
  postText: { fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' },
  cardFooter: { paddingTop: 12 },
  commentBtn: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, 
    backgroundColor: '#DCFCE7', borderRadius: 12, borderWidth: 2, borderColor: '#000', alignSelf: 'flex-start'
  },
  commentIcon: { width: 16, height: 16, tintColor: '#000', marginRight: 8 },
  commentLabel: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  modalOverlay: { flex: 1 },
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 },
  inlineMenu: { 
    position: 'absolute', backgroundColor: '#fff', width: 200, borderRadius: 15, 
    borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', zIndex: 100000 
  },
  menuHeader: { backgroundColor: '#F1F5F9', padding: 10, borderBottomWidth: 1.5, borderColor: '#000' },
  menuHeaderText: { textAlign: 'center', fontWeight: '900', color: '#1E293B', fontSize: 11 },
  inlineOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  
  editCard: { backgroundColor: '#fff', width: '92%', borderRadius: 25, padding: 22, borderWidth: 3, borderColor: '#000' },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, color: '#1E293B' },
  editInput: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 15, height: 110, fontSize: 15, borderWidth: 2, borderColor: '#000', color: '#1E293B' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: 10, marginRight: 12 },
  saveBtn: { backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, borderWidth: 2, borderColor: '#000' },

  deleteConfirmCard: { backgroundColor: '#fff', width: '85%', borderRadius: 25, padding: 25, alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  deleteTitle: { fontSize: 17, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 25 },
  deleteActionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  noBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 15, marginRight: 10, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  noText: { color: '#1E293B', fontWeight: '900' },
  yesDeleteBtn: { flex: 1, backgroundColor: '#FECACA', paddingVertical: 14, borderRadius: 15, marginLeft: 10, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  yesDeleteText: { color: '#000', fontWeight: '900' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, height: '90%', padding: 20, borderWidth: 3, borderColor: '#000', borderBottomWidth: 0 },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  commentTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  commentContainer: { marginBottom: 15 },
  commentMain: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAvatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: '#000' },
  commentContentWrapper: { 
    flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 18, 
    borderWidth: 2, borderColor: '#000', shadowColor: '#000', 
    shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 
  },
  commentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commentUser: { fontWeight: '900', fontSize: 13, color: '#1E293B' },
  commentTime: { fontSize: 10, color: '#94A3B8' },
  commentBody: { fontSize: 13, color: '#475569', lineHeight: 18, fontWeight: '500' },
  commentDots: { padding: 8 },
  commentDotsIcon: { width: 12, height: 12, tintColor: '#000' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 2, borderColor: '#F1F5F9', paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  commentInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, height: 45, fontSize: 14, borderWidth: 2, borderColor: '#000' },
  postActionText: { color: '#000', fontWeight: '900', marginLeft: 12, fontSize: 14 },
});

export default ProfileScreen;