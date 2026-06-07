import React from "react";
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView 
} from "react-native";

const AboutUsModal = ({ visible, onClose }) => {
  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Encircled Question Mark Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>?</Text>
          </View>

          <Text style={styles.title}>ABOUT US</Text>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              <Text style={{ fontWeight: '900' }}>CampusMatch</Text> is the ultimate social hub designed exclusively for students. 
              We believe that campus life is about more than just grades—it's about the connections you make.
            </Text>

            <View style={styles.featureBox}>
              <Text style={styles.featureText}>🎯 <Text style={styles.bold}>Find Your Tribe:</Text> Whether it's dating, a study buddy, or just new friends.</Text>
              <Text style={styles.featureText}>🛡️ <Text style={styles.bold}>Anonymity First:</Text> Share your thoughts using your alias while keeping your real identity safe.</Text>
              <Text style={styles.featureText}>🕒 <Text style={styles.bold}>Real-Time:</Text> Connect through time-limited posts that keep the feed fresh and relevant.</Text>
            </View>

            <Text style={styles.footerText}>
              Built for students, by the DROPOUTS. Version 130.130
            </Text>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CLOSE PREVIEW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFD700',
    borderWidth: 3,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60, // Pops the icon out of the top slightly
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  iconText: {
    fontSize: 35,
    fontWeight: '900',
    color: '#000',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
    marginTop: 15,
    marginBottom: 10,
  },
  contentScroll: {
    width: '100%',
    maxHeight: 300,
  },
  description: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  featureBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 20,
  },
  featureText: {
    fontSize: 12,
    color: '#1E293B',
    marginBottom: 10,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '900',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
});

export default AboutUsModal;