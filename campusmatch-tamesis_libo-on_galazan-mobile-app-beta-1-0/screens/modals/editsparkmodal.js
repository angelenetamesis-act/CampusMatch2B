import React, { useState } from "react";
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from "react-native";

const EditSparkModal = ({ visible, onClose, initialText, refresh }) => {
  const [edit, setEdit] = useState(initialText);

  const handleSave = () => {
    // Logic to update ONLY the text content
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.fadeOverlay}>
        <View style={styles.editCard}>
          <Text style={styles.modalTitle}>EDIT SPARK</Text>
          <TextInput style={styles.editInput} multiline value={edit} onChangeText={setEdit} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={{color: '#fff', fontWeight: '800', textAlign: 'center'}}>SAVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
export default EditSparkModal;
