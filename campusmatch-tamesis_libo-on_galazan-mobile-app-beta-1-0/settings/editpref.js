import React from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Modal, TextInput, Platform, SafeAreaView 
} from "react-native";

const SelectionRow = ({ label, items, selected, onSelect }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.chipRow}>
      {items.map(item => (
        <TouchableOpacity 
          key={item} 
          style={selected === item ? styles.chipSelected : styles.chip} 
          onPress={() => onSelect(item)}
        >
          <Text style={selected === item ? styles.chipTextSelected : styles.chipText}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const EditPreferencesModal = ({ 
  visible, onClose, onSave, 
  tempPurpose, setTempPurpose,
  tempPrefCampus, setTempPrefCampus,
  tempPrefCourse, setTempPrefCourse,
  tempPrefYear, setTempPrefYear,
  tempPrefGender, setTempPrefGender,
  tempPrefAge, setTempPrefAge
}) => {
  
  const campusCourses = {
    "Talisay": [
    "BS Information Technology", 
    "BS Science in Civil Engineering", 
    "BS Education", "BS Psychology", 
    "BS Hospitality Management", 
    "BS Architecture"],

    "Alijis": [
    "BS Information Technology", 
    "BS Information Systems", 
    "BT-Vocational Teacher Education", 
    "BS Engineering", 
    "Bachelor of Industrial Technology"],

    "Fortune Town": [
    "BS Business Administration",
    "BS Office Administration",
    "BS Entrepreneurship",
    "BS Customs Administration"],

    "Binalbagan": [
    "BS Business Administration",
    "BS Office Administration",
    "BS Entrepreneurship",
    "BS Customs Administration"],
    
    "Any": ["Any"]
  };

  return (
    <Modal 
      visible={visible} 
      animationType="fade" // Slicker, smooth, and fast animation
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 45 }} /> 
          <Text style={styles.headerTitle}>MATCH FILTERS</Text>
          <View style={{ width: 45 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <SelectionRow 
            label="I am looking for..." 
            items={["Dating", "Friend/Company", "Study Buddy"]} 
            selected={tempPurpose} 
            onSelect={setTempPurpose} 
          />

          <SelectionRow 
            label="Preferred Campus" 
            items={["Talisay", "Alijis", "Fortune Town", "Binalbagan", "Any"]} 
            selected={tempPrefCampus} 
            onSelect={(val) => { 
              setTempPrefCampus(val); 
              if (val === "Any") setTempPrefCourse("Any"); 
              else setTempPrefCourse(""); 
            }} 
          />

          <View style={{ marginBottom: 20 }}>
            <Text style={styles.inputLabel}>Preferred Course</Text>
            {tempPrefCampus === "Any" ? (
              <View style={[styles.modalInput, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                <Text style={{ color: '#64748B', fontWeight: '700' }}>Any (All Courses)</Text>
              </View>
            ) : (
              Platform.OS === 'web' ? (
                <select 
                  style={webStyles.select} 
                  value={tempPrefCourse} 
                  onChange={(e) => setTempPrefCourse(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {tempPrefCampus && campusCourses[tempPrefCampus]?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <TextInput 
                  placeholder="e.g. BSIT" 
                  style={styles.modalInput} 
                  value={tempPrefCourse} 
                  onChangeText={setTempPrefCourse} 
                />
              )
            )}
          </View>

          <SelectionRow 
            label="Year Level" 
            items={["1st Year", "2nd Year", "3rd Year", "4th Year", "Any"]} 
            selected={tempPrefYear} 
            onSelect={setTempPrefYear} 
          />

          <SelectionRow 
            label="Interested In" 
            items={["Men", "Women", "Both"]} 
            selected={tempPrefGender} 
            onSelect={setTempPrefGender} 
          />

          <Text style={styles.inputLabel}>Age Range (e.g. 18-22)</Text>
          <TextInput 
            placeholder="Type range..." 
            style={styles.modalInput} 
            value={tempPrefAge} 
            onChangeText={setTempPrefAge} 
            keyboardType="numeric"
          />

          {/* Action Buttons */}
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>SAVE PREFERENCES</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>CANCEL EDIT</Text>
          </TouchableOpacity>
          
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const webStyles = {
  select: { 
    width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #000', 
    backgroundColor: '#fff', fontSize: '14px', fontWeight: '700', outline: 'none' 
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  header: { 
    height: 70, backgroundColor: "#fff", flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,
    borderBottomWidth: 3, borderColor: '#000'
  },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  scrollPadding: { padding: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#000', marginBottom: 10, textTransform: 'uppercase' },
  modalInput: { 
    backgroundColor: "#fff", padding: 15, borderRadius: 12, fontSize: 14, 
    borderWidth: 2, borderColor: "#000", color: '#000', fontWeight: '700' 
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { 
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 10, 
    marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: '#CBD5E1' 
  },
  chipSelected: { 
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFD700', borderRadius: 10, 
    marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0
  },
  chipText: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  chipTextSelected: { color: '#000', fontSize: 12, fontWeight: '900' },
  saveBtn: { 
    marginTop: 20, padding: 18, borderRadius: 15, backgroundColor: '#000', 
    alignItems: 'center', borderWidth: 2, borderColor: '#000' 
  },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  // Cancel Button Styled to match Save Button layout
  cancelBtn: { 
    marginTop: 12, padding: 18, borderRadius: 15, backgroundColor: '#F1F5F9', 
    alignItems: 'center', borderWidth: 2, borderColor: '#000' 
  },
  cancelBtnText: { color: '#64748B', fontWeight: '900', fontSize: 14 }
});

export default EditPreferencesModal;