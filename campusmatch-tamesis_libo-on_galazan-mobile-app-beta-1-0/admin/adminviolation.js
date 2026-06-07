import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, RefreshControl, Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getRelativeTime = (ts) => {
  if (!ts) return "Unknown";
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const SEVERITY_COLORS = {
  1: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E", label: "LOW" },
  2: { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B", label: "MEDIUM" },
  3: { bg: "#450A0A", border: "#7F1D1D", text: "#FCA5A5", label: "HIGH" },
};

const getSeverity = (count) => {
  if (count >= 5) return SEVERITY_COLORS[3];
  if (count >= 3) return SEVERITY_COLORS[2];
  return SEVERITY_COLORS[1];
};

const getSuggestedDays = (count) => {
  if (count >= 7) return 7;
  if (count >= 5) return 5;
  if (count >= 4) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2;
  return 1;
};

const DAY_DESCRIPTIONS = {
  1: "Mild offense — first warning with brief suspension.",
  2: "Repeated mild offense — short cooling period.",
  3: "Moderate violation — clear warning issued.",
  4: "Serious offense — significant suspension warranted.",
  5: "Severe violation — extended suspension required.",
  6: "Critical breach — near-maximum suspension.",
  7: "Extreme / repeat offender — maximum suspension.",
};

const getCountdown = (suspensionUntil) => {
  const msLeft = suspensionUntil - Date.now();
  if (msLeft <= 0) return { label: "EXPIRED", sub: "Suspension ended", expired: true };
  const totalMins = Math.floor(msLeft / 60000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return { label: `${days}d ${hours}h`, sub: `${days} day${days !== 1 ? "s" : ""} remaining`, expired: false };
  if (hours > 0) return { label: `${hours}h ${mins}m`, sub: `${hours} hour${hours !== 1 ? "s" : ""} remaining`, expired: false };
  return { label: `${mins}m`, sub: "Less than an hour remaining", expired: false };
};

export default function AdminViolationsScreen() {
  const [violationsByUser, setViolationsByUser] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [selectedDays, setSelectedDays] = useState(1);
  const [lastSuspension, setLastSuspension] = useState(null);

  const [showSuspendedList, setShowSuspendedList] = useState(false);
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [, setSuspendedTick] = useState(0);

  const loadViolations = useCallback(async () => {
    try {
      const rawViolations = await AsyncStorage.getItem("@violations_log");
      const rawUsers = await AsyncStorage.getItem("@users_db");
      const rawSuspended = await AsyncStorage.getItem("@suspended_users");
      
      const allViolations = rawViolations ? JSON.parse(rawViolations) : [];
      const allUsers = rawUsers ? JSON.parse(rawUsers) : [];
      const allSuspended = rawSuspended ? JSON.parse(rawSuspended) : [];
      
      const activeSuspendedEmails = allSuspended
        .filter(s => s.suspensionUntil > Date.now())
        .map(s => s.userEmail);

      const grouped = {};
      allViolations.forEach(v => {
        if (activeSuspendedEmails.includes(v.userEmail)) return;

        const userInfo = allUsers.find(u => u.email === v.userEmail);
        
        if (!grouped[v.userEmail]) {
          grouped[v.userEmail] = {
            userEmail: v.userEmail,
            anonName: userInfo?.anonName || v.anonName || "Anonymous",
            userAvatar: userInfo?.avatar || v.userAvatar || "👤",
            violations: []
          };
        }
        grouped[v.userEmail].violations.push(v);
      });

      const sorted = Object.values(grouped).sort(
        (a, b) => b.violations.length - a.violations.length
      );
      setViolationsByUser(sorted);

      if (selected) {
        const updated = sorted.find(u => u.userEmail === selected.userEmail);
        if (updated) setSelected(updated);
      }
    } catch (e) { console.error(e); }
  }, [selected?.userEmail]);

  const loadSuspended = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("@suspended_users");
      const all = raw ? JSON.parse(raw) : [];
      const sorted = all.slice().sort((a, b) => {
        const aExpired = a.suspensionUntil <= Date.now();
        const bExpired = b.suspensionUntil <= Date.now();
        if (aExpired !== bExpired) return aExpired ? 1 : -1;
        return b.suspensionUntil - a.suspensionUntil;
      });
      setSuspendedUsers(sorted);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadViolations();
    const t = setInterval(loadViolations, 5000);
    return () => clearInterval(t);
  }, [loadViolations]);

  useEffect(() => {
    if (showSuspendedList) {
      loadSuspended();
      const t = setInterval(loadSuspended, 5000);
      const tick = setInterval(() => setSuspendedTick(n => n + 1), 60000);
      return () => { clearInterval(t); clearInterval(tick); };
    }
  }, [showSuspendedList, loadSuspended]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadViolations();
    setRefreshing(false);
  };

  const handleClearViolations = (userEmail) => {
    Alert.alert(
      "Clear Violations",
      "Are you sure you want to clear all violations for this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All", style: "destructive", onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem("@violations_log");
              const all = raw ? JSON.parse(raw) : [];
              const updated = all.filter(v => v.userEmail !== userEmail);
              await AsyncStorage.setItem("@violations_log", JSON.stringify(updated));
              setSelected(null);
              loadViolations();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const openSuspendModal = (userObj) => {
    setSuspendTarget(userObj);
    setSelectedDays(getSuggestedDays(userObj.violations.length));
    setShowSuspendModal(true);
  };

  const handlePressSuspend = () => {
    setShowSuspendModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmSuspension = async () => {
    if (!suspendTarget) return;
    try {
      const raw = await AsyncStorage.getItem("@suspended_users");
      const all = raw ? JSON.parse(raw) : [];
      const filtered = all.filter(s => s.userEmail !== suspendTarget.userEmail);
      const suspensionUntil = Date.now() + selectedDays * 24 * 60 * 60 * 1000;
      const newSuspension = {
        userEmail: suspendTarget.userEmail,
        anonName: suspendTarget.anonName,
        userAvatar: suspendTarget.userAvatar,
        suspendedAt: Date.now(),
        suspensionUntil,
        days: selectedDays,
      };
      filtered.push(newSuspension);
      await AsyncStorage.setItem("@suspended_users", JSON.stringify(filtered));
      setShowConfirmModal(false);
      setLastSuspension({ ...newSuspension, anonName: suspendTarget.anonName });
      setSuspendTarget(null);
      setSelected(null);
      setShowSuccessModal(true);
      loadViolations();
    } catch (e) { console.error(e); }
  };

  const renderUserCard = ({ item, index }) => {
    const count = item.violations.length;
    const severity = getSeverity(count);
    return (
      <TouchableOpacity
        style={[styles.userCard, { borderColor: severity.border, backgroundColor: severity.bg }]}
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.rankBadge, { backgroundColor: severity.border }]}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 22 }}>{item.userAvatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anonName}>{item.anonName}</Text>
            <Text style={styles.emailText}>{item.userEmail}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.countBadge, { backgroundColor: severity.border }]}>
            <Text style={styles.countBadgeNum}>{count}</Text>
            <Text style={styles.countBadgeLabel}>STRIKE{count !== 1 ? "S" : ""}</Text>
          </View>
          <View style={[styles.severityTag, { backgroundColor: severity.border }]}>
            <Text style={styles.severityTagText}>{severity.label}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuspendedCard = ({ item }) => {
    const countdown = getCountdown(item.suspensionUntil);
    const untilDate = new Date(item.suspensionUntil).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric"
    });
    return (
      <View style={[styles.suspendedCard, countdown.expired && styles.suspendedCardExpired]}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatarCircle, countdown.expired && styles.avatarCircleExpired]}>
            <Text style={{ fontSize: 22 }}>{item.userAvatar || "👤"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anonName}>{item.anonName}</Text>
            <Text style={styles.emailText}>{item.userEmail}</Text>
            <Text style={styles.untilText}>Until {untilDate}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.suspendedCountdownBadge, countdown.expired && styles.suspendedCountdownBadgeExpired]}>
            <Text style={[styles.suspendedCountdownLabel, countdown.expired && styles.suspendedCountdownLabelExpired]}>
              {countdown.label}
            </Text>
            <Text style={[styles.suspendedCountdownSub, countdown.expired && styles.suspendedCountdownSubExpired]}>
              {countdown.expired ? "EXPIRED" : "LEFT"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const activeCount = suspendedUsers.filter(u => u.suspensionUntil > Date.now()).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FF" }}>
      <View style={styles.headerBar}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeIcon}>⚠️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Violations & Warnings</Text>
          <Text style={styles.headerSubtitle}>
            {violationsByUser.length} student{violationsByUser.length !== 1 ? "s" : ""} flagged ·{" "}
            {violationsByUser.reduce((acc, u) => acc + u.violations.length, 0)} total strikes
          </Text>
        </View>
        <TouchableOpacity style={styles.suspendedListBtn} onPress={() => { loadSuspended(); setShowSuspendedList(true); }}>
          <Text style={styles.suspendedListBtnText}>🚫 Suspended</Text>
        </TouchableOpacity>
      </View>

      {violationsByUser.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{violationsByUser.filter(u => u.violations.length >= 5).length}</Text>
            <Text style={[styles.statLabel, { color: "#991B1B" }]}>HIGH RISK</Text>
          </View>
          <View style={[styles.statBox, { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }]}>
            <Text style={styles.statNum}>{violationsByUser.filter(u => u.violations.length >= 3 && u.violations.length < 5).length}</Text>
            <Text style={[styles.statLabel, { color: "#92400E" }]}>MEDIUM</Text>
          </View>
          <View style={[styles.statBox, { borderColor: "#10B981", backgroundColor: "#ECFDF5" }]}>
            <Text style={styles.statNum}>{violationsByUser.filter(u => u.violations.length < 3).length}</Text>
            <Text style={[styles.statLabel, { color: "#065F46" }]}>LOW RISK</Text>
          </View>
        </View>
      )}

      <FlatList
        data={violationsByUser}
        renderItem={renderUserCard}
        keyExtractor={u => u.userEmail}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>No violations or warnings on record.</Text>
          </View>
        }
      />

      <Modal visible={!!selected} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View style={styles.detailAvatarCircle}>
                <Text style={{ fontSize: 40 }}>{selected?.userAvatar || "👤"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailAnonName}>{selected?.anonName}</Text>
                <Text style={styles.detailEmail}>{selected?.userEmail}</Text>
                {selected && (
                  <View style={[
                    styles.severityTagLarge,
                    { backgroundColor: getSeverity(selected.violations.length).border }
                  ]}>
                    <Text style={styles.severityTagLargeText}>
                      {getSeverity(selected.violations.length).label} RISK ·{" "}
                      {selected.violations.length} STRIKE{selected.violations.length !== 1 ? "S" : ""}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => handleClearViolations(selected?.userEmail)}>
                <Text style={styles.clearBtnText}>🗑️ CLEAR ALL VIOLATIONS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suspendBtn} onPress={() => openSuspendModal(selected)}>
                <Text style={styles.suspendBtnText}>🚫 SUSPEND USER</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.violationListHeader}>
                VIOLATION HISTORY ({selected?.violations.length})
              </Text>
              {selected?.violations
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((v, i) => (
                  <View key={i} style={styles.violationItem}>
                    <View style={styles.violationTopRow}>
                      <View style={styles.violationTypePill}>
                        <Text style={styles.violationTypeText}>{v.type || "Post"}</Text>
                      </View>
                      <Text style={styles.violationTime}>{getRelativeTime(v.timestamp)}</Text>
                    </View>
                    <Text style={styles.violationContent}>"{v.content}"</Text>
                    {v.violatedWords?.length > 0 && (
                      <View style={styles.wordsRow}>
                        {v.violatedWords.map((w, j) => (
                          <View key={j} style={styles.wordChip}>
                            <Text style={styles.wordChipText}>{w}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuspendModal} animationType="fade" transparent>
        <View style={styles.suspendOverlay}>
          <View style={styles.suspendCard}>
            <View style={styles.suspendCardHeader}>
              <Text style={styles.suspendCardIcon}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.suspendCardTitle}>Suspend User</Text>
                <Text style={styles.suspendCardSubtitle} numberOfLines={1}>
                  {suspendTarget?.anonName} · {suspendTarget?.violations.length} strike{suspendTarget?.violations.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSuspendModal(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.suspendSelectLabel}>SELECT SUSPENSION DURATION</Text>
            <View style={styles.daysGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, selectedDays === day && styles.dayChipActive]}
                  onPress={() => setSelectedDays(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayChipNum, selectedDays === day && styles.dayChipNumActive]}>{day}</Text>
                  <Text style={[styles.dayChipLabel, selectedDays === day && styles.dayChipLabelActive]}>DAY{day !== 1 ? "S" : ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.suspendDescBox}>
              <Text style={styles.suspendDescText}>{DAY_DESCRIPTIONS[selectedDays]}</Text>
            </View>
            {suspendTarget && getSuggestedDays(suspendTarget.violations.length) === selectedDays && (
              <View style={styles.suggestedBadge}>
                <Text style={styles.suggestedBadgeText}>✦ RECOMMENDED based on {suspendTarget.violations.length} violations</Text>
              </View>
            )}
            <View style={styles.suspendActions}>
              <TouchableOpacity style={styles.suspendCancelBtn} onPress={() => setShowSuspendModal(false)}>
                <Text style={styles.suspendCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suspendConfirmBtn} onPress={handlePressSuspend}>
                <Text style={styles.suspendConfirmText}>SUSPEND {selectedDays}D</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showConfirmModal} animationType="fade" transparent>
        <View style={styles.suspendOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeaderBand}>
              <Text style={styles.confirmHeaderIcon}>⚠️</Text>
            </View>
            <Text style={styles.confirmTitle}>Are you sure?</Text>
            <Text style={styles.confirmBody}>
              You are about to suspend{" "}
              <Text style={{ fontWeight: "900", color: "#000" }}>{suspendTarget?.anonName}</Text>
              {" "}for{" "}
              <Text style={{ fontWeight: "900", color: "#000" }}>{selectedDays} day{selectedDays !== 1 ? "s" : ""}</Text>.
              {"\n\n"}This will restrict their account immediately.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmGoBackBtn}
                onPress={() => { setShowConfirmModal(false); setShowSuspendModal(true); }}
              >
                <Text style={styles.confirmGoBackText}>GO BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmProceedBtn}
                onPress={handleConfirmSuspension}
              >
                <Text style={styles.confirmProceedText}>YES, SUSPEND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.suspendOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successHeaderBand}>
              <Text style={styles.successHeaderIcon}>✅</Text>
            </View>
            <Text style={styles.successTitle}>Account Suspended</Text>
            <Text style={styles.successBody}>
              <Text style={{ fontWeight: "900", color: "#000" }}>{lastSuspension?.anonName}</Text>
              {" "}has been successfully suspended for{" "}
              <Text style={{ fontWeight: "900", color: "#000" }}>{lastSuspension?.days} day{lastSuspension?.days !== 1 ? "s" : ""}</Text>.
              {"\n\n"}Their account will be restricted until{" "}
              <Text style={{ fontWeight: "900", color: "#000" }}>
                {lastSuspension ? new Date(lastSuspension.suspensionUntil).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : ""}
              </Text>.
            </Text>
            <TouchableOpacity
              style={styles.successCloseBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successCloseBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuspendedList} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.suspendedListSheet}>
            <View style={styles.suspendedListHeader}>
              <View style={[styles.headerBadge, { width: 38, height: 38, borderRadius: 19 }]}>
                <Text style={{ fontSize: 16 }}>🚫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Suspended Users</Text>
                <Text style={styles.headerSubtitle}>
                  {activeCount} active · {suspendedUsers.length} total
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSuspendedList(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {suspendedUsers.length > 0 && (
              <View style={[styles.statsRow, { paddingTop: 12 }]}>
                <View style={[styles.statBox, { borderColor: "#EF4444", backgroundColor: "#FEF2F2" }]}>
                  <Text style={styles.statNum}>{activeCount}</Text>
                  <Text style={[styles.statLabel, { color: "#991B1B" }]}>ACTIVE</Text>
                </View>
                <View style={[styles.statBox, { borderColor: "#94A3B8", backgroundColor: "#F8FAFC" }]}>
                  <Text style={styles.statNum}>{suspendedUsers.length - activeCount}</Text>
                  <Text style={[styles.statLabel, { color: "#475569" }]}>EXPIRED</Text>
                </View>
              </View>
            )}

            <FlatList
              data={suspendedUsers}
              renderItem={renderSuspendedCard}
              keyExtractor={u => u.userEmail}
              contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>✅</Text>
                  <Text style={styles.emptyTitle}>No Suspensions</Text>
                  <Text style={styles.emptySubtitle}>There are no suspended users at this time.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderBottomWidth: 2.5, borderColor: "#000", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, elevation: 2, gap: 12 },
  headerBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#000", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFD700" },
  headerBadgeIcon: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#000" },
  headerSubtitle: { fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 2 },
  suspendedListBtn: { backgroundColor: "#000", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: "#FFD700" },
  suspendedListBtnText: { color: "#FFD700", fontWeight: "900", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 10, padding: 14, paddingBottom: 6, backgroundColor: "#F5F7FF" },
  statBox: { flex: 1, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 2, borderColor: "#EF4444" },
  statNum: { fontSize: 22, fontWeight: "900", color: "#000" },
  statLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, marginTop: 2 },
  userCard: { borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2.5, shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 3 },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  rankBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, minWidth: 30, alignItems: "center" },
  rankText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#000" },
  avatarCircleExpired: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  anonName: { fontWeight: "900", color: "#000", fontSize: 14, marginBottom: 2 },
  emailText: { fontWeight: "600", color: "#64748B", fontSize: 10 },
  untilText: { fontWeight: "700", color: "#94A3B8", fontSize: 10, marginTop: 2 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  countBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center", borderWidth: 2, borderColor: "#000" },
  countBadgeNum: { color: "#fff", fontWeight: "900", fontSize: 16, lineHeight: 18 },
  countBadgeLabel: { color: "#fff", fontWeight: "800", fontSize: 7 },
  severityTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1.5, borderColor: "#000" },
  severityTagText: { color: "#fff", fontWeight: "900", fontSize: 9 },
  chevron: { fontSize: 22, color: "#CBD5E1" },
  suspendedCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 2.5, borderColor: "#000", shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.12, shadowRadius: 0, elevation: 3 },
  suspendedCardExpired: { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1", shadowOpacity: 0.05 },
  suspendedCountdownBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" },
  suspendedCountdownBadgeExpired: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1", borderWidth: 1 },
  suspendedCountdownLabel: { color: "#000", fontWeight: "900", fontSize: 12, lineHeight: 16 },
  suspendedCountdownLabelExpired: { color: "#94A3B8" },
  suspendedCountdownSub: { color: "#000", fontWeight: "800", fontSize: 7, letterSpacing: 0.5 },
  suspendedCountdownSubExpired: { color: "#CBD5E1" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#000", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#64748B", fontWeight: "600", textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  detailSheet: { backgroundColor: "#fff", width: "90%", maxHeight: "80%", borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden" },
  detailHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 2.5, borderColor: "#000", gap: 12 },
  detailAvatarCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#000" },
  detailAnonName: { fontSize: 17, fontWeight: "900", color: "#000", marginBottom: 2 },
  detailEmail: { fontSize: 11, fontWeight: "700", color: "#64748B", marginBottom: 6 },
  severityTagLarge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", borderWidth: 2, borderColor: "#000" },
  severityTagLargeText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  closeBtn: { backgroundColor: "#F1F5F9", padding: 8, borderRadius: 10, borderWidth: 2, borderColor: "#000" },
  closeBtnText: { fontWeight: "900", color: "#000", fontSize: 14 },
  actionRow: { padding: 16, borderBottomWidth: 2, borderColor: "#E2E8F0", flexDirection: "row", gap: 10 },
  clearBtn: { flex: 1, backgroundColor: "#FEE2E2", padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 2.5, borderColor: "#EF4444" },
  clearBtnText: { color: "#991B1B", fontWeight: "900", fontSize: 12 },
  suspendBtn: { flex: 1, backgroundColor: "#000", padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 2.5, borderColor: "#FFD700" },
  suspendBtnText: { color: "#FFD700", fontWeight: "900", fontSize: 12 },
  violationListHeader: { fontSize: 11, fontWeight: "900", color: "#64748B", letterSpacing: 1, marginBottom: 14 },
  violationItem: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: "#000" },
  violationTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  violationTypePill: { backgroundColor: "#000", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  violationTypeText: { color: "#FFD700", fontWeight: "900", fontSize: 10 },
  violationTime: { fontSize: 10, color: "#94a3b8", fontWeight: "700" },
  violationContent: { fontSize: 13, color: "#1E293B", fontWeight: "600", lineHeight: 20, fontStyle: "italic", marginBottom: 10 },
  wordsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  wordChip: { backgroundColor: "#FEE2E2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1.5, borderColor: "#EF4444" },
  wordChipText: { color: "#991B1B", fontWeight: "900", fontSize: 11 },
  suspendOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  suspendCard: { backgroundColor: "#fff", width: "88%", borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden" },
  suspendCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#000", padding: 16, borderBottomWidth: 2.5, borderColor: "#FFD700" },
  suspendCardIcon: { fontSize: 24 },
  suspendCardTitle: { fontSize: 16, fontWeight: "900", color: "#FFD700" },
  suspendCardSubtitle: { fontSize: 11, fontWeight: "700", color: "rgba(255,215,0,0.7)", marginTop: 1 },
  suspendSelectLabel: { fontSize: 10, fontWeight: "900", color: "#64748B", letterSpacing: 1.5, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, paddingBottom: 4 },
  dayChip: { width: 60, height: 60, borderRadius: 14, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 2.5, borderColor: "#000" },
  dayChipActive: { backgroundColor: "#FFD700", borderColor: "#000" },
  dayChipNum: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  dayChipNumActive: { color: "#000" },
  dayChipLabel: { fontSize: 8, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5 },
  dayChipLabelActive: { color: "#000" },
  suspendDescBox: { marginHorizontal: 16, marginTop: 12, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, borderWidth: 2, borderColor: "#E2E8F0" },
  suspendDescText: { fontSize: 12, fontWeight: "700", color: "#475569", lineHeight: 18, textAlign: "center" },
  suggestedBadge: { marginHorizontal: 16, marginTop: 8, backgroundColor: "#DCFCE7", borderRadius: 10, padding: 8, borderWidth: 1.5, borderColor: "#16A34A", alignItems: "center" },
  suggestedBadgeText: { fontSize: 10, fontWeight: "900", color: "#15803D" },
  suspendActions: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 12 },
  suspendCancelBtn: { flex: 1, backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 2.5, borderColor: "#000" },
  suspendCancelText: { fontWeight: "900", color: "#64748B", fontSize: 13 },
  suspendConfirmBtn: { flex: 1, backgroundColor: "#000", paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 2.5, borderColor: "#FFD700" },
  suspendConfirmText: { fontWeight: "900", color: "#FFD700", fontSize: 13 },
  confirmCard: { backgroundColor: "#fff", width: "88%", borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden", alignItems: "center", paddingBottom: 20 },
  confirmHeaderBand: { backgroundColor: "#000", width: "100%", alignItems: "center", paddingVertical: 20, borderBottomWidth: 2.5, borderColor: "#FFD700", marginBottom: 20 },
  confirmHeaderIcon: { fontSize: 36 },
  confirmTitle: { fontSize: 18, fontWeight: "900", color: "#000", marginBottom: 10 },
  confirmBody: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center", lineHeight: 20, paddingHorizontal: 20, marginBottom: 20 },
  confirmActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, width: "100%" },
  confirmGoBackBtn: { flex: 1, backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 2.5, borderColor: "#000" },
  confirmGoBackText: { fontWeight: "900", color: "#64748B", fontSize: 13 },
  confirmProceedBtn: { flex: 1, backgroundColor: "#000", paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 2.5, borderColor: "#FFD700" },
  confirmProceedText: { fontWeight: "900", color: "#FFD700", fontSize: 13 },
  successCard: { backgroundColor: "#fff", width: "88%", borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden", alignItems: "center", paddingBottom: 20 },
  successHeaderBand: { backgroundColor: "#000", width: "100%", alignItems: "center", paddingVertical: 20, borderBottomWidth: 2.5, borderColor: "#FFD700", marginBottom: 20 },
  successHeaderIcon: { fontSize: 36 },
  successTitle: { fontSize: 18, fontWeight: "900", color: "#000", marginBottom: 10 },
  successBody: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center", lineHeight: 20, paddingHorizontal: 20, marginBottom: 20 },
  successCloseBtn: { backgroundColor: "#000", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, borderWidth: 2.5, borderColor: "#FFD700" },
  successCloseBtnText: { fontWeight: "900", color: "#FFD700", fontSize: 13 },
  suspendedListSheet: { backgroundColor: "#F5F7FF", width: "92%", maxHeight: "82%", borderRadius: 24, borderWidth: 3, borderColor: "#000", overflow: "hidden" },
  suspendedListHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderBottomWidth: 2.5, borderColor: "#000", gap: 12 },
});