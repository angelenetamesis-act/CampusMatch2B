import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Image 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RecentDelModal({ 
  visible, 
  onClose, 
  user, 
  deletedConversations, 
  setDeletedConversations, 
  renderAvatar 
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [targetId, setTargetId] = useState(null);

  const handleRestoreChat = async (id) => {
    try {
      const deletedJSON = await AsyncStorage.getItem(`@deleted_chats_${user.id}`);
      let deletedIds = deletedJSON ? JSON.parse(deletedJSON) : [];
      const updated = deletedIds.filter(item => item !== id);
      await AsyncStorage.setItem(`@deleted_chats_${user.id}`, JSON.stringify(updated));
      setDeletedConversations(prev => prev.filter(c => c.otherId !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const triggerConfirmDelete = (id) => {
    setTargetId(id);
    setConfirmVisible(true);
  };

  const executePermanentDelete = async () => {
    if (!targetId) return;
    try {
      const deletedJSON = await AsyncStorage.getItem(`@deleted_chats_${user.id}`);
      let deletedIds = deletedJSON ? JSON.parse(deletedJSON) : [];
      const updatedDeleted = deletedIds.filter(item => item !== targetId);
      await AsyncStorage.setItem(`@deleted_chats_${user.id}`, JSON.stringify(updatedDeleted));
      
      const sharedChatKey = [user.id, targetId].sort().join('_');
      await AsyncStorage.removeItem(`@msg_history_${sharedChatKey}`);

      const metaKey = `@chat_meta_${user.id}`;
      const metaData = await AsyncStorage.getItem(metaKey);
      if (metaData) {
        let meta = JSON.parse(metaData);
        const updatedMeta = meta.filter(m => m.otherId !== targetId);
        await AsyncStorage.setItem(metaKey, JSON.stringify(updatedMeta));
      }

      setDeletedConversations(prev => prev.filter(c => c.otherId !== targetId));
      setConfirmVisible(false);
      setTargetId(null);
    } catch (e) {
      console.error("Permanent Wipe Error:", e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.trashCard}>
          <View style={styles.trashHeader}>
            <Text style={styles.trashHeaderText}>RECENTLY DELETED</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{fontWeight: '900', fontSize: 18}}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList 
            data={deletedConversations}
            keyExtractor={item => item.otherId}
            contentContainerStyle={{padding: 15}}
            renderItem={({item}) => (
              <View style={styles.trashRow}>
                 {renderAvatar(item.avatar, 45, true)}
                 <Text style={styles.trashName} numberOfLines={1}>{item.otherName}</Text>
                 <View style={styles.trashActions}>
                   <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestoreChat(item.otherId)}>
                      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/16705/16705618.png' }} style={{ width: 16, height: 16 }} />
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.permDeleteBtn} onPress={() => triggerConfirmDelete(item.otherId)}>
                      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4402/4402561.png' }} style={{ width: 16, height: 16 }} />
                   </TouchableOpacity>
                 </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyTextSmall}>Your trash is empty.</Text>}
          />
        </View>

        <Modal visible={confirmVisible} transparent animationType="fade">
            <View style={styles.confirmOverlay}>
                <View style={styles.confirmBox}>
                    <Text style={styles.confirmTitle}>WIPE HISTORY?</Text>
                    <Text style={styles.confirmSub}>This will permanently erase all messages. You will stay matched, but the chat will start fresh.</Text>
                    <View style={styles.confirmRow}>
                        <TouchableOpacity style={styles.noBtn} onPress={() => setConfirmVisible(false)}>
                            <Text style={styles.noText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.yesBtn} onPress={executePermanentDelete}>
                            <Text style={styles.yesBtnText}>YES, WIPE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  trashCard: { width: '90%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 25, borderWidth: 3, borderColor: '#000', overflow: 'hidden' },
  trashHeader: { padding: 20, borderBottomWidth: 3, borderColor: '#000', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFF' },
  trashHeaderText: { fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  trashRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1.5, borderColor: '#F1F5F9', paddingHorizontal: 10 },
  trashName: { flex: 1, marginLeft: 12, fontWeight: '900', fontSize: 14 },
  trashActions: { flexDirection: 'row' },
  restoreBtn: { width: 35, height: 35, backgroundColor: '#DCFCE7', borderWidth: 2, borderColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  permDeleteBtn: { width: 35, height: 35, backgroundColor: '#FEE2E2', borderWidth: 2, borderColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyTextSmall: { textAlign: 'center', color: '#94A3B8', fontWeight: '800', fontSize: 12, marginVertical: 20 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { width: '80%', backgroundColor: '#fff', borderRadius: 20, borderWidth: 3, borderColor: '#000', padding: 20 },
  confirmTitle: { fontWeight: '900', fontSize: 18, textAlign: 'center', marginBottom: 10 },
  confirmSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 20, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  noBtn: { flex: 1, padding: 12, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#000', borderRadius: 10, marginRight: 5, alignItems: 'center' },
  noText: { fontWeight: '900', fontSize: 12 },
  yesBtn: { flex: 1, padding: 12, backgroundColor: '#FECACA', borderWidth: 2, borderColor: '#000', borderRadius: 10, marginLeft: 5, alignItems: 'center' },
  yesBtnText: { fontWeight: '900', fontSize: 12, color: '#000' }
});