import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  Pressable 
} from 'react-native';

// Changed prop name from 'onContinue' to 'onGetStarted' to match App.js
const LandingScreen = ({ onGetStarted }) => {
  return (
    <Pressable 
      style={styles.container} 
      onPress={onGetStarted} // This now matches the function passed from App.js
      activeOpacity={0.7}
    >
      <ImageBackground 
        source={require('../assets/bg.png')} 
        style={styles.background}
        resizeMode="cover" 
      >
        <View style={styles.overlay}>
          <Text style={styles.footerText}>CLICK ANYWHERE TO CONTINUE</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Added a very slight tint to make it feel interactive
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    position: 'absolute',
    bottom: 50,
    color: '#ffffff', 
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    // Added a slight shadow to make text readable over any background
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
});

export default LandingScreen;