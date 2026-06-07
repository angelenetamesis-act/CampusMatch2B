import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const UnsparkedMsg = ({ isMeeUnsparked, otherUserName, onSparkAgain, showReunionBanner, onlyShowBanner }) => {
  const displayName = otherUserName || "this user";
  
  // FIX: Initialize the animation at 1 if the banner is already active 
  // This prevents it from starting at 0 and sliding up on every mount.
  const reunionAnim = useRef(new Animated.Value(showReunionBanner ? 1 : 0)).current;
  const hasAnimated = useRef(showReunionBanner);

  useEffect(() => {
    if (showReunionBanner) {
      if (!hasAnimated.current) {
        Animated.timing(reunionAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start(() => {
          hasAnimated.current = true;
        });
      }
    } else {
      reunionAnim.setValue(0);
      hasAnimated.current = false;
    }
  }, [showReunionBanner]);

  // "The Spark is Back!" Banner logic - NOW DESIGNED AS A LIST DIVIDER
  if (onlyShowBanner) {
    return showReunionBanner ? (
      <Animated.View 
        style={[
          styles.reunionBannerContainer, 
          { 
            opacity: reunionAnim,
            transform: [{
              translateY: reunionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0] 
              })
            }]
          }
        ]}
      >
        <View style={styles.dividerLine} />
        <View style={styles.reunionBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.reunionIcon}>⚡</Text>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.reunionTitle}>The Spark is Back!</Text>
              <Text style={styles.reunionSub}>
                You and {displayName} are connected again. Pick up where you left off!
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.dividerLine} />
      </Animated.View>
    ) : null;
  }

  // Disconnected UI
  return (
    <View style={styles.disconnectedContainer}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
        
        <Text style={styles.title}>SPARK DISCONNECTED</Text>
        
        <Text style={styles.description}>
          {isMeeUnsparked 
            ? `You unsparked ${displayName}. You'll need to spark with them again to send more messages.` 
            : `${displayName} unsparked you. You cannot send messages unless you are both sparked again.`}
        </Text>
        
        {isMeeUnsparked ? (
          <TouchableOpacity 
            style={styles.sparkBtn} 
            onPress={onSparkAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.sparkBtnText}>GO TO MATCHES</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>AWAITING MUTUAL SPARK</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  reunionBannerContainer: {
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
  },
  dividerLine: {
    height: 2,
    width: '90%',
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  reunionBanner: {
    width: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FACC15', 
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  reunionIcon: {
    fontSize: 22,
  },
  reunionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },
  reunionSub: {
    fontSize: 11,
    color: '#000',
    fontWeight: '700',
    lineHeight: 14,
  },
  disconnectedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    borderTopWidth: 4,
    borderColor: '#000',
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFF1F2', 
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  sparkBtn: {
    backgroundColor: '#FACC15',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  sparkBtnText: {
    fontWeight: '900',
    fontSize: 13,
    color: '#000',
  },
  lockedBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
  },
  lockedText: {
    fontWeight: '800',
    fontSize: 12,
    color: '#64748B',
  }
});

export default UnsparkedMsg;
