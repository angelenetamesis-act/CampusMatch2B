import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AdminFeedScreen from "./adminfeed";
import AdminUsersScreen from "./adminusers";
import AdminMessagesScreen from "./adminmessages";
import AdminViolationsScreen from "./adminviolation";
import AdminSettingsScreen from "./adminsettings";

const AdminHomeScreen = ({ onLogout, adminUser }) => {
  const [activeTab, setActiveTab] = useState("Home");
  const [resolvedAdmin, setResolvedAdmin] = useState(adminUser || null);
  
  // NEW STATES FOR BADGES
  const [hasNewEnrollees, setHasNewEnrollees] = useState(false);
  const [hasNewApproaches, setHasNewApproaches] = useState(false);
  const [hasNewViolations, setHasNewViolations] = useState(false);

  useEffect(() => {
    if (adminUser?.email && adminUser?.fullName && adminUser?.id) {
      setResolvedAdmin(adminUser);
    } else {
      AsyncStorage.getItem("@current_admin").then((raw) => {
        if (raw) {
          try { setResolvedAdmin(JSON.parse(raw)); } catch (_) {}
        }
      });
    }
  }, [adminUser]);

  // POLL FOR UPDATES
  useEffect(() => {
    const checkUpdates = async () => {
      const enrollees = await AsyncStorage.getItem("@new_enrollees");
      const approaches = await AsyncStorage.getItem("@new_approaches");
      const violations = await AsyncStorage.getItem("@new_violations");

      setHasNewEnrollees(enrollees === "true");
      setHasNewApproaches(approaches === "true");
      setHasNewViolations(violations === "true");
    };

    const interval = setInterval(checkUpdates, 2000);
    return () => clearInterval(interval);
  }, []);

  const navTabs = [
    { key: "Home",       label: "HOME",      icon: "https://cdn-icons-png.flaticon.com/512/1946/1946436.png" },
    { key: "Users",      label: "ENROLLEES",  icon: "https://cdn-icons-png.flaticon.com/512/681/681494.png" },
    { key: "Messages",   label: "APPROACHES", icon: "https://cdn-icons-png.flaticon.com/512/589/589708.png" },
    { key: "Violations", label: "VIOLATIONS", icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png" },
    { key: "Settings",   label: "SETTINGS",   icon: "https://cdn-icons-png.flaticon.com/512/2040/2040504.png" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Home":       return <AdminFeedScreen adminUser={resolvedAdmin} />;
      case "Users":      return <AdminUsersScreen adminUser={resolvedAdmin} />;
      case "Messages":   return <AdminMessagesScreen adminUser={resolvedAdmin} />;
      case "Violations": return <AdminViolationsScreen />;
      case "Settings":   return <AdminSettingsScreen adminUser={resolvedAdmin} onLogout={onLogout} />;
      default:           return <AdminFeedScreen adminUser={resolvedAdmin} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.logoText}>CampusMatch</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerSubtitle}>Control Panel</Text>
        </View>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.navTab, isActive && styles.navTabActive]}
            >
              <Image
                source={{ uri: tab.icon }}
                style={[styles.navIcon, { tintColor: isActive ? "#000" : "#64748B" }]}
              />
              <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>
                {tab.label}
              </Text>
              
              {/* BADGE LOGIC */}
              {tab.key === "Users" && hasNewEnrollees && <View style={styles.badgeDot} />}
              {tab.key === "Messages" && hasNewApproaches && <View style={styles.badgeDot} />}
              {tab.key === "Violations" && hasNewViolations && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  topHeader: {
    height: 65, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20,
    backgroundColor: "#fff", borderBottomWidth: 3, borderColor: "#000",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  adminBadge: {
    backgroundColor: "#000", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 2, borderColor: "#FFD700"
  },
  adminBadgeText: { color: "#FFD700", fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  logoText: { fontSize: 22, fontWeight: "900", color: "#000", letterSpacing: -1 },
  headerRight: { alignItems: "flex-end" },
  headerSubtitle: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 1 },
  bottomNav: {
    height: 60,
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 20 : 12,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#000",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  navTab: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 6 },
  navTabActive: { backgroundColor: "#FFD700" },
  navIcon: { width: 16, height: 16, marginBottom: 2 },
  navTabText: { fontSize: 8, fontWeight: "900", color: "#64748B", letterSpacing: 0.3 },
  navTabTextActive: { color: "#000" },
  badgeDot: { position: 'absolute', top: 8, right: 15, width: 8, height: 8, backgroundColor: '#FF5C5C', borderRadius: 4, borderWidth: 1, borderColor: '#000' }
});

export default AdminHomeScreen;