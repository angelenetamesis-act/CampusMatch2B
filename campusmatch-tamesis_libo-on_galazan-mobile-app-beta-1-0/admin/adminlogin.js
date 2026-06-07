import React, { useState } from "react";
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
  ImageBackground,
  ActivityIndicator,
  Alert
} from "react-native";

const { height } = Dimensions.get("window");

const AdminLoginScreen = ({ onNavigateToUserLogin, onNavigateToAdminSignup, onAdminLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [errors, setErrors] = useState({ email: "", password: "" });

  const validate = () => {
    let isValid = true;
    let newErrors = { email: "", password: "" };

    if (!email.trim()) {
      newErrors.email = "Admin Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAdminSignIn = async () => {
    if (validate()) {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await onAdminLogin(email, password);
      } catch (error) {
        Alert.alert("Login Failed", error.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <ImageBackground 
          source={require('../assets/campusmatchbg.png')} 
          style={styles.backgroundImage}
          imageStyle={{ borderBottomRightRadius: 40, borderBottomLeftRadius: 40 }}
        >
          <View style={styles.overlay} />
        </ImageBackground>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sparkTag, styles.universalShadow]}>
            <Text style={styles.sparkTagText}>✨ CAMPUS MATCH ADMIN PORTAL v130.130</Text>
          </View>

          <View style={[styles.card, styles.universalShadow]}>
            <Text style={styles.welcomeTitle}>ADMIN CONTROL</Text>
            <Text style={styles.subtitle}>Enter management credentials access portal</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADMIN EMAIL</Text>
              <TextInput 
                placeholder="admin.name@chmsu.edu.ph" 
                placeholderTextColor="#94a3b8"
                style={[
                  styles.input, 
                  errors.email ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : null
                ]} 
                value={email} 
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({...errors, email: ""});
                }} 
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput 
                placeholder="••••••••" 
                placeholderTextColor="#94a3b8"
                style={[
                  styles.input, 
                  errors.password ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : null
                ]} 
                secureTextEntry 
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({...errors, password: ""});
                }}
                textContentType="password"
                editable={!isLoading}
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity 
              style={[
                styles.signInButton, 
                styles.universalShadow,
                isLoading && { opacity: 0.7 }
              ]} 
              onPress={handleAdminSignIn}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.signInText}>SECURE LOG IN →</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonActionRow}>
            <TouchableOpacity 
              style={[styles.rowButton, styles.universalShadow]}
              onPress={onNavigateToAdminSignup}
              disabled={isLoading}
            >
              <Text style={styles.footerText}>Not registered?</Text>
              <Text style={styles.signUpText}>REGISTER AS ADMIN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.rowButton, styles.universalShadow]}
              onPress={onNavigateToUserLogin}
              disabled={isLoading}
            >
              <Text style={styles.adminSwitchText}>Not an admin?</Text>
              <Text style={styles.adminActionText}>USER SIGN IN</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupBadge}>
            <Text style={styles.memberLabel}>DEVELOPMENT TEAM // SYSTEM DESIGNERS</Text>
            <View style={styles.namesGrid}>
              <Text style={styles.memberName}>Angelene Tamesis</Text>
              <Text style={styles.memberName}>Lyza Libo-on</Text>
              <Text style={styles.memberName}>Keisha Lourez Galazan</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  universalShadow: { shadowColor: '#000000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  backgroundContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 480, zIndex: -1 },
  backgroundImage: { flex: 1, width: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(71, 85, 105, 0.3)', borderBottomRightRadius: 40, borderBottomLeftRadius: 40, borderWidth: 3, borderTopWidth: 0, borderColor: '#000000' },
  scrollContent: { alignItems: "center", paddingTop: height * 0.15, paddingHorizontal: 20, paddingBottom: 40 },
  sparkTag: { backgroundColor: '#E2E8F0', borderWidth: 3, borderColor: '#000000', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginBottom: -16, zIndex: 10, transform: [{ rotate: '-2deg' }, { translateX: -15 }] },
  sparkTagText: { fontSize: 12, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
  card: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, borderWidth: 3, borderColor: '#000000' },
  welcomeTitle: { fontSize: 28, fontWeight: "900", color: "#000000", textAlign: 'center', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '600', color: "#475569", textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '900', color: '#000000', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, fontSize: 14, fontWeight: '700', borderWidth: 3, borderColor: '#000000', color: '#000000' },
  errorText: { color: '#ef4444', fontSize: 11, fontWeight: '900', marginTop: 6, marginLeft: 2, textTransform: 'uppercase' },
  signInButton: { backgroundColor: "#34D399", paddingVertical: 16, borderRadius: 10, alignItems: "center", marginTop: 10, borderWidth: 3, borderColor: '#000000', justifyContent: 'center', minHeight: 60 },
  signInText: { color: "#000000", fontWeight: "900", fontSize: 18, letterSpacing: 0.5 },
  buttonActionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24, gap: 12 },
  rowButton: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 3, borderColor: '#000000', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  footerText: { color: "#000000", fontSize: 13, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  signUpText: { color: "#FF7A00", fontWeight: "900", textDecorationLine: 'underline', fontSize: 13, textAlign: 'center' },
  adminSwitchText: { color: "#000000", fontSize: 13, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  adminActionText: { color: "#8B5CF6", fontWeight: "900", textDecorationLine: 'underline', fontSize: 13, textAlign: 'center' },
  groupBadge: { marginTop: 32, borderWidth: 3, borderColor: '#000000', borderStyle: 'dashed', borderRadius: 14, width: '85%', padding: 16, alignItems: 'center', justifyContent: 'center' },
  memberLabel: { fontSize: 9, fontWeight: '900', color: '#475569', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' },
  namesGrid: { gap: 6, alignItems: 'center' },
  memberName: { fontSize: 14, color: "#000000", fontWeight: "800", textAlign: 'center' },
});

export default AdminLoginScreen;