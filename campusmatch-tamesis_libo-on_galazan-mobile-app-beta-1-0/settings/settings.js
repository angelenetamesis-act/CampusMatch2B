import React, { useState } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert, Dimensions, Platform, Modal
} from "react-native";

// Import the new components
import AccountDetailsModal from "./accountdetails";
import EditPreferencesModal from "./editpref";
import AboutUsModal from "./aboutus"; 
import PrivacyPolicyModal from "./privacypolicy"; 
import TermsOfServiceModal from "./termsofservice"; 
import RateModal from "./rate"; 
import WarningsModal from "./warnings"; 

const { width } = Dimensions.get('window');

const SettingsScreen = ({ 
  user, 
  onBack, 
  onLogout, 
  onUpdateUser, 
}) => {
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [is2FA, setIs2FA] = useState(false);
  
  // NEW: State to track agreement persistence
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Modal Visibility States
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false); 
  const [showPrivacy, setShowPrivacy] = useState(false); 
  const [showTerms, setShowTerms] = useState(false); 
  const [showRate, setShowRate] = useState(false); 
  const [showWarnings, setShowWarnings] = useState(false); 
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);

  // Temp Preference States
  const [tempPurpose, setTempPurpose] = useState(user?.purpose || "");
  const [tempPrefCampus, setTempPrefCampus] = useState(user?.prefCampus || "");
  const [tempPrefCourse, setTempPrefCourse] = useState(user?.prefCourse || "");
  const [tempPrefYear, setTempPrefYear] = useState(user?.prefYear || "");
  const [tempPrefGender, setTempPrefGender] = useState(user?.prefGender || "");
  const [tempPrefAge, setTempPrefAge] = useState(user?.prefAge || "");

  const handleSavePreferences = async () => {
    if (!tempPurpose || !tempPrefCampus || !tempPrefCourse || !tempPrefGender || !tempPrefYear) {
      Alert.alert("Incomplete", "Please finish all fields.");
      return;
    }
    const updatedUser = { 
      ...user, 
      purpose: tempPurpose, 
      prefCampus: tempPrefCampus, 
      prefCourse: tempPrefCourse, 
      prefYear: tempPrefYear, 
      prefGender: tempPrefGender, 
      prefAge: tempPrefAge 
    };
    try {
      if (onUpdateUser) await onUpdateUser(updatedUser);
      setShowPreferences(false);
      Alert.alert("Success", "Preferences updated!");
    } catch (e) { 
      Alert.alert("Error", "Failed to save."); 
    }
  };

  const SettingItem = ({ title, onPress, color = "#000", isSwitch = false, switchValue, onSwitchChange }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress} 
      disabled={isSwitch}
    >
      <Text style={[styles.settingText, { color }]}>{title}</Text>
      {isSwitch ? (
        <Switch 
          value={switchValue} 
          onValueChange={onSwitchChange}
          trackColor={{ false: "#CBD5E1", true: "#FFD700" }}
          thumbColor={"#fff"}
        />
      ) : (
        <Text style={styles.arrow}>→</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnIcon}>
          <Text style={styles.iconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 45 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollPadding}>
        <Text style={styles.sectionTitle}>Account & Profile</Text>
        <SettingItem title="Account Details" onPress={() => setShowAccountDetails(true)} />
        <SettingItem title="Edit Preferences" onPress={() => setShowPreferences(true)} />
        <SettingItem title="Change Password" onPress={() => setShowPremiumModal(true)} />
        
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <SettingItem 
          title="Ghost Mode" 
          isSwitch={true} 
          switchValue={isGhostMode} 
          onSwitchChange={() => setShowPremiumModal(true)} 
        />
        <SettingItem 
          title="Two-Factor Auth" 
          isSwitch={true} 
          switchValue={is2FA} 
          onSwitchChange={() => setShowPremiumModal(true)} 
        />
        <SettingItem title="Warnings and Violations" onPress={() => setShowWarnings(true)} />
        <SettingItem title="Privacy Policy" onPress={() => setShowPrivacy(true)} />
        <SettingItem title="Terms of Service" onPress={() => setShowTerms(true)} />

        <Text style={styles.sectionTitle}>App Settings</Text>
        <SettingItem 
          title="Dark Theme" 
          isSwitch={true} 
          switchValue={isDarkMode} 
          onSwitchChange={() => setShowPremiumModal(true)} 
        />
        <SettingItem title="Rate the App" onPress={() => setShowRate(true)} />
        <SettingItem title="About Us" onPress={() => setShowAboutUs(true)} />

        <TouchableOpacity 
          style={styles.dangerBtn} 
          onPress={() => Alert.alert("Delete Account", "Are you sure? This cannot be undone.", [{text: "Cancel"}, {text: "Delete", style: 'destructive'}])}
        >
          <Text style={styles.dangerBtnText}>DELETE ACCOUNT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>LOGOUT SESSION</Text>
        </TouchableOpacity>
        
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Neo-Brutalist Premium Modal */}
      <Modal visible={showPremiumModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PREMIUM ONLY</Text>
            <Text style={styles.modalText}>Unlock this feature and many more with our Premium Plan.</Text>
            <TouchableOpacity style={styles.modalPremiumBtn} onPress={() => setShowPremiumModal(false)}>
              <Text style={styles.modalBtnText}>GO PREMIUM</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPremiumModal(false)}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AccountDetailsModal 
        visible={showAccountDetails}
        onClose={() => setShowAccountDetails(false)}
        user={user}
        securePassword={securePassword}
        setSecurePassword={setSecurePassword}
      />

      <EditPreferencesModal 
        visible={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handleSavePreferences}
        tempPurpose={tempPurpose} setTempPurpose={setTempPurpose}
        tempPrefCampus={tempPrefCampus} setTempPrefCampus={setTempPrefCampus}
        tempPrefCourse={tempPrefCourse} setTempPrefCourse={setTempPrefCourse}
        tempPrefYear={tempPrefYear} setTempPrefYear={setTempPrefYear}
        tempPrefGender={tempPrefGender} setTempPrefGender={setTempPrefGender}
        tempPrefAge={tempPrefAge} setTempPrefAge={setTempPrefAge}
      />

      <AboutUsModal visible={showAboutUs} onClose={() => setShowAboutUs(false)} />
      <PrivacyPolicyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
      
      <TermsOfServiceModal 
        visible={showTerms} 
        onClose={() => setShowTerms(false)}
        agreed={termsAgreed}
        onCheckChange={setTermsAgreed}
        onAgree={() => setShowTerms(false)}
      />

      <RateModal isVisible={showRate} onClose={() => setShowRate(false)} userId={user?.id || user?.uid} />

      <WarningsModal 
        visible={showWarnings}
        onClose={() => setShowWarnings(false)}
        user={user}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  header: { 
    height: 70, backgroundColor: "#fff", flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
    borderBottomWidth: 3, borderColor: '#000'
  },
  backBtnIcon: { 
    width: 45, height: 45, backgroundColor: '#FFD700', borderRadius: 12, 
    borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2
  },
  iconText: { fontWeight: '900', fontSize: 22, color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollPadding: { padding: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 15, marginTop: 25, textTransform: 'uppercase' },
  settingItem: {
    backgroundColor: '#fff', padding: 18, borderRadius: 15, borderWidth: 2, borderColor: '#000',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3
  },
  settingText: { fontWeight: '800', fontSize: 15 },
  arrow: { fontWeight: '900', fontSize: 18, color: '#CBD5E1' },
  logoutBtn: { 
    marginTop: 20, padding: 18, borderRadius: 15, backgroundColor: '#000', 
    alignItems: 'center', borderWidth: 2, borderColor: '#000' 
  },
  logoutBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  dangerBtn: { 
    marginTop: 40, padding: 18, borderRadius: 15, backgroundColor: '#FFF', 
    alignItems: 'center', borderWidth: 2, borderColor: '#FF5C5C' 
  },
  dangerBtnText: { color: '#FF5C5C', fontWeight: '900', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    width: '85%', backgroundColor: '#fff', padding: 30, borderRadius: 0, 
    borderWidth: 3, borderColor: '#000', shadowColor: '#000', 
    shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10, alignItems: 'center' 
  },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 15, textAlign: 'center' },
  modalText: { fontSize: 16, textAlign: 'center', marginBottom: 25, fontWeight: '600' },
  modalPremiumBtn: { backgroundColor: '#FFD700', padding: 15, width: '100%', borderWidth: 3, borderColor: '#000', alignItems: 'center', marginBottom: 15 },
  modalBtnText: { fontWeight: '900', fontSize: 16 },
  modalCloseBtn: { padding: 10 },
  modalCloseText: { fontWeight: '900', fontSize: 14, color: '#64748B', textDecorationLine: 'underline' }
});

export default SettingsScreen;