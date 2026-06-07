import React, { useState } from "react";
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from "react-native";

const NewSparkModal = ({ visible, onClose, user, userAvatar, refresh }) => {
  const [text, setText] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [visibility, setVisibility] = useState(null);

  const handlePost = () => {
    // Logic to save with visibility and formatted tags:
    // content: `${text}\n${selectedTag || ''} ${selectedMood ? '#'+selectedMood : ''}`
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.fadeOverlay}>
        <View style={styles.createCard}>
          <TextInput multiline placeholder="Share your spark..." value={text} onChangeText={setText} />
          {selectedMood && <Text style={{fontWeight: 'bold'}}>Mood: {selectedMood}</Text>}
          <TouchableOpacity style={styles.saveBtn} onPress={handlePost}>
            <Text style={{color:'#fff', fontWeight:'800', textAlign: 'center'}}>POST SPARK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
export default NewSparkModal;