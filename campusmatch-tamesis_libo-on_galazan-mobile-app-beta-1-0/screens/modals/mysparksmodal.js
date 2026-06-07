import React, { useState } from "react";
import { 
  View, Text, TouchableOpacity, FlatList, Modal, Image, StyleSheet 
} from "react-native";

const MySparksModal = ({ isVisible, onClose, matches, onUnmatch }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const initiateUnmatch = (match) => {
    setSelectedMatch(match);
    setShowConfirm(true);
  };

  const confirmUnmatch = () => {
    if (selectedMatch) {
      onUnmatch(selectedMatch.id);
      setShowConfirm(false);
      setSelectedMatch(null);
    }
  };

  const cancelUnmatch = () => {
    setShowConfirm(false);
    setSelectedMatch(null);
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.fadeOverlay}>
        <View style={styles.floatingModalCard}>
          <View style={styles.commentHeader}>
            <View>
              <Text style={styles.commentTitle}>Mutual Sparks</Text>
              <Text style={styles.matchCountSub}>{matches.length} Connections</Text>
            </View>
          </View>
          
          <FlatList 
            data={matches}
            keyExtractor={m => m.id}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <View style={styles.matchRow}>
                <View style={styles.matchInfo}>
                  <View style={styles.matchAvatar}>
                    {item.avatar?.startsWith('http') ? (
                      <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{item.avatar}</Text>
                    )}
                  </View>
                  <Text style={styles.matchName}>{item.anonName}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.unmatchBtn} 
                  onPress={() => initiateUnmatch(item)}
                >
                  <Text style={styles.unmatchBtnText}>UNSPARK</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No mutual sparks yet.</Text>}
          />
          
          <TouchableOpacity style={styles.closeFloatingBtn} onPress={onClose}>
            <Text style={styles.closeFloatingText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEmoji}>💔</Text>
            <Text style={styles.confirmTitle}>Unspark with {selectedMatch?.anonName}?</Text>
            <Text style={styles.confirmSub}>This will remove them from your mutual connections permanently.</Text>
            
            <View style={styles.confirmActionRow}>
              <TouchableOpacity style={styles.noBtn} onPress={cancelUnmatch}>
                <Text style={styles.noBtnText}>NO, KEEP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.yesBtn} onPress={confirmUnmatch}>
                <Text style={styles.yesBtnText}>YES, UNSPARK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 99999 },
  floatingModalCard: { backgroundColor: '#fff', width: '90%', borderRadius: 30, padding: 20, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  commentTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  matchCountSub: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1.5, borderColor: '#F1F5F9' },
  matchInfo: { flexDirection: 'row', alignItems: 'center' },
  matchAvatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#000', backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 20 },
  matchName: { fontWeight: '900', fontSize: 15, color: '#1E293B' },
  unmatchBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#000' },
  unmatchBtnText: { fontSize: 10, fontWeight: '900', color: '#991B1B' },
  emptyText: { textAlign: 'center', marginTop: 20, fontWeight: '700', color: '#94A3B8', paddingBottom: 20 },
  closeFloatingBtn: { marginTop: 20, backgroundColor: '#000', paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  closeFloatingText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  confirmCard: { backgroundColor: '#fff', width: '80%', borderRadius: 25, padding: 25, borderWidth: 3, borderColor: '#000', alignItems: 'center' },
  confirmEmoji: { fontSize: 40, marginBottom: 10 },
  confirmTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center' },
  confirmSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 10, fontWeight: '600' },
  confirmActionRow: { flexDirection: 'row', marginTop: 25, width: '100%' },
  noBtn: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 12, marginRight: 8, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  noBtnText: { fontWeight: '900', fontSize: 12, color: '#64748B' },
  yesBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 12, borderRadius: 12, marginLeft: 8, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  yesBtnText: { fontWeight: '900', fontSize: 12, color: '#991B1B' },
});

export default MySparksModal;