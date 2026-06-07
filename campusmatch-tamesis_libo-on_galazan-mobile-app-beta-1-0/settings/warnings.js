import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

const WarningsModal = ({ visible, onClose, user }) => {
  const [violations, setViolations] = useState([]);
  const MAX_STRIKES = 5;

  useEffect(() => {
    // Every time the modal opens, we load the real data from storage
    if (visible && user?.email) {
      const loadViolations = async () => {
        try {
          const stored = await AsyncStorage.getItem(`@violations_${user.email}`);
          if (stored) {
            setViolations(JSON.parse(stored));
          } else {
            setViolations([]); // Reset if nothing is found
          }
        } catch (e) {
          console.error("Failed to load violations", e);
        }
      };
      loadViolations();
    }
  }, [visible, user?.email]);

  const isSuspended = violations.length >= MAX_STRIKES;

  const WarningCard = ({ label, value }) => (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  const renderViolationItem = (item, index) => (
    <View key={item.id || index} style={styles.violationCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.typeBadge}>{item.type?.toUpperCase() || "VIOLATION"}</Text>
        <Text style={styles.dateText}>
          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "Recent"}
        </Text>
      </View>
      <Text style={styles.contentLabel}>Flagged Content:</Text>
      <Text style={styles.flaggedContent}>"{item.content || "N/A"}"</Text>
      <Text style={styles.wordLabel}>
        Violated Words: <Text style={{ color: '#F87171' }}>{item.violatedWords?.join(', ') || "None"}</Text>
      </Text>
    </View>
  );

  return (
    <Modal 
      visible={visible} 
      animationType="fade" // Changed from "slide" to "fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.fullScreenContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>WARNINGS & VIOLATIONS</Text>
          <View style={{ width: 45 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.strikeZone}>
            <Text style={styles.strikeTitle}>STRIKE STATUS</Text>
            <Text style={[styles.strikeCount, { color: violations.length >= 4 ? '#EF4444' : '#000' }]}>
              {violations.length} / {MAX_STRIKES}
            </Text>
            <Text style={styles.warningSub}>
              If you reach 5 strikes, your account will be permanently extinguished.
            </Text>
          </View>

          <View style={styles.statusRow}>
            <WarningCard 
              label="ACCOUNT STATUS" 
              value={isSuspended ? "SUSPENDED" : "ACTIVE"} 
            />
          </View>

          <Text style={styles.historyTitle}>Violation History</Text>
          
          {violations.length > 0 ? (
            violations.map((item, index) => renderViolationItem(item, index))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Your record is clean!</Text>
            </View>
          )}

          <View style={[styles.infoBox, isSuspended && styles.suspendedBox]}>
            <Text style={[styles.infoText, isSuspended && { color: '#B91C1C' }]}>
              {isSuspended 
                ? "CRITICAL: Your account has been suspended for exceeding the 5-strike limit."
                : `Note: Accounts reaching ${MAX_STRIKES} strikes will be automatically suspended.`}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1, backgroundColor: "#FAF9FF" },
  header: {
    height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 3, borderColor: '#000'
  },
  backBtn: {
    width: 45, height: 45, backgroundColor: '#FFD700', borderRadius: 12,
    borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, elevation: 2
  },
  backArrow: { fontWeight: '900', fontSize: 22 },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingBottom: 40 },
  strikeZone: { padding: 30, backgroundColor: '#FFF', borderBottomWidth: 3, borderColor: '#000', alignItems: 'center' },
  strikeTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  strikeCount: { fontSize: 60, fontWeight: '900', marginVertical: 10 },
  warningSub: { textAlign: 'center', color: '#64748B', fontWeight: '600', fontSize: 12 },
  statusRow: { paddingHorizontal: 20, marginTop: 20 },
  historyTitle: { fontWeight: '900', fontSize: 18, marginBottom: 15, paddingHorizontal: 20, marginTop: 10 },
  card: {
    backgroundColor: '#fff', padding: 18, borderRadius: 15, borderWidth: 2, borderColor: '#000',
    marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, elevation: 3
  },
  label: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '900', color: '#000' },
  violationCard: { 
    backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 2, borderColor: '#000', 
    marginBottom: 15, marginHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, 
    shadowOpacity: 1, shadowRadius: 0 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { backgroundColor: '#000', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '900', borderRadius: 4 },
  dateText: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  contentLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  flaggedContent: { fontSize: 14, color: '#475569', fontStyle: 'italic', marginVertical: 5 },
  wordLabel: { fontSize: 12, fontWeight: '900' },
  emptyBox: { marginHorizontal: 20, padding: 30, alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, borderWidth: 2, borderStyle: 'dashed' },
  emptyText: { fontWeight: '800', color: '#94A3B8' },
  infoBox: {
    marginTop: 20, marginHorizontal: 20, padding: 20, borderRadius: 15, backgroundColor: '#E0F2FE', 
    borderWidth: 2, borderColor: '#000', borderStyle: 'dashed'
  },
  suspendedBox: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  infoText: { textAlign: 'center', fontWeight: '800', fontSize: 13, color: '#0369A1', lineHeight: 18 }
});

export default WarningsModal;