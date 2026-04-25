import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList, 
  TextInput, Modal, Dimensions, Platform, KeyboardAvoidingView 
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const FeedScreen = ({ user, userAvatar }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showDurationModal, setShowDurationModal] = useState(false);
  
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

  const fetchPosts = useCallback(async () => {
    try {
      const storedPosts = await AsyncStorage.getItem('@all_sparks');
      let parsedPosts = storedPosts ? JSON.parse(storedPosts) : [];
      
      const currentTime = Date.now();
      const activePosts = parsedPosts.filter(p => p.expiryTime > currentTime);
      
      if (activePosts.length !== parsedPosts.length) {
        await AsyncStorage.setItem('@all_sparks', JSON.stringify(activePosts));
      }

      const sorted = activePosts.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(sorted);

      if (activeCommentPost) {
        const updatedActivePost = sorted.find(p => p.id === activeCommentPost.id);
        if (updatedActivePost) {
          setActiveCommentPost(updatedActivePost);
        } else {
          setShowCommentModal(false);
          setActiveCommentPost(null);
        }
      }
    } catch (e) {
      console.error("Failed to fetch posts", e);
    }
  }, [activeCommentPost?.id]);

  useEffect(() => {
    fetchPosts();
    const timer = setInterval(() => {
      setNow(Date.now());
      fetchPosts();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchPosts]);

  const finalizePost = async (hours) => {
    if (!newPost.trim()) return;
    const timestamp = Date.now();
    const expiryTime = timestamp + (hours * 60 * 60 * 1000);

    const newPostObj = {
      id: timestamp.toString(),
      user_id: user?.email,
      userName: user?.anonName || "Anonymous",
      userAvatar: userAvatar, 
      content: newPost,
      timestamp: timestamp,
      expiryTime: expiryTime,
      comments: [] 
    };

    try {
      const stored = await AsyncStorage.getItem('@all_sparks');
      const currentPosts = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem('@all_sparks', JSON.stringify([newPostObj, ...currentPosts]));
      setNewPost("");
      setShowDurationModal(false);
      fetchPosts();
    } catch (e) {
      console.error("Error", "Could not save post.");
    }
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
      fetchPosts();
    } catch (e) {
      console.error("Error", "Failed to edit.");
    }
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
      fetchPosts();
    } catch (e) {
      console.error("Error", "Failed to delete.");
    }
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
        userAvatar: userAvatar,
        content: newComment,
        timestamp: Date.now()
      };

      const updatedPosts = allPosts.map(p => {
        if (p.id === activeCommentPost.id) {
          return { ...p, comments: [...(p.comments || []), commentObj] };
        }
        return p;
      });

      await AsyncStorage.setItem('@all_sparks', JSON.stringify(updatedPosts));
      setNewComment("");
      fetchPosts(); 
    } catch (e) {
      console.error(e);
    }
  };

  const getRelativeTime = (timestamp) => {
    const diff = Math.floor((now - timestamp) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getExpiryLabel = (expiry) => {
    const diff = Math.max(0, Math.floor((expiry - now) / 60000));
    if (diff >= 60) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${diff}m`;
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

  const renderPost = ({ item }) => {
    const isMyPost = item.user_id === user?.email;
    const displayAvatar = isMyPost ? userAvatar : (item.userAvatar || '👤');

    return (
      <View style={styles.postCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarLarge}>
              <Text style={{fontSize: 22}}>{displayAvatar}</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.postAuthor}>{item.userName}</Text>
                {isMyPost && <View style={styles.youBadge}><Text style={styles.youText}>YOU</Text></View>}
              </View>
              <Text style={styles.postMeta}>
                {getRelativeTime(item.timestamp)} • Exp: {getExpiryLabel(item.expiryTime)}
              </Text>
            </View>
          </View>

          {isMyPost && (
            <TouchableOpacity 
              style={{ padding: 5 }}
              onPress={() => handleOptionsPress(item.id, item.content, 'post')}
              ref={el => touchableRefs.current[item.id] = el}
            >
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2311/2311524.png' }} style={styles.threeDotsIcon} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentArea}>
          <Text style={styles.postText}>{item.content}</Text>
        </View>
        
        <View style={styles.cardFooter}>
            <TouchableOpacity 
              style={styles.commentBtn}
              onPress={() => { setActiveCommentPost(item); setShowCommentModal(true); }}
            >
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/13/13673.png' }} style={styles.commentIcon} />
              <Text style={styles.commentText}>
                {item.comments?.length > 0 ? `${item.comments.length} Comments` : 'Comments'}
              </Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF9FF' }}>
        {/* NON-SCROLLABLE UPPER SECTION */}
        <View style={styles.headerContainer}>
          <View style={styles.fbTopRow}>
            <View style={styles.avatarInput}>
              <Text style={{fontSize: 24}}>{userAvatar}</Text>
            </View>
            <TextInput 
                placeholder="What's your spark today?" 
                placeholderTextColor="#94A3B8"
                style={styles.fbInput} 
                value={newPost} 
                onChangeText={setNewPost} 
            />
            <TouchableOpacity 
                style={[styles.fbPostBtnSide, !newPost.trim() && { opacity: 0.6 }]} 
                onPress={() => newPost.trim() && setShowDurationModal(true)}
            >
                <Text style={styles.fbPostBtnText}>POST</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />
        </View>

        <FlatList 
          data={posts} 
          renderItem={renderPost} 
          keyExtractor={p => p.id} 
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 5 }}
        />

      <Modal visible={showCommentModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.commentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>The Conversation</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Text style={{color: '#7C3AED', fontWeight: '800'}}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <FlatList 
              data={activeCommentPost?.comments || []}
              keyExtractor={c => c.id}
              renderItem={({item}) => {
                const isMyComment = item.user_id === user?.email;
                const displayCommentAvatar = isMyComment ? userAvatar : (item.userAvatar || '👤');

                return (
                  <View style={styles.commentContainer}>
                    <View style={styles.commentMain}>
                        <View style={styles.commentAvatarSmall}>
                          <Text style={{fontSize: 16}}>{displayCommentAvatar}</Text>
                        </View>
                        
                        <View style={styles.commentCardSmall}>
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
                )
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Quiet Spark...</Text>
                    <Text style={styles.emptySubText}>Break the silence first.</Text>
                </View>
              }
            />

            <View style={styles.inputContainer}>
               <TextInput 
                 style={styles.commentInput}
                 placeholder="Write a reply..."
                 value={newComment}
                 onChangeText={setNewComment}
               />
               <TouchableOpacity onPress={handleAddComment}>
                 <Text style={[styles.postActionText, !newComment.trim() && { opacity: 0.5 }]}>POST</Text>
               </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showPostOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPostOptions(false)}>
            <View style={[styles.inlineMenu, { top: optionsPosition.top, right: optionsPosition.right }]}>
                <View style={styles.menuHeader}><Text style={styles.menuHeaderText}>SPARK OPTIONS</Text></View>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowPostOptions(false); setShowEditModal(true); }}>
                  <Text style={{ color: '#1E293B', fontWeight: '800' }}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowPostOptions(false); setShowDeleteModal(true); }}>
                  <Text style={{ color: '#F87171', fontWeight: '800' }}>DELETE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inlineOption, { borderBottomWidth: 0 }]} onPress={() => setShowPostOptions(false)}>
                  <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCommentOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCommentOptions(false)}>
            <View style={[styles.inlineMenu, { top: optionsPosition.top, right: optionsPosition.right }]}>
                <View style={styles.menuHeader}><Text style={styles.menuHeaderText}>REPLY OPTIONS</Text></View>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowCommentOptions(false); setShowEditModal(true); }}>
                  <Text style={{ color: '#1E293B', fontWeight: '800' }}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inlineOption} onPress={() => { setShowCommentOptions(false); setShowDeleteModal(true); }}>
                  <Text style={{ color: '#F87171', fontWeight: '800' }}>DELETE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inlineOption, { borderBottomWidth: 0 }]} onPress={() => setShowCommentOptions(false)}>
                  <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>CANCEL</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.modalTitle}>Refine Your Spark</Text>
            <TextInput style={styles.editInput} multiline value={editText} onChangeText={setEditText} />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={{color: '#94A3B8', fontWeight: 'bold'}}>Abort</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateAction}>
                <Text style={{color: '#fff', fontWeight: '800'}}>SAVE CHANGES</Text>
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

      <Modal visible={showDurationModal} transparent animationType="fade">
        <TouchableOpacity style={styles.fadeOverlay} activeOpacity={1} onPress={() => setShowDurationModal(false)}>
          <View style={styles.optionsCard}>
            <View style={styles.modalHeader}><Text style={{fontWeight:'900', textAlign:'center', color: '#fff'}}>SET VISIBILITY</Text></View>
            {[1, 6, 12, 24].map(h => (
              <TouchableOpacity key={h} style={styles.optionItem} onPress={() => finalizePost(h)}>
                <Text style={{fontWeight: '800', color: '#1E293B'}}>{h} HOUR{h > 1 ? 'S' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { 
    backgroundColor: '#fff', 
    paddingTop: 15, // Reduced from 50 to 15 to fix excessive padding
    zIndex: 10,
    borderBottomWidth: 1.5,
    borderColor: '#000'
  },
  fbTopRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingBottom: 20
  },
  avatarInput: { 
    width: 50, height: 50, borderRadius: 25, 
    backgroundColor: '#fff', justifyContent: 'center', 
    alignItems: 'center', marginRight: 12, 
    borderWidth: 2, borderColor: '#000',
    shadowColor: '#CBD5E1', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.8, shadowRadius: 0, elevation: 2 
  },
  fbInput: { 
    flex: 1,
    backgroundColor: '#F8FAFC', 
    borderRadius: 15, paddingHorizontal: 15, height: 50, 
    color: '#000', fontSize: 15, borderWidth: 2, borderColor: '#000',
    marginRight: 10,
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2
  },
  fbPostBtnSide: {
    backgroundColor: '#C7D2FE',
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  fbPostBtnText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  headerDivider: { height: 1.5, backgroundColor: '#000', width: '100%' },
  postCard: { 
    backgroundColor: '#fff', borderRadius: 25, 
    marginHorizontal: 16, marginBottom: 20, padding: 18, 
    borderWidth: 2.5, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 4 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarLarge: { 
    width: 45, height: 45, borderRadius: 22.5, 
    backgroundColor: '#fff', justifyContent: 'center', 
    alignItems: 'center', borderWidth: 2, borderColor: '#000' 
  },
  postAuthor: { fontWeight: '900', color: '#1E293B', fontSize: 16 },
  youBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#000' },
  youText: { color: '#000', fontSize: 9, fontWeight: '900' },
  postMeta: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  threeDotsIcon: { width: 18, height: 18, tintColor: '#000' },
  contentArea: { paddingVertical: 12 },
  postText: { fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' },
  cardFooter: { borderTopWidth: 1.5, borderColor: '#F1F5F9', paddingTop: 12, marginTop: 5 },
  commentBtn: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingVertical: 8, paddingHorizontal: 12, 
    backgroundColor: '#DCFCE7', 
    borderRadius: 12, borderWidth: 2, borderColor: '#000', alignSelf: 'flex-start'
  },
  commentIcon: { width: 16, height: 16, tintColor: '#000', marginRight: 8 },
  commentText: { color: '#000', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  modalOverlay: { flex: 1 },
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 20000 },
  optionsCard: { backgroundColor: '#E0E7FF', width: '80%', borderRadius: 20, borderWidth: 3, borderColor: '#000', overflow: 'hidden' },
  optionItem: { padding: 20, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#000' },
  modalHeader: { padding: 15, backgroundColor: '#000' },
  editCard: { backgroundColor: '#fff', width: '92%', borderRadius: 25, padding: 22, borderWidth: 3, borderColor: '#000' },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15, color: '#1E293B' },
  editInput: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 15, height: 110, fontSize: 15, borderWidth: 2, borderColor: '#000', color: '#1E293B' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { padding: 10, marginRight: 12 },
  saveBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, borderWidth: 2, borderColor: '#000' },
  deleteConfirmCard: { backgroundColor: '#fff', width: '85%', borderRadius: 25, padding: 25, alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  deleteTitle: { fontSize: 17, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 25 },
  deleteActionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  noBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 15, marginRight: 10, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  noText: { color: '#1E293B', fontWeight: '900' },
  yesDeleteBtn: { flex: 1, backgroundColor: '#FECACA', paddingVertical: 14, borderRadius: 15, marginLeft: 10, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  yesDeleteText: { color: '#000', fontWeight: '900' },
  inlineMenu: { position: 'absolute', backgroundColor: '#fff', width: 200, borderRadius: 15, borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', zIndex: 99999 },
  menuHeader: { backgroundColor: '#F1F5F9', padding: 10, borderBottomWidth: 1.5, borderColor: '#000' },
  menuHeaderText: { textAlign: 'center', fontWeight: '900', color: '#1E293B', fontSize: 11 },
  inlineOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  commentSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, height: '90%', padding: 20, borderWidth: 3, borderColor: '#000', borderBottomWidth: 0 },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  commentTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  commentContainer: { marginBottom: 15 },
  commentMain: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAvatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: '#000' },
  commentCardSmall: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 18, 
    borderWidth: 2, 
    borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2
  },
  commentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commentUser: { fontWeight: '900', fontSize: 13, color: '#1E293B' },
  commentTime: { fontSize: 10, color: '#94A3B8' },
  commentBody: { fontSize: 13, color: '#475569', lineHeight: 18, fontWeight: '500' },
  commentDots: { padding: 8 },
  commentDotsIcon: { width: 12, height: 12, tintColor: '#000' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 2, borderColor: '#F1F5F9', paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  commentInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, height: 45, fontSize: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  postActionText: { color: '#7C3AED', fontWeight: '900', marginLeft: 12, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  emptySubText: { color: '#94A3B8', marginTop: 5, fontWeight: '600' }
});

export default FeedScreen;