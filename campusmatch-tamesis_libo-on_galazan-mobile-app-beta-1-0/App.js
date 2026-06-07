import React, { useState, useEffect } from 'react';

import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';



import LandingScreen from './screens/landing'; 

import LoginScreen from './screens/login';

import SignupScreen from './screens/signup';


import AdminLoginScreen from './admin/adminlogin'; 

import AdminTwoFactorSetupScreen from './admin/adminsignupscreen'; 

import HomeScreen from './screens/home'; 

import AdminHomeScreen from './admin/adminhomescreen';

import SettingsScreen from './settings/settings';



export default function App() {

  const [currentScreen, setCurrentScreen] = useState('landing');

  const [user, setUser] = useState(null);

  const [adminUser, setAdminUser] = useState(null);

  const [allUsers, setAllUsers] = useState([]); 

  const [isLoading, setIsLoading] = useState(true);

  const [isSigningUp, setIsSigningUp] = useState(false);



  const [adminEmail, setAdminEmail] = useState("admin@chmsu.edu.ph");



  const mockSecretKey = "CAMPUSMATCHCHMSU2024"; 



  const cleanEmail = adminEmail.trim().toLowerCase();

  const totpUri = `otpauth://totp/CampusMatch:${encodeURIComponent(cleanEmail)}?secret=${mockSecretKey}&issuer=CampusMatch`;

  const mockQrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(totpUri)}&size=250`;



  useEffect(() => {

    const loadData = async () => {

      try {

        const savedUser = await AsyncStorage.getItem('@current_user');

        if (savedUser) {

          const parsedUser = JSON.parse(savedUser);

          const storedAdmins = await AsyncStorage.getItem('@admins_db');

          const admins = storedAdmins ? JSON.parse(storedAdmins) : [];

          const isAdmin = admins.some(a => a.email === parsedUser.email);

          if (isAdmin) {

            setAdminUser(parsedUser);

            setCurrentScreen('admin-home');

          } else {

            setUser(parsedUser);

          }

        }



        const storedUsers = await AsyncStorage.getItem('@users_db');

        if (storedUsers) setAllUsers(JSON.parse(storedUsers));

      } catch (e) {

        console.log("Error loading data", e);

      } finally {

        setIsLoading(false);

      }

    };

    loadData();

  }, []);



  const handleLogin = async (email, password) => {

    try {

      const formattedEmail = email.toLowerCase().trim();

      const storedUsers = await AsyncStorage.getItem('@users_db');

      const users = storedUsers ? JSON.parse(storedUsers) : [];

      setAllUsers(users); 



      const foundUser = users.find(u => u.email === formattedEmail && u.password === password);

      if (!foundUser) throw new Error("Invalid email or password.");



      setUser(foundUser);

      await AsyncStorage.setItem('@current_user', JSON.stringify(foundUser));

    } catch (e) {

      Alert.alert("Login Error", e.message);

    }

  };



  const handleAdminLogin = async (email, password) => {

    try {

      const formattedEmail = email.toLowerCase().trim();

      const storedAdmins = await AsyncStorage.getItem('@admins_db');

      const admins = storedAdmins ? JSON.parse(storedAdmins) : [];

      

      const foundAdmin = admins.find(a => a.email === formattedEmail && a.password === password);

      if (!foundAdmin) throw new Error("Invalid admin email or password.");



      setAdminUser(foundAdmin);

      setCurrentScreen('admin-home');

      await AsyncStorage.setItem('@current_user', JSON.stringify(foundAdmin));

    } catch (e) {

      Alert.alert("Admin Login Error", e.message);

    }

  };



  const handleSignup = async (userData) => {

    setIsSigningUp(true); 

    try {

      const formattedEmail = userData.email.toLowerCase().trim();

      const storedUsers = await AsyncStorage.getItem('@users_db');

      const users = storedUsers ? JSON.parse(storedUsers) : [];



      if (users.some(u => u.email === formattedEmail)) {

        throw new Error("An account with this email already exists.");

      }



      const newUser = { id: Date.now().toString(), ...userData, email: formattedEmail };

      const updatedUsers = [...users, newUser];

      await AsyncStorage.setItem('@users_db', JSON.stringify(updatedUsers));

      setAllUsers(updatedUsers); 

      

      setCurrentScreen('login'); 

      setIsSigningUp(false); 

      Alert.alert("Success", "Account created! Please log in.");

    } catch (e) {

      setIsSigningUp(false);

      Alert.alert("Signup Error", e.message);

    }

  };



  const handleAdminSignup = () => {

    setCurrentScreen('admin-signup');

  };



  // ✅ THE ONLY REAL FIX: now accepts adminId and fullName sent by adminsignupscreen.js
  // Previously was (email, password) only — adminId and fullName were silently dropped
  // causing @admins_db to save incomplete records or fail silently
  const handleVerifyAdminToken = async (email, password, adminId, fullName) => {

    try {

      const formattedEmail = email.trim().toLowerCase();

      const storedAdmins = await AsyncStorage.getItem('@admins_db');

      const admins = storedAdmins ? JSON.parse(storedAdmins) : [];



      if (admins.some(a => a.email === formattedEmail)) {

        Alert.alert("Already Registered", "An admin account with this email already exists.");

        setCurrentScreen('admin-login');

        return;

      }



      const newAdmin = {

        id: adminId ? adminId.trim() : Date.now().toString(),

        email: formattedEmail,

        password,

        fullName: fullName ? fullName.trim() : "Admin",

        createdAt: new Date().toISOString()

      };

      const updatedAdmins = [...admins, newAdmin];

      await AsyncStorage.setItem('@admins_db', JSON.stringify(updatedAdmins));

      console.log("[App] Admin saved to @admins_db:", JSON.stringify(updatedAdmins));



      Alert.alert("Success", "Admin 2FA Security core enabled successfully.");

      setCurrentScreen('admin-login');

    } catch (e) {

      Alert.alert("Verification Error", e.message);

    }

  };



  const handleUpdateUser = async (updatedUser) => {

    try {

      setUser(updatedUser);

      await AsyncStorage.setItem('@current_user', JSON.stringify(updatedUser));



      const storedUsers = await AsyncStorage.getItem('@users_db');

      if (storedUsers) {

        let users = JSON.parse(storedUsers);

        users = users.map(u => u.email === updatedUser.email ? updatedUser : u);

        await AsyncStorage.setItem('@users_db', JSON.stringify(users));

        setAllUsers(users); 

      }

    } catch (e) {

      console.log("Failed to sync user update", e);

    }

  };



  const handleLogout = async () => {

    await AsyncStorage.removeItem('@current_user');

    setUser(null);

    setCurrentScreen('login');

  };



  const handleAdminLogout = async () => {

    await AsyncStorage.removeItem('@current_user');

    setAdminUser(null);

    setCurrentScreen('admin-login');

  };



  if (isLoading || isSigningUp) {

    return (

      <View style={styles.centered}>

        <ActivityIndicator size="large" color="#2563eb" />

      </View>

    );

  }



  if (currentScreen === 'admin-home' && adminUser) {

    return <AdminHomeScreen adminUser={adminUser} onLogout={handleAdminLogout} />;

  }



  if (user) {

    return <HomeScreen user={user} allUsers={allUsers} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;

  }



  return (

    <View style={{ flex: 1 }}>

      {currentScreen === 'landing' && <LandingScreen onGetStarted={() => setCurrentScreen('login')} />}

      {currentScreen === 'login' && (

        <LoginScreen 

          onLogin={handleLogin} 

          onNavigateToSignup={() => setCurrentScreen('signup')} 

          onNavigateToAdminLogin={() => setCurrentScreen('admin-login')} 

        />

      )}

      {currentScreen === 'signup' && <SignupScreen onBack={() => setCurrentScreen('login')} onSignupSuccess={handleSignup} />}

      {currentScreen === 'admin-login' && (

        <AdminLoginScreen 

          onNavigateToUserLogin={() => setCurrentScreen('login')} 

          onNavigateToAdminSignup={handleAdminSignup} 

          onAdminLogin={handleAdminLogin} 

        />

      )}

      {currentScreen === 'admin-signup' && (

        <AdminTwoFactorSetupScreen

          qrCodeUrl={mockQrCodeUrl}

          manualSecretKey={mockSecretKey} 

          onVerifyToken={handleVerifyAdminToken}

          onCancel={() => setCurrentScreen('admin-login')}

          onEmailChange={setAdminEmail}

        />

      )}

    </View>

  );

}



const styles = StyleSheet.create({ 

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' } 

});