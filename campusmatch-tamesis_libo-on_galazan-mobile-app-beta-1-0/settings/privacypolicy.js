import React from "react";
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView 
} from "react-native";

const PrivacyPolicyModal = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>PRIVACY POLICY</Text>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>1. DATA WE COLLECT</Text>
            <Text style={styles.bodyText}>
              We collect your University Email, School ID, and Full Name to verify your student status at your specific campus.
            </Text>

            <Text style={styles.sectionHeader}>2. ANONYMITY & ALIASES</Text>
            <Text style={styles.bodyText}>
              While we store your real identity for verification, other students only see your chosen Alias/Anon Name. Your privacy is our priority.
            </Text>

            <Text style={styles.sectionHeader}>3. POST EXPIRATION</Text>
            <Text style={styles.bodyText}>
              To keep the feed relevant, posts are designed to be temporary. Once a post expires, it is hidden from the main feed but remains in your personal history.
            </Text>

            <Text style={styles.sectionHeader}>4. LOCATION DATA</Text>
            <Text style={styles.bodyText}>
              CampusMatch uses your selected campus (e.g., Talisay, Alijis) to filter matches and content relevant to your location.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>I UNDERSTAND</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', height: '70%', backgroundColor: '#fff', borderRadius: 30, borderWidth: 3, borderColor: '#000', padding: 25, shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 2, color: '#000', marginBottom: 20, textAlign: 'center' },
  contentScroll: { flex: 1 },
  sectionHeader: { fontWeight: '900', fontSize: 13, color: '#000', marginTop: 15, marginBottom: 5, textTransform: 'uppercase' },
  bodyText: { fontSize: 13, color: '#334155', lineHeight: 18, fontWeight: '500' },
  closeBtn: { marginTop: 20, backgroundColor: '#FFD700', paddingVertical: 15, borderRadius: 15, borderWidth: 2, borderColor: '#000', alignItems: 'center' },
  closeBtnText: { color: '#000', fontWeight: '900', fontSize: 14 }
});

export default PrivacyPolicyModal;