import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Modal, ScrollView, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdminUsersScreen() {
  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [activeCampus, setActiveCampus] = useState("All");

  const loadUsers = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@users_db");
      setUsers(raw ? JSON.parse(raw) : []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filtered = users.filter(u => {
    const matchesSearch = !search.trim() ||
      (u.anonName || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.campus || "").toLowerCase().includes(search.toLowerCase()) ||
      (`${u.firstName || ""} ${u.surname || ""}`).toLowerCase().includes(search.toLowerCase());
    
    const matchesCampus = activeCampus === "All" || (u.campus || "") === activeCampus;
    
    return matchesSearch && matchesCampus;
  });

  const renderUser = ({ item, index }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => setSelected(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 22 }}>{item.avatar || "👤"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.anonName}>{item.anonName || "Anonymous"}</Text>
          <Text style={styles.realName}>
            {item.firstName && item.surname
              ? `${item.firstName} ${item.surname}`
              : item.email}
          </Text>
          <Text style={styles.campus}>
            {item.campus || "—"} · {item.userCourse ? item.userCourse.split(" ").slice(-1)[0] : "—"}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.genderChip, {
          backgroundColor:
            item.gender === "Female" ? "#FDE8F0" :
            item.gender === "Male"   ? "#EFF6FF" : "#F5F3FF"
        }]}>
          <Text style={styles.genderText}>{item.gender?.[0] || "?"}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FF" }}>

      {/* SEARCH + STATS */}
      <View style={styles.headerBox}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.length}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.filter(u => u.gender === "Male").length}</Text>
            <Text style={styles.statLabel}>MALE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{users.filter(u => u.gender === "Female").length}</Text>
            <Text style={styles.statLabel}>FEMALE</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={[styles.searchBox, { flex: 1 }]}
            placeholder="🔍  Search by name, email, campus..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderUser}
        keyExtractor={u => u.id || u.email}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>{search ? "No Results" : "No Students Yet"}</Text>
          </View>
        }
      />

      {/* FILTER MODAL */}
      <Modal visible={filterModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.centeredModal}>
            <Text style={styles.modalTitle}>Select Campus</Text>
            {["All", "Alijis", "Binalbagan", "Fortune Town", "Talisay"].map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.filterOption, activeCampus === c && styles.filterOptionActive]}
                onPress={() => { setActiveCampus(c); setFilterModal(false); }}
              >
                <Text style={activeCampus === c ? styles.filterTextActive : styles.filterText}>{c}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setFilterModal(false)} style={[styles.closeBtn, { marginTop: 10 }]}>
              <Text style={styles.closeBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>✕  CLOSE</Text>
            </TouchableOpacity>

            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailAvatar}>
                    <Text style={{ fontSize: 44 }}>{selected.avatar || "👤"}</Text>
                  </View>
                  <Text style={styles.detailAnonName}>{selected.anonName || "Anonymous"}</Text>
                  <Text style={styles.detailRealName}>{selected.firstName} {selected.middleName} {selected.surname}</Text>
                  <View style={[styles.genderChipLarge, { backgroundColor: selected.gender === "Female" ? "#FDE8F0" : "#EFF6FF" }]}>
                    <Text style={styles.genderChipLargeText}>{selected.gender || "Unknown"}</Text>
                  </View>
                </View>

                {[
                  { label: "ACADEMIC INFO", rows: [["University", selected.selectedUni], ["Campus", selected.campus], ["Course", selected.userCourse], ["School ID", selected.schoolId], ["School Email", selected.schoolEmail]]},
                  { label: "PERSONAL INFO", rows: [["Birthday", selected.birthdayText], ["Age", selected.age], ["Address", selected.address]]},
                  { label: "PREFERENCES", rows: [["Looking for", selected.purpose], ["Pref. Campus", selected.prefCampus], ["Pref. Course", selected.prefCourse], ["Pref. Year", selected.prefYear], ["Interested In", selected.prefGender], ["Age Range", selected.prefAge || "Not specified"]]},
                  { label: "ACCOUNT", rows: [["Email", selected.email], ["User ID", selected.id]]},
                ].map(section => (
                  <View key={section.label} style={styles.infoSection}>
                    <Text style={styles.infoSectionLabel}>{section.label}</Text>
                    {section.rows.map(([k, v]) => (
                      <View key={k} style={styles.infoRow}>
                        <Text style={styles.infoKey}>{k}</Text>
                        <Text style={styles.infoVal}>{v || "—"}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBox: { backgroundColor: "#fff", padding: 14, borderBottomWidth: 2.5, borderColor: "#000" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10, borderWidth: 2, borderColor: "#000" },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "900", color: "#000" },
  statLabel: { fontSize: 9, fontWeight: "900", color: "#64748B", marginTop: 2 },
  statDivider: { width: 2, backgroundColor: "#E2E8F0" },
  searchBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: "700", borderWidth: 2.5, borderColor: "#000", color: "#000" },
  filterBtn: { backgroundColor: "#FFD700", width: 50, borderRadius: 12, borderWidth: 2.5, borderColor: "#000", justifyContent: "center", alignItems: "center" },
  userCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2.5, borderColor: "#000" },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  rankBadge: { backgroundColor: "#000", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: "center" },
  rankText: { color: "#FFD700", fontWeight: "900", fontSize: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#000" },
  anonName: { fontWeight: "900", color: "#000", fontSize: 14 },
  realName: { fontWeight: "700", color: "#64748B", fontSize: 11 },
  campus: { fontWeight: "600", color: "#94a3b8", fontSize: 10, marginTop: 2 },
  genderChip: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#000" },
  genderText: { fontWeight: "900", fontSize: 13 },
  chevron: { fontSize: 22, color: "#CBD5E1" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  centeredModal: { width: "85%", backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 3, borderColor: "#000" },
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 15, textAlign: "center" },
  filterOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  filterOptionActive: { backgroundColor: "#F1F5F9", borderRadius: 10 },
  filterText: { fontWeight: "700", color: "#000" },
  filterTextActive: { fontWeight: "900", color: "#000" },
  detailSheet: { backgroundColor: "#fff", width: "100%", height: "92%", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 3, borderColor: "#000", borderBottomWidth: 0 },
  sheetHandle: { width: 50, height: 5, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 16 },
  closeBtn: { alignSelf: "flex-end", backgroundColor: "#F1F5F9", padding: 10, borderRadius: 10, borderWidth: 2, borderColor: "#000", marginBottom: 20 },
  closeBtnText: { fontWeight: "900", fontSize: 12 },
  detailHeader: { alignItems: "center", marginBottom: 24 },
  detailAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#000", marginBottom: 10 },
  detailAnonName: { fontSize: 22, fontWeight: "900", color: "#000" },
  detailRealName: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  genderChipLarge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, borderWidth: 2, borderColor: "#000", marginTop: 10 },
  genderChipLargeText: { fontWeight: "900", fontSize: 13 },
  infoSection: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: "#000" },
  infoSectionLabel: { fontSize: 10, fontWeight: "900", color: "#64748B", marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  infoKey: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  infoVal: { fontSize: 12, fontWeight: "700", color: "#000" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
});