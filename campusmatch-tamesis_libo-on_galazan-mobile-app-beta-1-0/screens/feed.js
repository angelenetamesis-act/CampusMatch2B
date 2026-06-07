import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList, 
  TextInput, Modal, Dimensions, Platform, KeyboardAvoidingView, ScrollView, Alert
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkViolation, recordViolation, checkSuspension } from "../settings/warning&violation";
import WarningsModal from "../settings/warnings"; 
import Access from "./access";
import UserSuspensionModal from "../settings/usersuspension";

const FeedScreen = ({ user, userAvatar, navigation, onLogout }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const moods = ["🔥 Burning Out", "🧠 Focused", "😴 Sleepy", "🎉 Party Mode", "📚 Studying"];
  const tags = ["#Academic", "#Rant", "#Chismis", "#Mood", "#OrgLife", "#LostAndFound", "#Collab"];

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
  
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationModalData, setViolationModalData] = useState([]);
  const [fullViolatedText, setFullViolatedText] = useState(""); 

  const [showWarningsHistory, setShowWarningsHistory] = useState(false);

  // ── Suspension state ──────────────────────────────────────────────────────
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const suspensionPollRef = useRef(null);

  const [optionsPosition, setOptionsPosition] = useState({ top: 0, right: 0 });
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });
  const touchableRefs = useRef({});
  const filterBtnRef = useRef(null);

  // ── Poll suspension status every 5 s ─────────────────────────────────────
  const pollSuspension = useCallback(async () => {
    if (!user?.email) return;
    const status = await checkSuspension(user.email);
    if (status.isSuspended || status.isPending) {
      setShowSuspensionModal(true);
    } else {
      setShowSuspensionModal(false);
    }
  }, [user?.email]);

  useEffect(() => {
    pollSuspension();
    suspensionPollRef.current = setInterval(pollSuspension, 5000);
    return () => clearInterval(suspensionPollRef.current);
  }, [pollSuspension]);

  const fetchPosts = useCallback(async () => {
    try {
      const storedPosts = await AsyncStorage.getItem('@all_sparks');
      let parsedPosts = storedPosts ? JSON.parse(storedPosts) : [];
      const currentTime = Date.now();
      const activePosts = parsedPosts.filter(p => p.expiryTime > currentTime && !p.isDeleted);
      const sorted = activePosts.sort((a, b) => b.timestamp - a.timestamp);
      setPosts(sorted);
      if (activeCommentPost) {
        const updatedActivePost = activePosts.find(p => p.id === activeCommentPost.id);
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

  const filteredPosts = useMemo(() => {
    if (activeFilter === "All") return posts;
    return posts.filter(p => p.tag === activeFilter || p.mood === activeFilter.replace("#", ""));
  }, [posts, activeFilter]);

  useEffect(() => {
    fetchPosts();
    const timer = setInterval(() => {
      setNow(Date.now());
      fetchPosts();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchPosts]);

  const finalizePost = async () => {
    if (!newPost.trim()) {
      Alert.alert("Empty Spark", "Please write something before posting.");
      return;
    }
    if (!selectedDuration) {
      Alert.alert("Missing Visibility", "Please set how long your spark should last.");
      return;
    }

    const finalContent = newPost.trim(); 
    
    const violationCheck = checkViolation(finalContent);
    if (violationCheck.isViolated) {
      await recordViolation(user?.email, finalContent, 'Post', violationCheck.violatedWords);
      setViolationModalData(violationCheck.violatedWords);
      setFullViolatedText(finalContent);
      setShowViolationModal(true);
      setShowCreateModal(false);
      setNewPost("");
      // Re-check suspension after recording violation
      pollSuspension();
      return; 
    }
    const timestamp = Date.now();
    const expiryTime = timestamp + (selectedDuration * 60 * 60 * 1000);
    const newPostObj = {
      id: timestamp.toString(),
      user_id: user?.email,
      userName: user?.anonName || "Anonymous",
      userAvatar: userAvatar, 
      content: finalContent,
      tag: selectedTag,
      mood: selectedTag === "#Mood" ? selectedMood : null,
      timestamp: timestamp,
      expiryTime: expiryTime,
      comments: [],
      isDeleted: false 
    };
    try {
      const stored = await AsyncStorage.getItem('@all_sparks');
      const currentPosts = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem('@all_sparks', JSON.stringify([newPostObj, ...currentPosts]));
      setNewPost("");
      setSelectedTag(null);
      setSelectedMood(null);
      setSelectedDuration(null);
      setShowCreateModal(false);
      fetchPosts();
    } catch (e) {
      console.error("Error", "Could not save post.");
    }
  };

  const handleUpdateAction = async () => {
    if (!editText.trim()) return;
    const violationCheck = checkViolation(editText);
    if (violationCheck.isViolated) {
      const type = activeCommentId ? 'Comment Edit' : 'Post Edit';
      await recordViolation(user?.email, editText, type, violationCheck.violatedWords);
      setViolationModalData(violationCheck.violatedWords);
      setFullViolatedText(editText);
      setShowViolationModal(true);
      setShowEditModal(false);
      setEditText("");
      pollSuspension();
      return;
    }
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
          updated = currentPosts.map(p => p.id === activePostId ? { ...p, isDeleted: true } : p);
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
    const violationCheck = checkViolation(newComment);
    if (violationCheck.isViolated) {
      await recordViolation(user?.email, newComment, 'Comment', violationCheck.violatedWords);
      setViolationModalData(violationCheck.violatedWords);
      setFullViolatedText(newComment);
      setShowViolationModal(true);
      setNewComment("");
      pollSuspension();
      return;
    }
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

  const handleFilterPress = () => {
    if (filterBtnRef.current) {
        filterBtnRef.current.measure((x, y, width, height, px, py) => {
            setFilterPos({ top: py + height + 10, right: 20 });
            setShowFilterModal(true);
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
          <View style={{flexDirection: 'row', marginTop: 8}}>
            {item.tag && <Text style={styles.postTagText}>{item.tag} </Text>}
            {item.mood && <Text style={styles.postTagText}>{item.mood}</Text>}
          </View>
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
        <View style={styles.headerContainer}>
          <View style={styles.fbTopRow}>
            <View style={styles.avatarInput}>
              <Text style={{fontSize: 24}}>{userAvatar}</Text>
            </View>
            <TouchableOpacity style={styles.fbInputFake} onPress={() => setShowCreateModal(true)}>
                <Text style={{color: '#94A3B8'}}>What's your spark today?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={handleFilterPress} ref={filterBtnRef}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2888/2888265.png' }} style={{width: 24, height: 24}} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />
        </View>

        <FlatList 
          data={filteredPosts} 
          renderItem={renderPost} 
          keyExtractor={p => p.id} 
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 5 }}
        />

        <Access user={user} userAvatar={userAvatar} />

      <Modal visible={showCreateModal} animationType="fade" transparent>
        <View style={styles.fadeOverlay}>
            <View style={styles.createCard}>
                <View style={styles.commentHeader}>
                    <Text style={styles.commentTitle}>New Spark</Text>
                    <TouchableOpacity onPress={() => setShowCreateModal(false)}><Text style={{fontWeight:'800'}}>CANCEL</Text></TouchableOpacity>
                </View>
                <TextInput 
                    style={[styles.editInput, {height: 100}]} 
                    multiline 
                    placeholder="Share your spark..." 
                    value={newPost} 
                    onChangeText={setNewPost} 
                />
                <View style={{marginTop: 15, marginBottom: 10}}>
                    {selectedTag && <Text style={{fontWeight:'800'}}>TAG: {selectedTag}</Text>}
                    {selectedTag === '#Mood' && selectedMood && <Text style={{fontWeight:'800', color: '#7C3AED'}}>MOOD: {selectedMood}</Text>}
                </View>
                <View style={styles.tagsContainer}>
                    {tags.map(tag => (
                        <TouchableOpacity key={tag} style={[styles.tag, selectedTag === tag && {backgroundColor: '#C7D2FE'}]} onPress={() => { setSelectedTag(tag); if(tag === '#Mood') setShowMoodModal(true); }}>
                            <Text style={{fontWeight:'700', fontSize: 12}}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.visibilityBtn} onPress={() => setShowDurationModal(true)}>
                    <Text style={{fontWeight:'900'}}>
                        {selectedDuration ? `VISIBILITY: ${selectedDuration} HOURS` : 'SET VISIBILITY'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtnCenter} onPress={finalizePost}>
                    <Text style={{color:'#fff', fontWeight:'800'}}>POST SPARK</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
            <View style={[styles.filterDropdown, { top: filterPos.top, right: filterPos.right }]}>
                <View style={styles.dropdownHeader}>
                    <Text style={{fontWeight:'900'}}>FILTER</Text>
                    <TouchableOpacity onPress={() => setShowFilterModal(false)}><Text style={{fontWeight:'900'}}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView style={{maxHeight: 200}}>
                    {["All", ...tags].map(t => (
                        <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setActiveFilter(t); setShowFilterModal(false); }}>
                            <Text style={{fontWeight: activeFilter === t ? '900' : '600'}}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showMoodModal} transparent={true} animationType="fade">
          <View style={styles.fadeOverlay}>
              <View style={styles.optionsCard}>
                  <View style={[styles.modalHeaderDuration, {flexDirection:'row', justifyContent:'space-between'}]}>
                      <Text style={{fontWeight:'900'}}>SET MOOD</Text>
                      <TouchableOpacity onPress={() => setShowMoodModal(false)}><Text style={{fontWeight:'900'}}>X</Text></TouchableOpacity>
                  </View>
                  {moods.map(m => (
                      <TouchableOpacity key={m} style={styles.optionItemDuration} onPress={() => { setSelectedMood(m); setShowMoodModal(false); }}>
                          <Text style={{fontWeight:'800'}}>{m}</Text>
                      </TouchableOpacity>
                  ))}
              </View>
          </View>
      </Modal>

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
            </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.createCard}>
            <View style={styles.commentHeader}>
                <Text style={styles.commentTitle}>Edit Spark</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}><Text style={{fontWeight:'800'}}>CANCEL</Text></TouchableOpacity>
            </View>
            <TextInput 
                style={[styles.editInput, {height: 100}]} 
                multiline 
                value={editText} 
                onChangeText={setEditText} 
            />
            <View style={{marginTop: 15, marginBottom: 10}}>
                {activePostId && posts.find(p => p.id === activePostId)?.tag && (
                    <Text style={{fontWeight:'800'}}>TAG: {posts.find(p => p.id === activePostId).tag}</Text>
                )}
            </View>
            <View style={[styles.visibilityBtn, {backgroundColor: '#F8FAFC'}]}>
                <Text style={{fontWeight:'900', color: '#94A3B8'}}>
                    {activePostId ? `EXPIRY: ${getExpiryLabel(posts.find(p => p.id === activePostId)?.expiryTime || 0)}` : 'STATIC'}
                </Text>
            </View>
            <TouchableOpacity style={styles.saveBtnCenter} onPress={handleUpdateAction}>
                <Text style={{color:'#fff', fontWeight:'800'}}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.deleteConfirmCard}>
            <Text style={styles.deleteTitle}>Extinguish this spark permanently?</Text>
            <View style={styles.deleteActionRow}>
              <TouchableOpacity style={styles.noBtn} onPress={() => setShowDeleteModal(false)}><Text style={styles.noText}>Keep It</Text></TouchableOpacity>
              <TouchableOpacity style={styles.yesDeleteBtn} onPress={handleDeleteAction}><Text style={styles.yesDeleteText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDurationModal} transparent animationType="fade">
        <TouchableOpacity style={styles.fadeOverlay} activeOpacity={1} onPress={() => setShowDurationModal(false)}>
          <View style={styles.optionsCard}>
            <View style={styles.modalHeaderDuration}><Text style={{fontWeight:'900', textAlign:'center'}}>SET VISIBILITY</Text></View>
            {[1, 6, 12, 24].map(h => (
              <TouchableOpacity key={h} style={styles.optionItemDuration} onPress={() => { setSelectedDuration(h); setShowDurationModal(false); }}><Text style={{fontWeight: '800'}}>{h} HOURS</Text></TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── VIOLATION MODAL — matches screenshot design ── */}
      <Modal visible={showViolationModal} transparent animationType="fade">
        <View style={styles.fadeOverlay}>
          <View style={styles.violationCard}>

            {/* Title */}
            <Text style={styles.violationTitle}>SPARK EXTINGUISHED!</Text>

            {/* Subtitle */}
            <Text style={styles.violationSubtitle}>
              Your message was flagged for containing forbidden language:
            </Text>

            {/* Violated words box */}
            <View style={styles.violationWordsBox}>
              <Text style={styles.violationWordsText}>
                {violationModalData.join(", ")}
              </Text>
            </View>

            {/* I Understand button */}
            <TouchableOpacity
              style={styles.violationMainBtn}
              onPress={() => setShowViolationModal(false)}
            >
              <Text style={styles.violationMainBtnText}>I UNDERSTAND</Text>
            </TouchableOpacity>

            {/* View Warnings History link */}
            <TouchableOpacity
              onPress={() => {
                setShowViolationModal(false);
                setShowWarningsHistory(true);
              }}
            >
              <Text style={styles.violationHistoryLink}>VIEW WARNINGS HISTORY</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      <WarningsModal visible={showWarningsHistory} onClose={() => setShowWarningsHistory(false)} user={user} />

      {/* ── SUSPENSION MODAL — shown when user hits 5 strikes or is suspended ── */}
      <UserSuspensionModal
        visible={showSuspensionModal}
        user={user}
        onLogout={onLogout}
        onClose={() => setShowSuspensionModal(false)}
      />
    </View>
  );
}; 

const styles = StyleSheet.create({
  saveBtnCenter: { backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 15, borderWidth: 3, borderColor: '#000', alignItems: 'center' },
  headerContainer: { backgroundColor: '#fff', paddingTop: 15, zIndex: 10, borderBottomWidth: 1.5, borderColor: '#000' },
  fbTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  avatarInput: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: '#000' },
  fbInputFake: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 15, paddingHorizontal: 15, height: 50, justifyContent: 'center', borderWidth: 2, borderColor: '#000', marginRight: 10 },
  filterBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 15, borderWidth: 2, borderColor: '#000' },
  headerDivider: { height: 1.5, backgroundColor: '#000', width: '100%' },
  postCard: { backgroundColor: '#fff', borderRadius: 25, marginHorizontal: 16, marginBottom: 20, padding: 18, borderWidth: 2.5, borderColor: '#000' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarLarge: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  postAuthor: { fontWeight: '900', color: '#1E293B', fontSize: 16 },
  youBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#000' },
  youText: { color: '#000', fontSize: 9, fontWeight: '900' },
  postMeta: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  threeDotsIcon: { width: 18, height: 18, tintColor: '#000' },
  contentArea: { paddingVertical: 12 },
  postText: { fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' },
  postTagText: { fontSize: 12, color: '#7C3AED', fontWeight: '900', marginTop: 8 },
  cardFooter: { borderTopWidth: 1.5, borderColor: '#F1F5F9', paddingTop: 12, marginTop: 5 },
  commentBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#DCFCE7', borderRadius: 12, borderWidth: 2, borderColor: '#000', alignSelf: 'flex-start' },
  commentIcon: { width: 16, height: 16, tintColor: '#000', marginRight: 8 },
  commentText: { color: '#000', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  modalOverlay: { flex: 1 },
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  createCard: { backgroundColor: '#fff', width: '90%', borderRadius: 25, padding: 25, borderWidth: 3, borderColor: '#000' },
  optionsCard: { backgroundColor: '#FAF9FF', width: '80%', borderRadius: 20, borderWidth: 3, borderColor: '#000', overflow: 'hidden' },
  modalHeaderDuration: { padding: 15, backgroundColor: '#DCFCE7', borderBottomWidth: 2, borderColor: '#000' },
  optionItemDuration: { padding: 18, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#F1F5F9' },
  editInput: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 15, fontSize: 15, borderWidth: 2, borderColor: '#000', color: '#1E293B' },
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
  commentSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, borderWidth: 3, borderColor: '#000', borderBottomWidth: 0, height: '90%' },
  sheetHandle: { width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  commentTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  commentContainer: { marginBottom: 15 },
  commentMain: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAvatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: '#000' },
  commentCardSmall: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 18, borderWidth: 2, borderColor: '#000' },
  commentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commentUser: { fontWeight: '900', fontSize: 13, color: '#1E293B' },
  commentTime: { fontSize: 10, color: '#94A3B8' },
  commentBody: { fontSize: 13, color: '#475569', lineHeight: 18, fontWeight: '500' },
  commentDots: { padding: 8 },
  commentDotsIcon: { width: 12, height: 12, tintColor: '#000' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 2, borderColor: '#F1F5F9', paddingTop: 15, paddingBottom: 25 },
  commentInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, height: 45, fontSize: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  postActionText: { color: '#7C3AED', fontWeight: '900', marginLeft: 12, fontSize: 14 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  tag: { padding: 8, borderWidth: 2, borderRadius: 10, borderColor: '#000', marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  visibilityBtn: { padding: 15, backgroundColor: '#F1F5F9', borderRadius: 15, borderWidth: 2, borderColor: '#000', alignItems: 'center', marginBottom: 15 },
  filterDropdown: { position: 'absolute', backgroundColor: '#fff', width: 150, borderRadius: 15, borderWidth: 2.5, borderColor: '#000', overflow: 'hidden', zIndex: 99999 },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#F1F5F9', borderBottomWidth: 1.5, borderColor: '#000' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },

  // ── Violation Modal styles ──
  violationCard: {
    backgroundColor: '#fff',
    width: '88%',
    borderRadius: 30,
    padding: 28,
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  violationTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  violationSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  violationWordsBox: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  violationWordsText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EF4444',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  violationMainBtn: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#000',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  violationMainBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  violationHistoryLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    textDecorationLine: 'underline',
    letterSpacing: 0.5,
  },
});

export default FeedScreen;