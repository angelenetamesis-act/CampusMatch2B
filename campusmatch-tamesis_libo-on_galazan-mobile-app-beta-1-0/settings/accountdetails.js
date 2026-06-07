import React from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, Dimensions, SafeAreaView 
} from "react-native";

const { height } = Dimensions.get('window');

const DataItem = ({ label, value, isPassword = false, securePassword, onTogglePassword }) => (
  <View style={styles.dataCard}>
    <View style={{ flex: 1 }}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>
        {isPassword && securePassword ? "••••••••" : (value || "Not Provided")}
      </Text>
    </View>
    {isPassword && (
      <TouchableOpacity onPress={onTogglePassword} style={styles.eyeBtn}>
        <Text style={styles.eyeIconText}>{securePassword ? "👁" : "×"}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const AccountDetailsModal = ({ visible, onClose, user, securePassword, setSecurePassword }) => {
  return (
    <Modal 
      visible={visible} 
      animationType="fade" // Changed to fade for a slicker, faster transition
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        {/* Header Aligned with Settings Back Icon */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtnIcon}>
            <Text style={styles.iconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ACCOUNT DETAILS</Text>
          <View style={{ width: 45 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.sectionTitle}>Identification</Text>
          <DataItem label="University" value={user.selectedUni || "CHMSU"} />
          <DataItem label="Campus" value={user.campus || user.selectedCampus || "Talisay"} />
          <DataItem label="Course" value={user.userCourse || user.selectedCourse || "BSIT"} />
          <DataItem label="School ID" value={user.schoolId || "GKM07060600"} />

          <Text style={styles.sectionTitle}>Personal Info</Text>
          <DataItem 
            label="Full Name" 
            value={`${user.firstName || ""} ${user.middleName || ""} ${user.surname || ""}`.trim()} 
          />
          <DataItem label="Birthday" value={user.birthdayText || "Not Provided"} />
          <DataItem label="Age" value={user.age || "19"} />
          
          <Text style={styles.sectionTitle}>Security</Text>
          <DataItem label="Email" value={user.email} />
          <DataItem 
            label="Password" 
            value={user.password} 
            isPassword={true} 
            securePassword={securePassword}
            onTogglePassword={() => setSecurePassword(!securePassword)}
          />

          <View style={styles.privacyNote}>
            <Text style={styles.privacyNoteText}>
              🛡️ Your real identity is hidden from other students. Your active alias is: 
              <Text style={{fontWeight:'900'}}> {user.anonName || "User"}</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>CLOSE INFORMATION</Text>
          </TouchableOpacity>
          
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  header: { 
    height: 70, backgroundColor: "#fff", flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
    borderBottomWidth: 3, borderColor: '#000'
  },
  // Updated Back Button to match Settings Icon Style
  backBtnIcon: { 
    width: 45, height: 45, backgroundColor: '#FFD700', borderRadius: 12, 
    borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2
  },
  iconText: { fontWeight: '900', fontSize: 22, color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollPadding: { padding: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 15, marginTop: 20, textTransform: 'uppercase' },
  dataCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 15, borderWidth: 2, borderColor: '#000',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  dataLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  dataValue: { fontWeight: '700', color: '#000', fontSize: 15 },
  eyeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#000' },
  eyeIconText: { fontSize: 14 },
  privacyNote: { backgroundColor: '#E0F2FE', padding: 15, borderRadius: 15, borderWidth: 2, borderColor: '#000', marginTop: 10 },
  privacyNoteText: { color: '#0369a1', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  doneBtn: { marginTop: 30, padding: 18, borderRadius: 15, backgroundColor: '#000', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  doneBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 }
});

export default AccountDetailsModal;