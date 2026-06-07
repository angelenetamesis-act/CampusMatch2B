import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Dimensions, 
  ScrollView, 
  KeyboardAvoidingView,
  Platform, 
  Image,
  ActivityIndicator,
  Alert,
  Modal 
} from "react-native";

const { width, height } = Dimensions.get("window");
const INPUT_SIZE = Math.floor((width - 40 - 48 - 40) / 6);

const AdminTwoFactorSetupScreen = ({ qrCodeUrl, manualSecretKey, onVerifyToken, onCancel, onEmailChange }) => {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [adminInfo, setAdminInfo] = useState({
    fullName: "",
    adminId: "",
    schoolEmail: "",
    password: "",
    confirmPassword: ""
  });

  const adminInfoRef = useRef(adminInfo);
  const updateField = (field, value) => {
    setError("");
    setAdminInfo(prev => {
      const next = { ...prev, [field]: value };
      adminInfoRef.current = next;
      return next;
    });
  };

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleNextPhase = () => {
    setError("");
    if (currentPhase === 1) {
      if (!adminInfo.fullName.trim() || !adminInfo.adminId.trim() || !adminInfo.schoolEmail.trim()) {
        setError("ALL PERSONAL FIELDS ARE REQUIRED");
        return;
      }
      if (!adminInfo.schoolEmail.toLowerCase().endsWith("@chmsu.edu.ph")) {
        setError("MUST BE A VALID @CHMSU.EDU.PH EMAIL");
        return;
      }
      if (onEmailChange) onEmailChange(adminInfo.schoolEmail.toLowerCase().trim());
      setCurrentPhase(2);
    } else if (currentPhase === 2) {
      if (!adminInfo.password || !adminInfo.confirmPassword) {
        setError("PASSWORD FIELDS CANNOT BE EMPTY");
        return;
      }
      if (adminInfo.password !== adminInfo.confirmPassword) {
        setError("PASSWORDS DO NOT MATCH");
        return;
      }
      if (adminInfo.password.length < 6) {
        setError("PASSWORD MUST BE AT LEAST 6 CHARACTERS");
        return;
      }
      setCurrentPhase(3);
    }
  };

  const handlePrevPhase = () => {
    setError("");
    if (currentPhase > 1) setCurrentPhase(currentPhase - 1);
    else onCancel();
  };

  const handleInputChange = (text, index) => {
    setError("");
    const newCode = [...code];
    newCode[index] = text.slice(-1);
    setCode(newCode);
    if (text && index < 5) inputRefs[index + 1].current.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleSubmit = async () => {
    const fullToken = code.join("");
    if (fullToken.length < 6) {
      setError("PLEASE ENTER ALL 6 DIGITS");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSummaryModal(true);
    }, 1500);
  };

  const handleConfirmRegistration = () => {
    const info = adminInfoRef.current;
    const email    = info.schoolEmail.toLowerCase().trim();
    const password = info.password;
    const adminId  = info.adminId.trim();
    const fullName = info.fullName.trim();

    if (!email || !password || !adminId || !fullName) {
      Alert.alert("Error", "Missing registration fields. Please go back and fill all fields.");
      setShowSummaryModal(false);
      return;
    }

    setShowSummaryModal(false);
    onVerifyToken(email, password, adminId, fullName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={[styles.sparkTag, styles.universalShadow]}>
            <Text style={styles.sparkTagText}>🛡️ ADMIN SETUP • PHASE {currentPhase} OF 3</Text>
          </View>

          <View style={[styles.card, styles.universalShadow]}>
            {currentPhase === 1 && (
              <View>
                <Text style={styles.welcomeTitle}>ACADEMIC VALIDATION</Text>
                <Text style={styles.subtitle}>Verify your internal campus identity credentials to unlock admin access permissions</Text>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput style={styles.formInput} placeholder="e.g. Juan DelaCruz" placeholderTextColor="#94A3B8" value={adminInfo.fullName} onChangeText={(val) => updateField("fullName", val)} />
                <Text style={styles.inputLabel}>ADMIN ID NUMBER</Text>
                <TextInput style={styles.formInput} placeholder="e.g. CHMSU-2024-XXXX" placeholderTextColor="#94A3B8" value={adminInfo.adminId} onChangeText={(val) => updateField("adminId", val)} />
                <Text style={styles.inputLabel}>OFFICIAL CAMPUS EMAIL</Text>
                <TextInput style={styles.formInput} placeholder="username@chmsu.edu.ph" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" value={adminInfo.schoolEmail} onChangeText={(val) => updateField("schoolEmail", val)} />
              </View>
            )}

            {currentPhase === 2 && (
              <View>
                <Text style={styles.welcomeTitle}>ACCOUNT CREDENTIALS</Text>
                <Text style={styles.subtitle}>Construct a robust system access password to shield your administrative dashboard file locks</Text>
                <Text style={styles.inputLabel}>CHOOSE ACCESS PASSWORD</Text>
                <TextInput style={styles.formInput} placeholder="••••••••" placeholderTextColor="#94A3B8" secureTextEntry value={adminInfo.password} onChangeText={(val) => updateField("password", val)} />
                <Text style={styles.inputLabel}>CONFIRM ACCESS PASSWORD</Text>
                <TextInput style={styles.formInput} placeholder="••••••••" placeholderTextColor="#94A3B8" secureTextEntry value={adminInfo.confirmPassword} onChangeText={(val) => updateField("confirmPassword", val)} />
              </View>
            )}

            {currentPhase === 3 && (
              <View>
                <Text style={styles.welcomeTitle}>LINK AUTHENTICATOR</Text>
                <Text style={styles.subtitle}>Scan the master token tracking layout inside Google Authenticator to confirm device linking</Text>
                <View style={styles.qrContainer}>
                  {qrCodeUrl ? <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" /> : <ActivityIndicator color="#000" size="large" />}
                </View>
                <View style={styles.manualKeyBox}>
                  <Text style={styles.manualLabel}>CAN'T SCAN? COPY KEY MANUALLY:</Text>
                  <Text selectable style={styles.manualKeyText}>{manualSecretKey}</Text>
                </View>
                <Text style={styles.tokenSectionTitle}>ENTER 6-DIGIT VERIFICATION CODE</Text>
                <View style={styles.codeInputRow}>
                  {code.map((digit, index) => (
                    <TextInput key={index} ref={inputRefs[index]} style={[styles.digitInput, error ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : null]} keyboardType="number-pad" maxLength={1} value={digit} onChangeText={(text) => handleInputChange(text, index)} onKeyPress={(e) => handleKeyPress(e, index)} editable={!isLoading} selectTextOnFocus />
                  ))}
                </View>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={{ marginTop: 16 }}>
              {currentPhase < 3 ? (
                <TouchableOpacity style={[styles.primaryButton, styles.universalShadow, { backgroundColor: '#3B82F6' }]} onPress={handleNextPhase} activeOpacity={0.9}>
                  <Text style={styles.buttonText}>CONTINUE →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.primaryButton, styles.universalShadow, { backgroundColor: "#34D399" }, isLoading && { opacity: 0.7 }]} onPress={handleSubmit} activeOpacity={0.9} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>VERIFY & ENABLE 2FA →</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.buttonActionRow}>
            <TouchableOpacity style={[styles.rowButton, styles.universalShadow]} onPress={handlePrevPhase} disabled={isLoading}>
              <Text style={styles.cancelText}>{currentPhase === 1 ? "ABORT REGISTRATION" : "← GO BACK A STEP"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showSummaryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.welcomeTitle}>REGISTRATION SUCCESS</Text>
            <Text style={styles.subtitle}>Your administrative profile has been verified.</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>Name: {adminInfo.fullName}</Text>
              <Text style={styles.summaryText}>ID: {adminInfo.adminId}</Text>
              <Text style={styles.summaryText}>Email: {adminInfo.schoolEmail}</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#000', marginBottom: 0 }]}
              onPress={handleConfirmRegistration}
            >
              <Text style={styles.buttonText}>PROCEED TO ADMIN LOGIN →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 3, borderColor: '#000' },
  summaryBox: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 8, marginBottom: 20, borderWidth: 2, borderColor: '#000' },
  summaryText: { fontWeight: '700', fontSize: 14, color: '#000', marginBottom: 4 },
  universalShadow: { shadowColor: '#000000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { alignItems: "center", paddingTop: height * 0.08, paddingHorizontal: 20, paddingBottom: 40 },
  sparkTag: { backgroundColor: '#E2E8F0', borderWidth: 3, borderColor: '#000000', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginBottom: -16, zIndex: 10, transform: [{ rotate: '-2deg' }, { translateX: -15 }] },
  sparkTagText: { fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
  card: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, borderWidth: 3, borderColor: '#000000' },
  welcomeTitle: { fontSize: 24, fontWeight: "900", color: "#000000", textAlign: 'center', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '600', color: "#475569", textAlign: 'center', marginBottom: 24 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#000000', marginBottom: 6, letterSpacing: 0.5 },
  formInput: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#000000', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#000000', marginBottom: 16 },
  qrContainer: { alignSelf: 'center', width: 200, height: 200, borderWidth: 3, borderColor: '#000000', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 8, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  qrImage: { width: '100%', height: '100%' },
  manualKeyBox: { backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#000000', borderRadius: 8, padding: 12, marginBottom: 24, alignItems: 'center' },
  manualLabel: { fontSize: 9, fontWeight: '900', color: '#64748B', marginBottom: 4, letterSpacing: 0.5 },
  manualKeyText: { fontSize: 13, fontWeight: '800', color: '#000000', letterSpacing: 1 },
  tokenSectionTitle: { fontSize: 11, fontWeight: '900', color: '#000000', textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 },
  codeInputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 5 },
  digitInput: { width: INPUT_SIZE, height: INPUT_SIZE + 4, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#000000', borderRadius: 8, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#000000', padding: 0 },
  errorText: { color: '#ef4444', fontSize: 11, fontWeight: '900', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' },
  primaryButton: { paddingVertical: 16, borderRadius: 10, alignItems: "center", borderWidth: 3, borderColor: '#000000', justifyContent: 'center', minHeight: 60 },
  buttonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
  buttonActionRow: { flexDirection: 'row', width: '100%', marginTop: 24 },
  rowButton: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 3, borderColor: '#000000', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: "#EF4444", fontWeight: "900", textDecorationLine: 'underline', fontSize: 12, letterSpacing: 0.5 }
});

export default AdminTwoFactorSetupScreen;