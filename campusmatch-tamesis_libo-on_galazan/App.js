import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LandingScreen from './screens/landing'; 
import LoginScreen from './screens/login';
import SignupScreen from './screens/signup';
import HomeScreen from './screens/home'; 

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Added state for the user list
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load current logged-in user
        const savedUser = await AsyncStorage.getItem('@current_user');
        if (savedUser) setUser(JSON.parse(savedUser));

        // Load all users for the Match/Feed features
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
      setAllUsers(users); // Sync local state

      const foundUser = users.find(u => u.email === formattedEmail && u.password === password);

      if (!foundUser) {
        throw new Error("Invalid email or password.");
      }

      setUser(foundUser);
      await AsyncStorage.setItem('@current_user', JSON.stringify(foundUser));
      
    } catch (e) {
      Alert.alert("Login Error", e.message);
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

      const newUser = {
        id: Date.now().toString(),
        ...userData, 
        email: formattedEmail, 
      };

      const updatedUsers = [...users, newUser];
      await AsyncStorage.setItem('@users_db', JSON.stringify(updatedUsers));
      setAllUsers(updatedUsers); // Sync local state
      
      setCurrentScreen('login'); 
      setIsSigningUp(false); 
      Alert.alert("Success", "Account created! Please log in.");

    } catch (e) {
      setIsSigningUp(false);
      Alert.alert("Signup Error", e.message);
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      // 1. Update the current session
      setUser(updatedUser);
      await AsyncStorage.setItem('@current_user', JSON.stringify(updatedUser));

      // 2. Update the user in the main "Database" (@users_db)
      const storedUsers = await AsyncStorage.getItem('@users_db');
      if (storedUsers) {
        let users = JSON.parse(storedUsers);
        users = users.map(u => u.email === updatedUser.email ? updatedUser : u);
        await AsyncStorage.setItem('@users_db', JSON.stringify(users));
        setAllUsers(users); // Sync local state
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

  if (isLoading || isSigningUp) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{marginTop: 15, color: '#2563eb', fontWeight: '600'}}>
          {isSigningUp ? "Securing your account..." : "Loading CampusMatch..."}
        </Text>
      </View>
    );
  }

  if (user) {
    return (
      <HomeScreen 
        user={user} 
        allUsers={allUsers} // Now properly passing the list of users
        onLogout={handleLogout} 
        onUpdateUser={handleUpdateUser} 
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'landing' && <LandingScreen onGetStarted={() => setCurrentScreen('login')} />}
      {currentScreen === 'login' && <LoginScreen onLogin={handleLogin} onNavigateToSignup={() => setCurrentScreen('signup')} />}
      {currentScreen === 'signup' && <SignupScreen onBack={() => setCurrentScreen('login')} onSignupSuccess={handleSignup} />}
    </View>
  );
}

const styles = StyleSheet.create({ 
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' } 
});

const addTestNotif = async () => {
  const testNotif = {
    id: 'test-123',
    senderName: 'Midnight Poet',
    action: 'sent you a spark!',
    created_at: new Date().toISOString(),
    isRead: false
  };
  const stored = await AsyncStorage.getItem('@sparks');
  const current = stored ? JSON.parse(stored) : [];
  await AsyncStorage.setItem('@sparks', JSON.stringify([...current, testNotif]));
  Alert.alert("Test added", "Re-open the notification bell now.");
};