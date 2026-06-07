import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const MAX_STRIKES = 5;

/**
 * UserSuspensionModal
 *
 * Props:
 *  - visible        : boolean
 *  - user           : { email, anonName, ... }
 *  - onLogout       : () => void  — called when user taps LOGOUT
 *  - onClose        : () => void  — called only when suspension is fully lifted (real-time)
 */
const UserSuspensionModal = ({ visible, user, onLogout, onClose }) => {
  // "pending"   → hit 5 strikes, waiting for admin decision
  // "suspended" → admin has set a suspension duration
  // "lifted"    → suspension period has passed
  const [mode, setMode] = useState("pending");
  const [violations, setViolations] = useState([]);
  const [suspensionData, setSuspensionData] = useState(null);
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const pollerRef = useRef(null);

  // ─── Pulse animation for the warning icon ───────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  // ─── Load violations & suspension data ──────────────────────────────────────
  const loadData = async () => {
    if (!user?.email) return;
    try {
      // Load this user's violations
      const storedV = await AsyncStorage.getItem(`@violations_${user.email}`);
      const allV = storedV ? JSON.parse(storedV) : [];
      setViolations(allV);

      // Check if admin has suspended this account
      const storedS = await AsyncStorage.getItem("@suspended_users");
      const allS = storedS ? JSON.parse(storedS) : [];
      const mine = allS.find((s) => s.userEmail === user.email);

      if (mine) {
        setSuspensionData(mine);
        if (Date.now() >= mine.suspensionUntil) {
          // Suspension has expired — lift it
          setMode("lifted");
          if (onClose) onClose();
        } else {
          setMode("suspended");
        }
      } else {
        // No admin action yet — still pending
        setMode("pending");
      }
    } catch (e) {
      console.error("UserSuspensionModal load error:", e);
    }
  };

  // ─── Countdown timer ────────────────────────────────────────────────────────
  const computeRemaining = (until) => {
    const diff = Math.max(0, until - Date.now());
    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return { days, hours, minutes, seconds };
  };

  useEffect(() => {
    if (!visible) {
      clearInterval(timerRef.current);
      clearInterval(pollerRef.current);
      return;
    }

    loadData();

    // Poll AsyncStorage every 5 s so we react to admin decisions in real-time
    pollerRef.current = setInterval(loadData, 5000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollerRef.current);
    };
  }, [visible, user?.email]);

  // Start/stop countdown when suspensionData changes
  useEffect(() => {
    clearInterval(timerRef.current);
    if (mode === "suspended" && suspensionData) {
      const tick = () => {
        const r = computeRemaining(suspensionData.suspensionUntil);
        setRemaining(r);
        if (r.days === 0 && r.hours === 0 && r.minutes === 0 && r.seconds === 0) {
          setMode("lifted");
          clearInterval(timerRef.current);
          if (onClose) onClose();
        }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [mode, suspensionData]);

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const pad = (n) => String(n).padStart(2, "0");

  const renderCountdown = () => (
    <View style={styles.countdownRow}>
      {[
        { val: remaining.days, label: "DAYS" },
        { val: remaining.hours, label: "HRS" },
        { val: remaining.minutes, label: "MIN" },
        { val: remaining.seconds, label: "SEC" },
      ].map((item, i) => (
        <React.Fragment key={item.label}>
          <View style={styles.countdownBox}>
            <Text style={styles.countdownNum}>{pad(item.val)}</Text>
            <Text style={styles.countdownLabel}>{item.label}</Text>
          </View>
          {i < 3 && <Text style={styles.countdownColon}>:</Text>}
        </React.Fragment>
      ))}
    </View>
  );

  const renderViolationItem = (v, index) => (
    <View key={v.id || index} style={styles.violationItem}>
      <View style={styles.violationTopRow}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{(v.type || "VIOLATION").toUpperCase()}</Text>
        </View>
        <Text style={styles.violationDate}>
          {v.timestamp
            ? new Date(typeof v.timestamp === "number" ? v.timestamp : v.timestamp).toLocaleDateString()
            : "—"}
        </Text>
      </View>
      <Text style={styles.violationContent}>"{v.content || "N/A"}"</Text>
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
  );

  // ─── Content by mode ─────────────────────────────────────────────────────────
  const renderBody = () => {
    if (mode === "suspended" && suspensionData) {
      return (
        <>
          {/* Icon */}
          <Animated.Text style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}>
            🔒
          </Animated.Text>

          <Text style={styles.title}>ACCOUNT SUSPENDED</Text>
          <Text style={styles.subtitle}>
            Your account has been suspended by an administrator due to repeated violations of
            community guidelines. You cannot access CampusMatch until your suspension period ends.
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownTitle}>TIME REMAINING</Text>
            {renderCountdown()}
            <Text style={styles.countdownNote}>
              Suspended for{" "}
              <Text style={{ fontWeight: "900", color: "#EF4444" }}>
                {suspensionData.days} day{suspensionData.days !== 1 ? "s" : ""}
              </Text>{" "}
              · Lifts on{" "}
              {new Date(suspensionData.suspensionUntil).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {/* Violations that caused this */}
          <Text style={styles.sectionHeader}>VIOLATIONS THAT LED TO THIS SUSPENSION</Text>
          <ScrollView style={styles.violationScroll} showsVerticalScrollIndicator={false}>
            {violations.map((v, i) => renderViolationItem(v, i))}
          </ScrollView>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⚠️ Your account will be automatically reactivated once the suspension period ends.
              Further violations after reinstatement may result in a permanent ban.
            </Text>
          </View>
        </>
      );
    }

    // Default: PENDING (5 strikes hit, waiting for admin)
    return (
      <>
        <Animated.Text style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}>
          ⚠️
        </Animated.Text>

        <Text style={styles.title}>MAXIMUM STRIKES REACHED</Text>
        <Text style={styles.subtitle}>
          You have reached the maximum limit of{" "}
          <Text style={{ fontWeight: "900", color: "#EF4444" }}>{MAX_STRIKES} strikes</Text>.
          Your account has been flagged and is now pending a suspension decision from our
          moderation team. You cannot continue using CampusMatch until this matter is resolved.
        </Text>

        {/* Strike counter */}
        <View style={styles.strikeDisplay}>
          <Text style={styles.strikeNum}>{violations.length}</Text>
          <Text style={styles.strikeSlash}>/</Text>
          <Text style={styles.strikeMax}>{MAX_STRIKES}</Text>
          <Text style={styles.strikeLabel}>STRIKES</Text>
        </View>

        {/* All violating content */}
        <Text style={styles.sectionHeader}>CONTENT THAT FLAGGED YOUR ACCOUNT</Text>
        <ScrollView style={styles.violationScroll} showsVerticalScrollIndicator={false}>
          {violations.map((v, i) => renderViolationItem(v, i))}
        </ScrollView>

        <View style={styles.pendingBox}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={styles.pendingText}>
            Waiting for admin decision. You will be notified of the outcome. Logging back in will
            show you this screen until the review is complete or your suspension is resolved.
          </Text>
        </View>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top danger bar */}
          <View
            style={[
              styles.dangerBar,
              mode === "suspended" ? styles.dangerBarSuspended : styles.dangerBarPending,
            ]}
          >
            <Text style={styles.dangerBarText}>
              {mode === "suspended" ? "🚫  ACCOUNT SUSPENDED" : "⚠️  ACCOUNT UNDER REVIEW"}
            </Text>
          </View>

          {/* Scrollable body */}
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {renderBody()}
          </ScrollView>

          {/* Logout button — always at bottom */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
              <Text style={styles.logoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    width: width * 0.92,
    maxHeight: "88%",
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: "#000",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 16,
  },
  dangerBar: {
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderColor: "#000",
  },
  dangerBarPending: { backgroundColor: "#FEF08A" },
  dangerBarSuspended: { backgroundColor: "#FEE2E2" },
  dangerBarText: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#000",
  },
  scrollBody: {
    padding: 22,
    alignItems: "center",
  },
  icon: {
    fontSize: 52,
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#EF4444",
    textAlign: "center",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 4,
  },

  // Strike display (pending mode)
  strikeDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
    backgroundColor: "#FFF5F5",
    borderWidth: 2.5,
    borderColor: "#EF4444",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 4,
  },
  strikeNum: { fontSize: 48, fontWeight: "900", color: "#EF4444", lineHeight: 52 },
  strikeSlash: { fontSize: 28, fontWeight: "900", color: "#94A3B8", marginBottom: 4 },
  strikeMax: { fontSize: 28, fontWeight: "900", color: "#94A3B8", marginBottom: 4 },
  strikeLabel: { fontSize: 11, fontWeight: "900", color: "#64748B", marginLeft: 8, marginBottom: 8, letterSpacing: 1 },

  // Countdown (suspended mode)
  countdownContainer: {
    width: "100%",
    backgroundColor: "#FFF5F5",
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: "#EF4444",
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  countdownTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#94A3B8",
    marginBottom: 10,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countdownBox: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 52,
  },
  countdownNum: { fontSize: 24, fontWeight: "900", color: "#FFD700", letterSpacing: 1 },
  countdownLabel: { fontSize: 8, fontWeight: "900", color: "#94A3B8", marginTop: 2 },
  countdownColon: { fontSize: 22, fontWeight: "900", color: "#EF4444", marginBottom: 10 },
  countdownNote: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },

  // Violations list
  sectionHeader: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#64748B",
    alignSelf: "flex-start",
    marginBottom: 10,
    marginTop: 4,
  },
  violationScroll: {
    width: "100%",
    maxHeight: 220,
    marginBottom: 16,
  },
  violationItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  violationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  typePill: {
    backgroundColor: "#000",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillText: { color: "#FFD700", fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },
  violationDate: { fontSize: 10, color: "#94A3B8", fontWeight: "700" },
  violationContent: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 6,
  },
  wordsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  wordChip: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  wordChipText: { color: "#991B1B", fontWeight: "900", fontSize: 10 },

  // Info / pending boxes
  infoBox: {
    width: "100%",
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#F59E0B",
    borderStyle: "dashed",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    textAlign: "center",
    lineHeight: 17,
  },
  pendingBox: {
    width: "100%",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  pendingIcon: { fontSize: 18 },
  pendingText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 17,
  },

  // Footer / logout
  footer: {
    padding: 16,
    borderTopWidth: 2.5,
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  logoutBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#FFD700",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  logoutBtnText: {
    color: "#FFD700",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 2,
  },
});

export default UserSuspensionModal;