import React, { useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminLoginScreen from "./adminlogin";
import AdminTwoFactorSetupScreen from "./adminsignupscreen";
import AdminHomeScreen from "./adminhomescreen";

const AdminAuthController = () => {
  const [currentScreen, setCurrentScreen] = useState("LOGIN");
  const [loggedInAdmin, setLoggedInAdmin] = useState(null);

  const handleRegister = async (email, password, adminId, fullName) => {
    try {
      const formattedEmail = email.trim().toLowerCase();
      const storedAdmins = await AsyncStorage.getItem('@admins_db');
      const admins = storedAdmins ? JSON.parse(storedAdmins) : [];

      if (admins.some(a => a.email === formattedEmail)) {
        Alert.alert("Registration Failed", "An admin account with this email already exists.");
        return;
      }

      const newAdmin = {
        id: adminId ? adminId.trim() : Date.now().toString(),
        email: formattedEmail,
        password: password,
        fullName: fullName ? fullName.trim() : "Admin",
        createdAt: new Date().toISOString()
      };

      const updatedAdmins = [...admins, newAdmin];

      // ✅ FIXED: Save to @admins_db and log to confirm it's written
      await AsyncStorage.setItem('@admins_db', JSON.stringify(updatedAdmins));
      console.log("[AdminAuthController] Saved admins_db:", JSON.stringify(updatedAdmins));

      Alert.alert("Success", "Admin account created! You can now log in.");
      setCurrentScreen("LOGIN");
    } catch (e) {
      console.error("Register error:", e);
      Alert.alert("Error", "Could not save admin account.");
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const formattedEmail = email.trim().toLowerCase();
      const storedAdmins = await AsyncStorage.getItem('@admins_db');
      const admins = storedAdmins ? JSON.parse(storedAdmins) : [];

      const foundAdmin = admins.find(
        a => a.email === formattedEmail && a.password === password
      );

      if (foundAdmin) {
        await AsyncStorage.setItem('@current_admin', JSON.stringify(foundAdmin));
        await AsyncStorage.setItem('@admin_email', foundAdmin.email);
        await AsyncStorage.setItem('@admin_last_login', new Date().toISOString());

        setLoggedInAdmin(foundAdmin);
        setCurrentScreen("ADMIN_HOME");
      } else {
        Alert.alert("Login Failed", "The credentials do not match.");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "An error occurred during login.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@current_admin');
    setLoggedInAdmin(null);
    setCurrentScreen("LOGIN");
  };

  if (currentScreen === "SIGNUP") {
    return (
      <AdminTwoFactorSetupScreen
        onVerifyToken={handleRegister}
        onCancel={() => setCurrentScreen("LOGIN")}
      />
    );
  }

  if (currentScreen === "ADMIN_HOME") {
    return <AdminHomeScreen adminUser={loggedInAdmin} onLogout={handleLogout} />;
  }

  return (
    <AdminLoginScreen
      onNavigateToAdminSignup={() => setCurrentScreen("SIGNUP")}
      onAdminLogin={handleLogin}
    />
  );
};

export default AdminAuthController;