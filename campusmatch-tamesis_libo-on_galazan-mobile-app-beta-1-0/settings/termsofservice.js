import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";

// agreed       — controlled value from parent (so Settings can reflect signup state)
// onCheckChange — called with true/false whenever checkbox is toggled
const TermsOfServiceModal = ({ visible, onClose, onAgree, agreed, onCheckChange }) => {

  // If parent does not pass `agreed` as a controlled prop, fall back to local state
  const [localAgreed, setLocalAgreed] = useState(false);
  const isAgreed = agreed !== undefined ? agreed : localAgreed;

  // Reset local checkbox each time modal opens fresh (only when uncontrolled)
  // Note: If you want it to REMEMBER the state even when closed, 
  // you should manage 'agreed' state in the parent, not here.
  useEffect(() => {
    if (visible && agreed === undefined) {
      // If you want to PERSIST the choice, remove the setLocalAgreed(false) line.
      // But per your requirement of it resetting ONLY if they uncheck:
      // it should only reset if the user specifically clears it or resets the form.
    }
  }, [visible]);

  const handleCheck = () => {
    const next = !isAgreed;
    if (agreed === undefined) setLocalAgreed(next);   // uncontrolled mode
    if (onCheckChange) onCheckChange(next);           // notify parent either way
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>TERMS OF SERVICE</Text>
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>1. ELIGIBILITY</Text>
            <Text style={styles.bodyText}>You must be a currently enrolled student at our supported University campuses (Talisay, Alijis, Fortune Town, Binalbagan) to use CampusMatch.</Text>
            <Text style={styles.sectionHeader}>2. USER CONDUCT</Text>
            <Text style={styles.bodyText}>Bullying, harassment, or spreading misinformation via anonymous posts is strictly prohibited.</Text>
            <Text style={styles.sectionHeader}>3. ACCOUNT SECURITY</Text>
            <Text style={styles.bodyText}>You are responsible for maintaining the confidentiality of your session.</Text>
            <Text style={styles.sectionHeader}>4. PRIVACY</Text>
            <Text style={styles.bodyText}>Your real identity is kept anonymous to other users. Only your alias will be visible on the platform. We do not sell your personal data.</Text>
            <Text style={styles.sectionHeader}>5. CONTENT POLICY</Text>
            <Text style={styles.bodyText}>Any content that is offensive, discriminatory, or violates the dignity of other users will result in an immediate ban.</Text>
            <Text style={styles.sectionHeader}>6. TERMINATION</Text>
            <Text style={styles.bodyText}>We reserve the right to terminate any account that violates these terms without prior notice.</Text>
            <Text style={styles.sectionHeader}>7. CHANGES TO TERMS</Text>
            <Text style={styles.bodyText}>CampusMatch reserves the right to update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.</Text>
          </ScrollView>

          {/* Checkbox row — tapping toggles agreement and notifies parent */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={handleCheck}
            activeOpacity={0.7}
          >
            <View style={[styles.staticCheckbox, isAgreed && styles.staticCheckboxChecked]}>
              {isAgreed && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>I have read and agree to the Terms & Conditions</Text>
          </TouchableOpacity>

          {/* Agree button — only active when checkbox is ticked */}
          <TouchableOpacity
            style={[styles.agreeBtn, !isAgreed && styles.agreeBtnDisabled]}
            onPress={() => { if (isAgreed) onAgree(); }}
            activeOpacity={isAgreed ? 0.8 : 1}
          >
            <Text style={[styles.agreeBtnText, !isAgreed && styles.agreeBtnTextDisabled]}>
              I AGREE TO TERMS & CONDITIONS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>CANCEL</Text>
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
    alignItems: 'center' 
  },
  modalContainer: { 
    width: '90%', 
    height: '85%', 
    backgroundColor: '#fff', 
    borderRadius: 30, 
    borderWidth: 3, 
    borderColor: '#000', 
    padding: 25, 
    shadowColor: '#000', 
    shadowOffset: { width: 8, height: 8 }, 
    shadowOpacity: 1, 
    shadowRadius: 0 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: 2, 
    color: '#000', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  contentScroll: { 
    flex: 1 
  },
  sectionHeader: { 
    fontWeight: '900', 
    fontSize: 13, 
    color: '#000', 
    marginTop: 15, 
    marginBottom: 5, 
    textTransform: 'uppercase' 
  },
  bodyText: { 
    fontSize: 13, 
    color: '#334155', 
    lineHeight: 18, 
    fontWeight: '500' 
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  staticCheckbox: {
    width: 26,
    height: 26,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  staticCheckboxChecked: {
    backgroundColor: '#FFD700',
  },
  checkMark: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    flexShrink: 1,
    lineHeight: 18,
  },
  agreeBtn: { 
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#000', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  agreeBtnDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  agreeBtnText: { 
    color: '#fff',
    fontWeight: '900', 
    fontSize: 14,
    letterSpacing: 0.5,
  },
  agreeBtnTextDisabled: {
    color: '#94A3B8',
  },
  closeBtn: { 
    marginTop: 10, 
    backgroundColor: '#000', 
    paddingVertical: 15, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#000', 
    alignItems: 'center' 
  },
  closeBtnText: { 
    color: '#fff', 
    fontWeight: '900', 
    fontSize: 14 
  }
});

export default TermsOfServiceModal;