import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const RateModal = ({ isVisible, onClose, userId }) => { // Added userId prop
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [confirmedRating, setConfirmedRating] = useState(0);

  // Generate a unique key for each user
  const storageKey = userId ? `@user_rating_${userId}` : '@user_rating_guest';

  // Load saved rating on mount or when userId changes
  useEffect(() => {
    const loadRating = async () => {
      try {
        const savedRating = await AsyncStorage.getItem(storageKey);
        if (savedRating !== null) {
          const parsedRating = parseInt(savedRating);
          setConfirmedRating(parsedRating);
          setRating(parsedRating);
          setHasRated(true);
        } else {
          // Reset states if no rating exists for this specific user
          setHasRated(false);
          setRating(0);
          setConfirmedRating(0);
        }
      } catch (e) {
        console.error("Failed to load rating", e);
      }
    };
    if (isVisible) loadRating(); // Reload when modal opens to ensure correct user data
  }, [isVisible, userId, storageKey]);

  const handleRate = async () => {
    if (rating === 0) return;
    
    try {
      // Save rating to local storage using the unique user key
      await AsyncStorage.setItem(storageKey, rating.toString());
      setHasRated(true);
      setConfirmedRating(rating);
      console.log(`User ${userId} rated: ${rating} stars and saved to storage`);
    } catch (e) {
      console.error("Failed to save rating", e);
    }
  };

  const handleRateAgain = () => {
    setHasRated(false);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.emoji}>{hasRated ? "💖" : "⭐"}</Text>
              <Text style={styles.title}>
                {hasRated ? "Thanks for the love!" : "Enjoying the Spark?"}
              </Text>
              <Text style={styles.subtitle}>
                {hasRated 
                  ? `You gave us ${confirmedRating} stars. We appreciate you!` 
                  : "Your feedback helps us make these sparks fly brighter!"}
              </Text>

              {/* Star Rating Row */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => !hasRated && setRating(star)}
                    activeOpacity={hasRated ? 1 : 0.7}
                    disabled={hasRated}
                  >
                    <Text style={[
                      styles.star,
                      { color: (hasRated ? confirmedRating : rating) >= star ? "#FFD700" : "#E2E8F0" }
                    ]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {hasRated && (
                <TouchableOpacity onPress={handleRateAgain} style={styles.rateAgainContainer}>
                  <Text style={styles.rateAgainText}>You have already rated us. Update your spark.</Text>
                </TouchableOpacity>
              )}

              {!hasRated && (
                <>
                  <TouchableOpacity 
                    style={[styles.submitBtn, rating === 0 && styles.disabledBtn]} 
                    onPress={handleRate}
                    disabled={rating === 0}
                  >
                    <Text style={styles.submitBtnText}>RATE NOW</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={onClose} style={styles.maybeLater}>
                    <Text style={styles.maybeLaterText}>Maybe Later</Text>
                  </TouchableOpacity>
                </>
              )}

              {hasRated && (
                <TouchableOpacity style={styles.submitBtn} onPress={onClose}>
                  <Text style={styles.submitBtnText}>CLOSE</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    position: "relative"
  },
  closeBtn: {
    position: "absolute",
    top: 15,
    right: 20,
    padding: 5,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#000",
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  starRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  star: {
    fontSize: 40,
    marginHorizontal: 4,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  rateAgainContainer: {
    marginBottom: 25,
  },
  rateAgainText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textDecorationLine: "underline",
  },
  submitBtn: {
    backgroundColor: "#000",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    marginBottom: 15,
  },
  disabledBtn: {
    backgroundColor: "#94A3B8",
    borderColor: "#94A3B8"
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
  maybeLater: {
    marginTop: 5,
  },
  maybeLaterText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default RateModal;