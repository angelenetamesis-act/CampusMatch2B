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
  Alert, 
  ImageBackground,
  ActivityIndicator // Added for loading state
} from "react-native";

const { height } = Dimensions.get("window");

const LoginScreen = ({ onNavigateToSignup, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({ email: "", password: "" });

  const validate = () => {
    let isValid = true;
    let newErrors = { email: "", password: "" };

    if (!email.trim()) {
      newErrors.email = "Email is required";
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

  const handleSignIn = async () => {
    if (!validate()) return;

    setIsLoading(true);
    
    // Simulating a 2-second network delay
    setTimeout(() => {
      setIsLoading(false);
      if (onLogin) {
        onLogin(email.trim().toLowerCase(), password);
      }
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        <ImageBackground 
          source={require('../assets/campusmatchbg.png')} 
          style={styles.backgroundImage}
          imageStyle={{ borderBottomRightRadius: 100 }}
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
          <View style={[styles.card, styles.universalShadow]}>
            <Text style={styles.welcomeTitle}>FIND YOUR SPARK!</Text>
            <Text style={styles.subtitle}>Enter your details to find your spark</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput 
                placeholder="ex.juandelacruz@chmsu.edu.ph" 
                placeholderTextColor="#94a3b8"
                style={[
                  styles.input, 
                  styles.universalShadow,
                  errors.email ? { borderColor: '#ef4444' } : null // Red border on error
                ]} 
                value={email} 
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({...errors, email: ""}); // Clear error on type
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
                  styles.universalShadow,
                  errors.password ? { borderColor: '#ef4444' } : null // Red border on error
                ]} 
                secureTextEntry 
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({...errors, password: ""}); // Clear error on type
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
              onPress={handleSignIn}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.signInText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.footerLink} 
            onPress={onNavigateToSignup}
            disabled={isLoading}
          >
            <Text style={styles.footerText}>
              New here? <Text style={styles.signUpText}>VERIFY & JOIN</Text>
            </Text>
          </TouchableOpacity>

          <View style={[styles.groupBadge, styles.universalShadow]}>
            <Text style={styles.groupTitle}>CAMPUSMATCH</Text>
            <View style={styles.memberList}>
              <Text style={styles.memberLabel}>MEMBERS:</Text>
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
  universalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 4
  },
  container: { 
    flex: 1, 
    backgroundColor: "#FAF9FF" 
  },
  backgroundContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 300, 
    zIndex: -1 
  },
  backgroundImage: { 
    flex: 1, 
    width: '100%' 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(235, 241, 255, 0.45)', 
    borderBottomRightRadius: 100 
  },
  scrollContent: { 
    alignItems: "center", 
    paddingTop: height * 0.15, 
    paddingHorizontal: 25, 
    paddingBottom: 40 
  },
  card: { 
    width: "100%", 
    backgroundColor: "#FAF9FF", 
    borderRadius: 30, 
    padding: 30, 
    borderWidth: 3, 
    borderColor: '#000', 
  },
  welcomeTitle: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "#000", 
    textAlign: 'center', 
    marginBottom: 5 
  },
  subtitle: { 
    fontSize: 14, 
    color: "#4a4a4a", 
    textAlign: 'center', 
    marginBottom: 30 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#000', 
    marginBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  input: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 16, 
    fontSize: 10, 
    borderWidth: 2, 
    borderColor: '#000', 
    color: '#1e293b', 
  },
  errorText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
    marginLeft: 5,
  },
  signInButton: { 
    backgroundColor: "#DCFCE7", 
    paddingVertical: 18, 
    borderRadius: 15, 
    alignItems: "center", 
    marginTop: 10, 
    borderWidth: 3, 
    borderColor: '#000', 
    justifyContent: 'center',
    minHeight: 65, // Keeps height consistent during loading
  },
  signInText: { 
    color: "#000", 
    fontWeight: "800", 
    fontSize: 18 
  },
  footerLink: { 
    marginTop: 30 
  },
  footerText: { 
    color: "#4a4a4a", 
    fontSize: 15 
  },
  signUpText: { 
    color: "#7C3AED", 
    fontWeight: "bold" 
  },
  groupBadge: {
    marginTop: 50,
    padding: 20,
    backgroundColor: '#fff', 
    borderWidth: 3, 
    borderColor: '#000', 
    borderRadius: 20, 
    alignItems: 'center', 
    width: '90%', 
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000", 
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  memberList: {
    alignItems: 'center',
  },
  memberLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  memberName: {
    fontSize: 13,
    color: "#4a4a4a", 
    fontWeight: "600",
    lineHeight: 18,
  },
});

export default LoginScreen;