import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Modal, ScrollView, Alert, Platform, KeyboardAvoidingView, Image
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ANNOUNCEMENT_TYPES = [
  { key: "event",       label: "📅 Event",       color: "#3B82F6", bg: "#EFF6FF",  needsDate: true  },
  { key: "important",   label: "🚨 Important Notice", color: "#EF4444", bg: "#FEF2F2",  needsDate: false },
  { key: "academic",    label: "📚 Academic Update",  color: "#8B5CF6", bg: "#F5F3FF",  needsDate: false },
  { key: "maintenance", label: "🔧 Maintenance",      color: "#F59E0B", bg: "#FFFBEB",  needsDate: true  },
  { key: "general",     label: "📢 General",          color: "#10B981", bg: "#ECFDF5",  needsDate: false },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = Array.from({length: 31}, (_, i) => (i + 1).toString());
const YEARS = ["2026", "2027", "2028"];

const getRelativeTime = (ts) => {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

export default function AdminFeedScreen({ adminUser }) {
  const [announcements, setAnnouncements] = useState([]);
  const [userPosts, setUserPosts]         = useState([]);
  const [showUserFeed, setShowUserFeed]   = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [now, setNow]                     = useState(Date.now());
  const [activePostId, setActivePostId]   = useState(null);

  const [step, setStep]                   = useState(1);
  const [selectedType, setSelectedType]   = useState(null);
  const [title, setTitle]                 = useState("");
  const [body, setBody]                   = useState("");
  const [eventDate, setEventDate]         = useState({ day: "1", month: "Jan", year: "2026", time: "" });
  const [isPosting, setIsPosting]         = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@admin_announcements");
      setAnnouncements(raw ? JSON.parse(raw) : []);
    } catch (e) { console.error(e); }
  }, []);

  const loadUserPosts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@all_sparks");
      const posts = raw ? JSON.parse(raw) : [];
      setUserPosts(
        posts
          .filter(p => !p.isDeleted && p.expiryTime > Date.now())
          .sort((a, b) => b.timestamp - a.timestamp)
      );
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadAnnouncements();
    loadUserPosts();
    const t = setInterval(() => {
      setNow(Date.now());
      loadAnnouncements();
      loadUserPosts();
    }, 5000);
    return () => clearInterval(t);
  }, [loadAnnouncements, loadUserPosts]);

  const resetModal = () => {
    setStep(1);
    setSelectedType(null);
    setTitle("");
    setBody("");
    setEventDate({ day: "1", month: "Jan", year: "2026", time: "" });
  };

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Required", "Please fill in the title and message.");
      return;
    }
    const typeObj = ANNOUNCEMENT_TYPES.find(t => t.key === selectedType);
    setIsPosting(true);
    try {
      const raw = await AsyncStorage.getItem("@admin_announcements");
      const existing = raw ? JSON.parse(raw) : [];
      const newItem = {
        id: Date.now().toString(),
        type: selectedType,
        typeLabel: typeObj?.label || "📢 General",
        typeColor: typeObj?.color || "#10B981",
        typeBg: typeObj?.bg || "#ECFDF5",
        title: title.trim(),
        body: body.trim(),
        timestamp: Date.now(),
        adminName: adminUser?.email || "Admin",
        ...(typeObj?.needsDate && {
          eventDate: `${eventDate.day} ${eventDate.month} ${eventDate.year}`,
          eventTime: eventDate.time || ""
        })
      };
      const updated = [newItem, ...existing];
      await AsyncStorage.setItem("@admin_announcements", JSON.stringify(updated));
      setAnnouncements(updated);
      setShowPostModal(false);
      resetModal();
    } catch (e) {
      Alert.alert("Error", "Could not save announcement.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    Alert.alert("Delete Announcement", "Remove this announcement permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const updated = announcements.filter(a => a.id !== id);
          setAnnouncements(updated);
          await AsyncStorage.setItem("@admin_announcements", JSON.stringify(updated));
        }
      }
    ]);
  };

  const typeObj = selectedType ? ANNOUNCEMENT_TYPES.find(t => t.key === selectedType) : null;

  const renderAnnouncement = ({ item }) => (
    <View style={[styles.announcementCard, { borderLeftColor: item.typeColor, backgroundColor: item.typeBg }]}>
      <View style={styles.announcementHeader}>
        <View style={[styles.typePill, { backgroundColor: item.typeColor }]}>
          <Text style={styles.typePillText}>{item.typeLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteAnnouncement(item.id)} style={styles.deleteXBtn}>
          <Text style={styles.deleteX}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementBody}>{item.body}</Text>
      {item.eventDate ? (
        <View style={styles.dateRow}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>
            {item.eventDate}{item.eventTime ? ` at ${item.eventTime}` : ""}
          </Text>
        </View>
      ) : null}
      <Text style={styles.announcementMeta}>
        Posted {getRelativeTime(item.timestamp)} · by {item.adminName}
      </Text>
    </View>
  );

  const renderUserPost = ({ item }) => (
    <View style={styles.userPostCard}>
      <View style={styles.userPostHeader}>
        <View style={styles.userPostAvatar}>
          <Text style={{ fontSize: 18 }}>{item.userAvatar || "👤"}</Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.userPostName}>{item.userName}</Text>
          <Text style={styles.userPostMeta}>
            {getRelativeTime(item.timestamp)} • Exp: {Math.max(0, Math.floor((item.expiryTime - Date.now()) / 3600000))}h {Math.max(0, Math.floor(((item.expiryTime - Date.now()) % 3600000) / 60000))}m
          </Text>
        </View>
        {item.status === "violated" && (
          <View style={styles.violatedBadge}>
            <Text style={styles.violatedBadgeText}>VIOLATED</Text>
          </View>
        )}
      </View>
      <Text style={styles.userPostContent}>{item.content}</Text>
      
      <TouchableOpacity 
        style={styles.commentsBadge} 
        onPress={() => setActivePostId(activePostId === item.id ? null : item.id)}
      >
        <Text style={styles.commentsBadgeText}>
          💬 {item.comments?.length || 0} COMMENTS
        </Text>
      </TouchableOpacity>

      {activePostId === item.id && (
        <View style={styles.commentsContainer}>
          {item.comments && item.comments.length > 0 ? (
            item.comments.map((comment, index) => (
              <View key={index} style={styles.commentItem}>
                <View style={styles.commentItemHeader}>
                  <Text style={styles.commentItemAvatar}>
                    {comment.userAvatar || "👤"}
                  </Text>
                  <Text style={styles.commentItemUser}>
                    {comment.userName || "User"}
                  </Text>
                  <Text style={styles.commentItemTime}>
                    {comment.timestamp ? getRelativeTime(comment.timestamp) : ""}
                  </Text>
                </View>
                <Text style={styles.commentItemContent}>{comment.content}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noCommentsText}>No comments yet.</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FF" }}>
      <View style={styles.composeBar}>
        <View style={styles.composeAvatar}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
        </View>
        <TouchableOpacity
          style={styles.composeInput}
          onPress={() => { resetModal(); setShowPostModal(true); }}
        >
          <Text style={styles.composePlaceholder}>Post an announcement or event...</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => { resetModal(); setShowPostModal(true); }}
        >
          <Text style={styles.postBtnText}>POST</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.feedToggle} onPress={() => setShowUserFeed(!showUserFeed)}>
        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/1946/1946436.png" }}
          style={{ width: 14, height: 14, tintColor: showUserFeed ? "#8B5CF6" : "#64748B", marginRight: 6 }}
        />
        <Text style={[styles.feedToggleText, showUserFeed && { color: "#8B5CF6" }]}>
          {showUserFeed ? "← BACK TO ANNOUNCEMENTS" : "SHOW STUDENT FEED"}
        </Text>
        {!showUserFeed && (
          <View style={styles.feedCountBadge}>
            <Text style={styles.feedCountText}>{userPosts.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {!showUserFeed ? (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Announcements Yet</Text>
              <Text style={styles.emptySubtitle}>Post your first announcement above.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={userPosts}
          renderItem={renderUserPost}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          ListHeaderComponent={
            <Text style={styles.sectionHeader}>ALL STUDENT POSTS ({userPosts.length})</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌐</Text>
              <Text style={styles.emptyTitle}>No Student Posts</Text>
              <Text style={styles.emptySubtitle}>No active student posts at the moment.</Text>
            </View>
          }
        />
      )}

      {/* POST ANNOUNCEMENT MODAL - FLOATING NEON-BRUTALIST */}
      <Modal visible={showPostModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalTopRow}>
                <Text style={styles.modalTitle}>
                  {step === 1 ? "Choose Announcement Type" : "Compose Announcement"}
                </Text>
                <TouchableOpacity onPress={() => { setShowPostModal(false); resetModal(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {step === 1 && (
                  <View>
                    <Text style={styles.stepHint}>What kind of announcement is this?</Text>
                    {ANNOUNCEMENT_TYPES.map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[styles.typeOption, { backgroundColor: t.bg, borderColor: t.color }]}
                        onPress={() => { setSelectedType(t.key); setStep(2); }}
                      >
                        <Text style={[styles.typeOptionText, { color: t.color }]}>{t.label}</Text>
                        {t.needsDate && (
                          <Text style={[styles.typeOptionBadge, { color: t.color }]}>Requires Date</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {step === 2 && typeObj && (
                  <View>
                    <TouchableOpacity style={styles.backToTypes} onPress={() => setStep(1)}>
                      <Text style={styles.backToTypesText}>← Change Type</Text>
                    </TouchableOpacity>

                    <View style={[styles.selectedTypePill, { backgroundColor: typeObj.bg, borderColor: typeObj.color }]}>
                      <Text style={[styles.selectedTypeText, { color: typeObj.color }]}>{typeObj.label}</Text>
                    </View>

                    <Text style={styles.fieldLabel}>ANNOUNCEMENT TITLE *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. Campus Intramurals 2025"
                      placeholderTextColor="#94a3b8"
                      value={title}
                      onChangeText={setTitle}
                    />

                    <Text style={styles.fieldLabel}>MESSAGE / DETAILS *</Text>
                    <TextInput
                      style={[styles.fieldInput, styles.fieldInputMulti]}
                      placeholder="Write your full announcement here..."
                      placeholderTextColor="#94a3b8"
                      value={body}
                      onChangeText={setBody}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />

                    {typeObj.needsDate && (
                      <View>
                        <Text style={styles.fieldLabel}>EVENT DATE *</Text>
                        <View style={styles.datePickerRow}>
                          <View style={styles.pickerWrapper}>
                            <Picker
                              selectedValue={eventDate.day}
                              onValueChange={(val) => setEventDate({ ...eventDate, day: val })}
                              style={styles.picker}
                            >
                              {DAYS.map(d => <Picker.Item key={d} label={d} value={d} />)}
                            </Picker>
                          </View>
                          <View style={styles.pickerWrapper}>
                            <Picker
                              selectedValue={eventDate.month}
                              onValueChange={(val) => setEventDate({ ...eventDate, month: val })}
                              style={styles.picker}
                            >
                              {MONTHS.map(m => <Picker.Item key={m} label={m} value={m} />)}
                            </Picker>
                          </View>
                          <View style={styles.pickerWrapper}>
                            <Picker
                              selectedValue={eventDate.year}
                              onValueChange={(val) => setEventDate({ ...eventDate, year: val })}
                              style={styles.picker}
                            >
                              {YEARS.map(y => <Picker.Item key={y} label={y} value={y} />)}
                            </Picker>
                          </View>
                        </View>

                        <Text style={styles.fieldLabel}>EVENT TIME (OPTIONAL)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="e.g. 9:00 AM"
                          placeholderTextColor="#94a3b8"
                          value={eventDate.time}
                          onChangeText={v => setEventDate({ ...eventDate, time: v })}
                        />
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.postSubmitBtn,
                        { backgroundColor: typeObj.color },
                        isPosting && { opacity: 0.6 }
                      ]}
                      onPress={handlePost}
                      disabled={isPosting}
                    >
                      <Text style={styles.postSubmitText}>
                        {isPosting ? "POSTING..." : "POST ANNOUNCEMENT →"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  composeBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 14, borderBottomWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2
  },
  composeAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#000",
    justifyContent: "center", alignItems: "center", marginRight: 10,
    borderWidth: 2, borderColor: "#FFD700"
  },
  composeInput: {
    flex: 1, backgroundColor: "#F8FAFC", borderRadius: 14, paddingHorizontal: 14,
    height: 44, justifyContent: "center", borderWidth: 2, borderColor: "#000", marginRight: 10
  },
  composePlaceholder: { color: "#94a3b8", fontWeight: "700", fontSize: 13 },
  postBtn: {
    backgroundColor: "#FFD700", height: 44, paddingHorizontal: 16, borderRadius: 12,
    justifyContent: "center", alignItems: "center", borderWidth: 2.5, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  postBtnText: { fontWeight: "900", fontSize: 12, color: "#000", letterSpacing: 0.5 },
  feedToggle: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 2, borderColor: "#E2E8F0"
  },
  feedToggleText: { fontWeight: "800", fontSize: 12, color: "#64748B", letterSpacing: 0.5 },
  feedCountBadge: {
    marginLeft: 8, backgroundColor: "#8B5CF6", borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1.5, borderColor: "#000"
  },
  feedCountText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  sectionHeader: { fontSize: 11, fontWeight: "900", color: "#64748B", letterSpacing: 1, marginBottom: 12 },
  announcementCard: {
    borderRadius: 18, padding: 18, marginBottom: 14,
    borderWidth: 2.5, borderColor: "#000", borderLeftWidth: 6,
    shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  announcementHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10
  },
  typePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.2)"
  },
  typePillText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  deleteXBtn: { padding: 4 },
  deleteX: { color: "#94a3b8", fontWeight: "900", fontSize: 16 },
  announcementTitle: { fontSize: 17, fontWeight: "900", color: "#000", marginBottom: 6 },
  announcementBody: { fontSize: 14, color: "#334155", lineHeight: 21, fontWeight: "500", marginBottom: 10 },
  dateRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 8, marginBottom: 8
  },
  dateIcon: { fontSize: 14, marginRight: 6 },
  dateText: { fontWeight: "800", fontSize: 13, color: "#1E293B" },
  announcementMeta: { fontSize: 10, color: "#94a3b8", fontWeight: "700" },
  userPostCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, elevation: 2
  },
  userPostHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  userPostAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9",
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#000"
  },
  userPostName: { fontWeight: "900", color: "#000", fontSize: 14 },
  userPostMeta: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  userPostContent: { fontSize: 14, color: "#334155", lineHeight: 20, marginBottom: 8 },
  violatedBadge: {
    backgroundColor: "#FEE2E2", borderRadius: 6, borderWidth: 1.5, borderColor: "#EF4444",
    paddingHorizontal: 6, paddingVertical: 2
  },
  violatedBadgeText: { color: "#EF4444", fontSize: 9, fontWeight: "900" },
  commentsContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  commentsBadge: { 
    backgroundColor: "#F1F5F9", padding: 8, borderRadius: 8, 
    borderWidth: 1.5, borderColor: "#000", marginTop: 5, alignSelf: 'flex-start' 
  },
  commentsBadgeText: { fontSize: 10, fontWeight: "900", color: "#000" },
  commentItem: { 
    backgroundColor: "#F8FAFC", padding: 10, borderRadius: 10, 
    marginTop: 6, borderWidth: 1.5, borderColor: "#000" 
  },
  commentItemHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6
  },
  commentItemAvatar: { fontSize: 14 },
  commentItemUser: { fontWeight: "900", fontSize: 12, color: "#000", flex: 1 },
  commentItemTime: { fontSize: 10, color: "#94a3b8", fontWeight: "600" },
  commentItemContent: { fontSize: 13, color: "#334155", lineHeight: 18, fontWeight: "500" },
  noCommentsText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 6 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#000", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#64748B", fontWeight: "600", textAlign: "center" },
  
  // UPDATED NEO-BRUTALIST MODAL STYLES
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "center", 
    padding: 20 
  },
  modalSheet: {
    backgroundColor: "#fff", 
    borderRadius: 20, 
    padding: 24, 
    maxHeight: "80%", 
    borderWidth: 4, 
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10
  },
  modalTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
  modalClose: { fontSize: 20, color: "#000", fontWeight: "900", padding: 4 },
  stepHint: { fontSize: 12, color: "#64748B", fontWeight: "700", marginBottom: 16, letterSpacing: 0.5 },
  typeOption: {
    padding: 18, borderRadius: 14, borderWidth: 3, marginBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  typeOptionText: { fontWeight: "900", fontSize: 15 },
  typeOptionBadge: { fontSize: 10, fontWeight: "800", opacity: 0.7 },
  backToTypes: { marginBottom: 14 },
  backToTypesText: { color: "#64748B", fontWeight: "800", fontSize: 13, textDecorationLine: "underline" },
  selectedTypePill: {
    padding: 10, borderRadius: 10, borderWidth: 2, marginBottom: 20, alignSelf: "flex-start"
  },
  selectedTypeText: { fontWeight: "900", fontSize: 13 },
  fieldLabel: { fontSize: 11, fontWeight: "900", color: "#000", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  fieldInput: {
    backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14, fontSize: 14,
    fontWeight: "700", borderWidth: 2.5, borderColor: "#000", color: "#000"
  },
  fieldInputMulti: { height: 100, paddingTop: 12 },
  datePickerRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pickerWrapper: { 
    flex: 1, backgroundColor: "#F8FAFC", borderRadius: 10, 
    borderWidth: 2.5, borderColor: "#000", overflow: 'hidden', height: 50 
  },
  picker: { height: 50, color: "#000" },
  postSubmitBtn: {
    marginTop: 24, padding: 18, borderRadius: 14, alignItems: "center",
    borderWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5
  },
  postSubmitText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
});