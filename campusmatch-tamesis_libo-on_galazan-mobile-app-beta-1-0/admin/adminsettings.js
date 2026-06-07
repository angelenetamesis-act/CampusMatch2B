import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Switch, Platform, Animated, Share
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AdminSettingsScreen({ adminUser, onLogout }) {
  const [totalUsers, setTotalUsers]           = useState(0);
  const [totalPosts, setTotalPosts]           = useState(0);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showClearModal, setShowClearModal]   = useState(false);
  const [clearTarget, setClearTarget]         = useState("");
  const [notifEnabled, setNotifEnabled]       = useState(true);
  const [now]                                 = useState(new Date());

  // FIX: initialize directly from adminUser prop so it shows immediately on render
  const [registeredEmail, setRegisteredEmail] = useState(adminUser?.email || "");

  // FIX: seed adminProfile from adminUser prop right away — no waiting for loadStats
  const [adminProfile, setAdminProfile] = useState({
    fullName:    adminUser?.fullName  || "",
    email:       adminUser?.email     || "",
    id:          adminUser?.id        || "",
    role:        "System Administrator",
    university:  "Carlos Hilado Memorial State University",
    accessLevel: "Full Control Panel",
  });

  // NEW: Collapsible Admin Info dropdown
  const [adminInfoExpanded, setAdminInfoExpanded] = useState(false);
  const adminInfoAnim = useRef(new Animated.Value(0)).current;

  // NEW: Change Password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword]     = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // NEW: Audit Log modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs]           = useState([]);

  // NEW: Last Login info
  const [lastLogin, setLastLogin] = useState("");

  // NEW: Security toggles
  const [twoFAEnabled, setTwoFAEnabled]       = useState(true);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);

  // NEW: Dark mode toggle (stored preference)
  const [darkMode, setDarkMode] = useState(false);

  // NEW: Storage usage
  const [storageInfo, setStorageInfo] = useState({ used: "—", total: "5 MB" });

  const loadStats = useCallback(async () => {
    try {
      // Try all sources in order — use first one that has fullName + id
      let resolved = null;

      // SOURCE 1: adminUser prop passed directly from login state
      if (adminUser?.fullName && adminUser?.id && adminUser?.email) {
        resolved = adminUser;
      }

      // SOURCE 2: @current_admin written at login time
      if (!resolved) {
        const currentAdminRaw = await AsyncStorage.getItem("@current_admin");
        if (currentAdminRaw) {
          const parsed = JSON.parse(currentAdminRaw);
          if (parsed?.fullName && parsed?.id) resolved = parsed;
        }
      }

      // SOURCE 3: read @admins_db directly — filter out corrupt records first
      if (!resolved) {
        const adminsRaw = await AsyncStorage.getItem("@admins_db");
        if (adminsRaw) {
          const admins = JSON.parse(adminsRaw);
          // Only consider records that have all three required fields
          const validAdmins = admins.filter(a => a.fullName && a.id && a.email);
          if (validAdmins.length > 0) {
            // Try to match by stored email first, else take the latest valid record
            const emailKey = await AsyncStorage.getItem("@admin_email");
            const match = emailKey
              ? validAdmins.find(a => a.email === emailKey.toLowerCase().trim())
              : null;
            resolved = match || validAdmins[validAdmins.length - 1];
          }
          // Auto-clean: overwrite @admins_db keeping only valid records
          if (validAdmins.length !== admins.length) {
            await AsyncStorage.setItem("@admins_db", JSON.stringify(validAdmins));
          }
        }
      }

      if (resolved) {
        setAdminProfile({
          fullName:    resolved.fullName    || "",
          email:       resolved.email       || "",
          id:          resolved.id          || "",
          role:        "System Administrator",
          university:  "Carlos Hilado Memorial State University",
          accessLevel: "Full Control Panel",
        });
        setRegisteredEmail(resolved.email || "");
        // Also keep @current_admin and @admin_email in sync
        await AsyncStorage.setItem("@current_admin", JSON.stringify(resolved));
        await AsyncStorage.setItem("@admin_email", resolved.email);
      } else {
        Alert.alert(
          "No Admin Profile Found",
          "Your account data could not be loaded. Please log out and register again.",
          [{ text: "Logout", onPress: onLogout }]
        );
      }

      // FETCHING STATS
      const usersRaw  = await AsyncStorage.getItem("@users_db");
      const postsRaw  = await AsyncStorage.getItem("@all_sparks");
      const annRaw    = await AsyncStorage.getItem("@admin_announcements");
      const violRaw   = await AsyncStorage.getItem("@violations_log");

      const users  = usersRaw ? JSON.parse(usersRaw) : [];
      const posts  = postsRaw ? JSON.parse(postsRaw) : [];
      const ann    = annRaw   ? JSON.parse(annRaw)   : [];
      const viol   = violRaw  ? JSON.parse(violRaw)  : [];

      setTotalUsers(users.length);
      setTotalPosts(posts.filter(p => !p.isDeleted).length);
      setTotalAnnouncements(ann.length);
      setTotalViolations(viol.length);

      // Load audit logs
      const auditRaw = await AsyncStorage.getItem("@admin_audit_log");
      const audit = auditRaw ? JSON.parse(auditRaw) : [];
      setAuditLogs(audit.slice(-30).reverse()); // last 30 entries, newest first

      // Load last login timestamp
      const lastLoginRaw = await AsyncStorage.getItem("@admin_last_login");
      if (lastLoginRaw) {
        setLastLogin(lastLoginRaw);
      } else {
        const ts = new Date().toISOString();
        await AsyncStorage.setItem("@admin_last_login", ts);
        setLastLogin(ts);
      }

      // Load preferences
      const darkRaw = await AsyncStorage.getItem("@admin_dark_mode");
      setDarkMode(darkRaw === "true");

      const notifRaw = await AsyncStorage.getItem("@admin_notif_enabled");
      setNotifEnabled(notifRaw !== "false");

      const twoFARaw = await AsyncStorage.getItem("@admin_2fa_enabled");
      setTwoFAEnabled(twoFARaw !== "false");

      const loginAlertRaw = await AsyncStorage.getItem("@admin_login_alerts");
      setLoginAlertsEnabled(loginAlertRaw !== "false");

      // Approximate storage usage
      const keys = await AsyncStorage.getAllKeys();
      let totalChars = 0;
      const allPairs = await AsyncStorage.multiGet(keys);
      allPairs.forEach(([, val]) => { if (val) totalChars += val.length; });
      const kb = (totalChars / 1024).toFixed(1);
      setStorageInfo({ used: `${kb} KB`, total: "5 MB" });

    } catch (e) { console.error(e); }
  }, [adminUser]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Animate admin info dropdown
  const toggleAdminInfo = () => {
    const toValue = adminInfoExpanded ? 0 : 1;
    setAdminInfoExpanded(!adminInfoExpanded);
    Animated.spring(adminInfoAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  };

  const adminInfoHeight = adminInfoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 290],
  });

  const arrowRotation = adminInfoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Helpers
  const handleClearData = async (target) => {
    try {
      const keyMap = {
        "Announcements": "@admin_announcements",
        "Student Posts":  "@all_sparks",
        "Violations Log": "@violations_log",
        "Approaches":     "@admin_approaches",
      };
      const key = keyMap[target];
      if (key) await AsyncStorage.setItem(key, JSON.stringify([]));
      await appendAuditLog(`Cleared data: ${target}`);
      Alert.alert("Done", `${target} data has been cleared.`);
      setShowClearModal(false);
      loadStats();
    } catch (e) {
      Alert.alert("Error", "Could not clear data.");
    }
  };

  const appendAuditLog = async (action) => {
    try {
      const raw = await AsyncStorage.getItem("@admin_audit_log");
      const logs = raw ? JSON.parse(raw) : [];
      logs.push({ action, timestamp: new Date().toISOString() });
      await AsyncStorage.setItem("@admin_audit_log", JSON.stringify(logs));
    } catch (_) {}
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("ALL FIELDS ARE REQUIRED");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("NEW PASSWORDS DO NOT MATCH");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("PASSWORD MUST BE AT LEAST 6 CHARACTERS");
      return;
    }
    try {
      const currentAdminRaw = await AsyncStorage.getItem("@current_admin");
      const currentAdmin = currentAdminRaw ? JSON.parse(currentAdminRaw) : null;

      if (!currentAdmin || currentAdmin.password !== oldPassword) {
        setPasswordError("CURRENT PASSWORD IS INCORRECT");
        return;
      }

      // Update in admins_db
      const adminsRaw = await AsyncStorage.getItem("@admins_db");
      const admins = adminsRaw ? JSON.parse(adminsRaw) : [];
      const updatedAdmins = admins.map(a =>
        a.email === currentAdmin.email ? { ...a, password: newPassword } : a
      );
      await AsyncStorage.setItem("@admins_db", JSON.stringify(updatedAdmins));

      // Update current session
      await AsyncStorage.setItem("@current_admin", JSON.stringify({ ...currentAdmin, password: newPassword }));

      await appendAuditLog("Changed account password");
      setOldPassword(""); setNewPassword(""); setConfirmNewPassword("");
      setShowChangePasswordModal(false);
      Alert.alert("Success", "Password updated successfully.");
    } catch (e) {
      Alert.alert("Error", "Could not update password.");
    }
  };

  const handleExportData = async () => {
    try {
      const keys = [
        "@users_db", "@all_sparks", "@admin_announcements",
        "@violations_log", "@admin_audit_log"
      ];
      const pairs = await AsyncStorage.multiGet(keys);
      const exportObj = {};
      pairs.forEach(([key, val]) => {
        exportObj[key] = val ? JSON.parse(val) : [];
      });
      const jsonString = JSON.stringify(exportObj, null, 2);
      await Share.share({
        message: jsonString,
        title: "CHMSU Admin Data Export",
      });
      await appendAuditLog("Exported system data");
    } catch (e) {
      Alert.alert("Error", "Could not export data.");
    }
  };

  const handleForceLogoutAll = async () => {
    try {
      await AsyncStorage.removeItem("@current_admin");
      await appendAuditLog("Force logout: all sessions cleared");
      Alert.alert("Sessions Cleared", "All active sessions have been terminated.", [
        { text: "OK", onPress: onLogout }
      ]);
    } catch (e) {
      Alert.alert("Error", "Could not clear sessions.");
    }
  };

  const handleToggleDarkMode = async (val) => {
    setDarkMode(val);
    await AsyncStorage.setItem("@admin_dark_mode", val.toString());
    await appendAuditLog(`Dark mode ${val ? "enabled" : "disabled"}`);
  };

  const handleToggleNotif = async (val) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem("@admin_notif_enabled", val.toString());
  };

  const handleToggle2FA = async (val) => {
    setTwoFAEnabled(val);
    await AsyncStorage.setItem("@admin_2fa_enabled", val.toString());
    await appendAuditLog(`2FA ${val ? "enabled" : "disabled"}`);
  };

  const handleToggleLoginAlerts = async (val) => {
    setLoginAlertsEnabled(val);
    await AsyncStorage.setItem("@admin_login_alerts", val.toString());
  };

  const formatDate = (d) =>
    d.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const formatTimestamp = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  const ADMIN_INFO_ROWS = [
    { label: "Full Name",     value: adminProfile.fullName    || "—" },
    { label: "Email",         value: adminProfile.email       || registeredEmail },
    { label: "Admin ID",      value: adminProfile.id          || "—" },
    { label: "Role",          value: adminProfile.role },
    { label: "University",    value: "CHMSU" },
    { label: "Access Level",  value: adminProfile.accessLevel },
    { label: "Session Date",  value: formatDate(now) },
    { label: "Last Login",    value: lastLogin ? formatTimestamp(lastLogin) : "—" },
  ];

  const CLEAR_OPTIONS = ["Announcements", "Student Posts", "Violations Log", "Approaches"];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F7FF" }} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* PROFILE CARD */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatarRing}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarIcon}>🛡️</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.profileName}>
            {adminProfile.fullName
              ? adminProfile.fullName.toUpperCase()
              : registeredEmail.split("@")[0]?.toUpperCase() || "ADMINISTRATOR"}
          </Text>
          <Text style={styles.profileEmail}>{adminProfile.email || registeredEmail}</Text>
        </View>
      </View>

      {/* SYSTEM STATS */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>SYSTEM OVERVIEW</Text>
        </View>
        <View style={styles.statsGrid}>
          {[
            { num: totalUsers,         label: "STUDENTS",      color: "#3B82F6", bg: "#EFF6FF" },
            { num: totalPosts,         label: "ACTIVE POSTS",  color: "#10B981", bg: "#ECFDF5" },
            { num: totalAnnouncements, label: "ANNOUNCEMENTS", color: "#8B5CF6", bg: "#F5F3FF" },
            { num: totalViolations,    label: "VIOLATIONS",    color: "#EF4444", bg: "#FEF2F2" },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.color }]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ADMIN INFORMATION — Collapsible Dropdown */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>ADMIN INFORMATION</Text>
        </View>
        <View style={styles.infoCard}>
          <TouchableOpacity style={styles.dropdownHeader} onPress={toggleAdminInfo} activeOpacity={0.85}>
            <View style={styles.dropdownHeaderLeft}>
              <Text style={styles.dropdownHeaderIcon}>👤</Text>
              <Text style={styles.dropdownHeaderText}>View Admin Profile</Text>
            </View>
            <Animated.Text style={[styles.dropdownArrow, { transform: [{ rotate: arrowRotation }] }]}>▼</Animated.Text>
          </TouchableOpacity>

          <Animated.View style={[styles.dropdownBody, { height: adminInfoHeight, overflow: "hidden" }]}>
            <View style={styles.dropdownDivider} />
            {ADMIN_INFO_ROWS.map(({ label, value }) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoKey}>{label}</Text>
                <Text style={styles.infoVal} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>

      {/* ACCOUNT SECURITY */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>ACCOUNT SECURITY</Text>
        </View>
        <View style={styles.prefCard}>
          {/* 2FA Toggle */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Two-Factor Authentication</Text>
              <Text style={styles.prefSubtitle}>Require OTP on every login</Text>
            </View>
            <Switch
              value={twoFAEnabled}
              onValueChange={handleToggle2FA}
              trackColor={{ false: "#E2E8F0", true: "#34D399" }}
              thumbColor={twoFAEnabled ? "#000" : "#94a3b8"}
            />
          </View>
          <View style={styles.prefDivider} />
          {/* Login Alerts Toggle */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Login Alerts</Text>
              <Text style={styles.prefSubtitle}>Get notified on new sign-ins</Text>
            </View>
            <Switch
              value={loginAlertsEnabled}
              onValueChange={handleToggleLoginAlerts}
              trackColor={{ false: "#E2E8F0", true: "#FFD700" }}
              thumbColor={loginAlertsEnabled ? "#000" : "#94a3b8"}
            />
          </View>
          <View style={styles.prefDivider} />
          {/* Change Password */}
          <TouchableOpacity
            style={styles.clearRow}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <View>
              <Text style={styles.actionRowText}>Change Password</Text>
              <Text style={styles.actionRowSub}>Update your admin account password</Text>
            </View>
            <Text style={styles.actionRowArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.prefDivider} />
          {/* Force Logout All Sessions */}
          <TouchableOpacity
            style={styles.clearRow}
            onPress={() =>
              Alert.alert(
                "Force Logout",
                "This will terminate all active admin sessions. You will be logged out.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Confirm", style: "destructive", onPress: handleForceLogoutAll },
                ]
              )
            }
          >
            <View>
              <Text style={[styles.actionRowText, { color: "#EF4444" }]}>Force Logout All Sessions</Text>
              <Text style={styles.actionRowSub}>Terminate all active admin sessions</Text>
            </View>
            <Text style={[styles.actionRowArrow, { color: "#EF4444" }]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PREFERENCES */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
        </View>
        <View style={styles.prefCard}>
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Violation Notifications</Text>
              <Text style={styles.prefSubtitle}>Alert when a student is flagged</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotif}
              trackColor={{ false: "#E2E8F0", true: "#FFD700" }}
              thumbColor={notifEnabled ? "#000" : "#94a3b8"}
            />
          </View>
          <View style={styles.prefDivider} />
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Dark Mode</Text>
              <Text style={styles.prefSubtitle}>Switch to dark interface theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: "#E2E8F0", true: "#000" }}
              thumbColor={darkMode ? "#FFD700" : "#94a3b8"}
            />
          </View>
        </View>
      </View>

      {/* SYSTEM TOOLS */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>SYSTEM TOOLS</Text>
        </View>
        <View style={styles.prefCard}>
          {/* Audit Log */}
          <TouchableOpacity
            style={styles.clearRow}
            onPress={() => { setShowAuditModal(true); }}
          >
            <View>
              <Text style={styles.actionRowText}>Activity / Audit Log</Text>
              <Text style={styles.actionRowSub}>View recent admin actions</Text>
            </View>
            <Text style={styles.actionRowArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.prefDivider} />
          {/* Export Data */}
          <TouchableOpacity style={styles.clearRow} onPress={handleExportData}>
            <View>
              <Text style={styles.actionRowText}>Export System Data</Text>
              <Text style={styles.actionRowSub}>Share all data as JSON backup</Text>
            </View>
            <Text style={styles.actionRowArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.prefDivider} />
          {/* Storage Usage */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Storage Usage</Text>
              <Text style={styles.prefSubtitle}>Local data stored on this device</Text>
            </View>
            <View style={styles.storageBadge}>
              <Text style={styles.storageBadgeText}>{storageInfo.used}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* DATA MANAGEMENT */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
        </View>
        <View style={styles.infoCard}>
          {CLEAR_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={styles.clearRow}
              onPress={() => { setClearTarget(opt); setShowClearModal(true); }}
            >
              <Text style={styles.clearRowText}>Clear {opt}</Text>
              <Text style={styles.clearRowArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* APP INFO */}
      <View style={styles.sectionContainer}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>App Version</Text>
            <Text style={styles.infoVal}>v130.130</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Build</Text>
            <Text style={styles.infoVal}>Admin Control Panel</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>University</Text>
            <Text style={styles.infoVal}>CHMSU</Text>
          </View>
        </View>
      </View>

      {/* LOGOUT BUTTON */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={styles.logoutBtnText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* LOGOUT CONFIRM MODAL */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Log Out?</Text>
            <Text style={styles.confirmSub}>
              You will be returned to the admin login screen.
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={() => { setShowLogoutModal(false); onLogout(); }}
              >
                <Text style={styles.confirmLogoutBtnText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CLEAR DATA CONFIRM MODAL */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>🗑️</Text>
            <Text style={styles.confirmTitle}>Clear {clearTarget}?</Text>
            <Text style={styles.confirmSub}>
              This action is permanent and cannot be undone.
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmLogoutBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => handleClearData(clearTarget)}
              >
                <Text style={styles.confirmLogoutBtnText}>CLEAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide">
        <View style={styles.overlayCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>🔐</Text>
            <Text style={styles.confirmTitle}>Change Password</Text>
            <Text style={styles.confirmSub}>Enter your current password and choose a new one.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={oldPassword}
              onChangeText={t => { setPasswordError(""); setOldPassword(t); }}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={newPassword}
              onChangeText={t => { setPasswordError(""); setNewPassword(t); }}
            />
            <TextInput
              style={[styles.modalInput, { marginBottom: 4 }]}
              placeholder="Confirm New Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={t => { setPasswordError(""); setConfirmNewPassword(t); }}
            />
            {passwordError ? (
              <Text style={styles.modalErrorText}>{passwordError}</Text>
            ) : (
              <View style={{ height: 14 }} />
            )}

            <View style={[styles.confirmBtnRow, { marginTop: 8 }]}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); setPasswordError("");
                }}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmLogoutBtn, { backgroundColor: "#3B82F6" }]}
                onPress={handleChangePassword}
              >
                <Text style={styles.confirmLogoutBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AUDIT LOG MODAL */}
      <Modal visible={showAuditModal} transparent animationType="slide">
        <View style={styles.overlayCenter}>
          <View style={[styles.confirmCard, { width: "92%", maxHeight: "75%" }]}>
            <Text style={styles.confirmIcon}>📋</Text>
            <Text style={styles.confirmTitle}>Activity Log</Text>
            <Text style={styles.confirmSub}>Recent admin actions on this device.</Text>

            <ScrollView style={{ width: "100%", maxHeight: 280, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              {auditLogs.length === 0 ? (
                <Text style={styles.auditEmpty}>No activity recorded yet.</Text>
              ) : (
                auditLogs.map((log, i) => (
                  <View key={i} style={styles.auditRow}>
                    <Text style={styles.auditAction}>{log.action}</Text>
                    <Text style={styles.auditTime}>{formatTimestamp(log.timestamp)}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmLogoutBtn, { width: "100%", backgroundColor: "#000" }]}
              onPress={() => setShowAuditModal(false)}
            >
              <Text style={styles.confirmLogoutBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#000",
    margin: 16, borderRadius: 20, padding: 20, gap: 16,
    borderWidth: 3, borderColor: "#FFD700",
    shadowColor: "#FFD700", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 0, elevation: 6
  },
  profileAvatarRing: { position: "relative" },
  profileAvatar: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#FFD700",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff"
  },
  profileAvatarIcon: { fontSize: 34 },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#34D399", borderWidth: 2, borderColor: "#000"
  },
  adminBadge: {
    backgroundColor: "#FFD700", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 2, borderColor: "#fff", alignSelf: "flex-start", marginBottom: 4
  },
  adminBadgeText: { color: "#000", fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  profileName: { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  profileEmail: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginTop: 2 },
  sectionContainer: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabelRow: { marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: "#64748B", letterSpacing: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1, minWidth: "44%", borderRadius: 14, padding: 14,
    alignItems: "center", borderWidth: 2.5,
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2
  },
  statNum: { fontSize: 28, fontWeight: "900" },
  statLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, marginTop: 2 },
  infoCard: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 2.5, borderColor: "#000", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 3
  },
  // Dropdown
  dropdownHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16,
  },
  dropdownHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dropdownHeaderIcon: { fontSize: 20 },
  dropdownHeaderText: { fontSize: 14, fontWeight: "800", color: "#000" },
  dropdownArrow: { fontSize: 13, fontWeight: "900", color: "#64748B" },
  dropdownBody: { paddingHorizontal: 0 },
  dropdownDivider: { height: 1.5, backgroundColor: "#F1F5F9", marginHorizontal: 0 },
  //
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1.5, borderBottomColor: "#F1F5F9"
  },
  infoKey: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  infoVal: { fontSize: 12, fontWeight: "700", color: "#000", maxWidth: "60%", textAlign: "right" },
  prefCard: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 2.5, borderColor: "#000", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 3
  },
  prefRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16
  },
  prefDivider: { height: 1.5, backgroundColor: "#F1F5F9", marginHorizontal: 0 },
  prefTitle: { fontSize: 14, fontWeight: "800", color: "#000", marginBottom: 2 },
  prefSubtitle: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  clearRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, borderBottomWidth: 1.5, borderBottomColor: "#F1F5F9"
  },
  clearRowText: { fontSize: 13, fontWeight: "800", color: "#EF4444" },
  clearRowArrow: { fontSize: 16, color: "#EF4444", fontWeight: "900" },
  actionRowText: { fontSize: 13, fontWeight: "800", color: "#000" },
  actionRowSub: { fontSize: 10, fontWeight: "600", color: "#64748B", marginTop: 2 },
  actionRowArrow: { fontSize: 16, color: "#000", fontWeight: "900" },
  storageBadge: {
    backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 2, borderColor: "#000"
  },
  storageBadgeText: { fontSize: 12, fontWeight: "900", color: "#000" },
  logoutBtn: {
    backgroundColor: "#000", padding: 18, borderRadius: 16, alignItems: "center",
    borderWidth: 3, borderColor: "#FFD700",
    shadowColor: "#FFD700", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.5, shadowRadius: 0, elevation: 5
  },
  logoutBtnText: { color: "#FFD700", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  overlayCenter: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center"
  },
  confirmCard: {
    backgroundColor: "#fff", width: "85%", borderRadius: 24, padding: 28,
    alignItems: "center", borderWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10
  },
  confirmIcon: { fontSize: 44, marginBottom: 12 },
  confirmTitle: { fontSize: 22, fontWeight: "900", color: "#000", marginBottom: 8 },
  confirmSub: { fontSize: 13, fontWeight: "600", color: "#64748B", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  confirmBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1, backgroundColor: "#F1F5F9", padding: 14, borderRadius: 12,
    alignItems: "center", borderWidth: 2.5, borderColor: "#000"
  },
  cancelBtnText: { fontWeight: "900", color: "#000", fontSize: 13 },
  confirmLogoutBtn: {
    flex: 1, backgroundColor: "#000", padding: 14, borderRadius: 12,
    alignItems: "center", borderWidth: 2.5, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  confirmLogoutBtnText: { fontWeight: "900", color: "#FFD700", fontSize: 13 },
  modalInput: {
    width: "100%", backgroundColor: "#F8FAFC", borderWidth: 2.5, borderColor: "#000",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 12
  },
  modalErrorText: {
    color: "#EF4444", fontSize: 11, fontWeight: "900",
    textAlign: "center", marginBottom: 8, letterSpacing: 0.5
  },
  auditEmpty: { textAlign: "center", color: "#94A3B8", fontWeight: "700", fontSize: 13, paddingVertical: 20 },
  auditRow: {
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1.5, borderBottomColor: "#F1F5F9"
  },
  auditAction: { fontSize: 13, fontWeight: "800", color: "#000", marginBottom: 2 },
  auditTime: { fontSize: 10, fontWeight: "600", color: "#64748B" },
});