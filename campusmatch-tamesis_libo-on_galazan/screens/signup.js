import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Modal, Platform, Dimensions
} from "react-native";

const { width } = Dimensions.get('window');

// --- HELPERS ---
const isFieldEmpty = (val) => !val || (typeof val === 'string' && val.trim() === "");

const SelectionRow = ({ label, items, selected, onSelect, error }) => (
  <View style={{ marginBottom: 15 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {error && !selected && <Text style={styles.errorText}>! REQUIRED</Text>}
    </View>
    <View style={styles.row}>
      {items.map(item => (
        <TouchableOpacity
          key={item}
          style={[
            selected === item ? styles.chipSelected : styles.chip,
            error && !selected ? { borderColor: '#ef4444' } : null
          ]}
          onPress={() => onSelect(item)}
        >
          <Text style={selected === item ? styles.chipTextSelected : styles.chipText}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const InputField = ({ 
  placeholder, value, onChangeText, error, secureTextEntry, 
  keyboardType, editable = true, isEmailField, isPasswordField 
}) => {
  const isInvalidEmail = isEmailField && value && !value.toLowerCase().endsWith("@chmsu.edu.ph");
  const hasMinLength = value.length >= 8;
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  const requirementsMet = [hasMinLength, hasNumber, hasSpecial].filter(Boolean).length;
  const isInvalidPassword = isPasswordField && value && requirementsMet < 3;

  const showRedBorder = (error && isFieldEmpty(value)) || (error && isInvalidEmail) || (error && isInvalidPassword);

  return (
    <View style={{ marginBottom: 12 }}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={[
          styles.input,
          showRedBorder ? styles.inputError : null,
          !editable && { backgroundColor: '#e2e8f0' }
        ]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
      />
      {error && isFieldEmpty(value) && <Text style={styles.miniError}>THIS FIELD IS REQUIRED!</Text>}
      {error && isInvalidEmail && <Text style={styles.miniError}>MUST BE A VALID @CHMSU.EDU.PH EMAIL!</Text>}
      
      {isPasswordField && value.length > 0 && (
        <View style={styles.passwordStrengthContainer}>
          {/* FIXED: Changed <div> back to <View> */}
          <View style={styles.strengthBarBackground}>
            <View 
              style={[
                styles.strengthBarFill, 
                { 
                  width: `${(requirementsMet / 3) * 100}%`,
                  backgroundColor: requirementsMet === 3 ? '#10b981' : requirementsMet === 2 ? '#FFD700' : '#ef4444'
                }
              ]} 
            />
          </View>
          <View style={styles.requirementRow}>
            <Text style={[styles.requirementText, hasMinLength && styles.requirementMet]}>{hasMinLength ? '✓' : '○'} 8+ CHARS</Text>
            <Text style={[styles.requirementText, hasNumber && styles.requirementMet]}>{hasNumber ? '✓' : '○'} NUMBER</Text>
            <Text style={[styles.requirementText, hasSpecial && styles.requirementMet]}>{hasSpecial ? '✓' : '○'} SYMBOL</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default function SignupScreen({ onBack, onSignupSuccess }) {
  const [phase, setPhase] = useState(1);
  const scrollRef = useRef(null); 
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);

  // Phase 1 States
  const [selectedUni, setSelectedUni] = useState("");
  const [campus, setCampus] = useState("");
  const [userCourse, setUserCourse] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [selDay, setSelDay] = useState("");
  const [selMonth, setSelMonth] = useState("");
  const [selYear, setSelYear] = useState("");
  const [birthdayText, setBirthdayText] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");

  // Phase 2 States
  const [age, setAge] = useState("");
  const [selectedBrgy, setSelectedBrgy] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");

  const [anonName, setAnonName] = useState("Click the dice!");
  const aestheticNames = ["Mamamoblo", "Lobo sa Langin", "Velvet Muse", "Lunar Echo", "Golden Aura", "Midnight Poet", "Jose Rizal Jr.", "Ivory Soul", "Crimson Bloom", "Azure Serene", "Ethereal Drift"];

  // Phase 4 States
  const [purpose, setPurpose] = useState("");
  const [prefCampus, setPrefCampus] = useState("");
  const [prefCourse, setPrefCourse] = useState("");
  const [prefYear, setPrefYear] = useState("");
  const [prefGender, setPrefGender] = useState("");
  const [prefAge, setPrefAge] = useState("");

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const campusCourses = {
    "Talisay": ["BSIT", "BSCE", "BSEd", "BSPsych", "BSHM", "BSArch"],
    "Alijis": ["BSIT", "BSEMC", "BSIS", "BSTCM"],
    "Fortune Town": ["BSBA", "BSOA", "BSEntrep", "BSCA"],
    "Binalbagan": ["BS Fisheries", "BS Agriculture", "BSEd", "BS Crim"],
    "Any": ["Any"]
  };

  const bacolodBarangays = ["Alangilan", "Alijis", "Banago", "Bata", "Estefania", "Granada", "Handumanan", "Mandalagan", "Mansilingan", "Pahanocoy", "Singcang", "Sum-ag", "Villamonte", "Vista Alegre"].sort();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [phase]);

  useEffect(() => {
    if (selDay && selMonth && selYear) {
      const monthName = months[parseInt(selMonth) - 1];
      setBirthdayText(`${monthName} ${selDay}, ${selYear}`);
      const birthDate = new Date(selYear, selMonth - 1, selDay);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
      setAge(calculatedAge > 0 ? calculatedAge.toString() : "");
    }
  }, [selDay, selMonth, selYear]);

  useEffect(() => {
    if (firstName && middleName && surname && selDay && selMonth && selYear) {
      const cleanDate = `${selMonth}${selDay}${selYear.slice(-2)}`;
      const generated = `${surname[0] || ''}${firstName[0] || ''}${middleName[0] || ''}${cleanDate}00`.toUpperCase();
      setSchoolId(generated);
    }
  }, [firstName, middleName, surname, selDay, selMonth, selYear]);

  const rollDice = () => {
    const randomIndex = Math.floor(Math.random() * aestheticNames.length);
    setAnonName(aestheticNames[randomIndex]);
  };

  const handleVerify = () => {
    setAttemptedNext(true);
    const emailLower = (schoolEmail || "").toLowerCase().trim();
    const isEmailValid = emailLower.endsWith("@chmsu.edu.ph");
    if (!selectedUni || !campus || !userCourse || !firstName || !middleName || !surname || !selDay || !selMonth || !selYear || !q1 || !q2 || !q3 || !schoolEmail) {
      Alert.alert("Incomplete Form", "All fields are required to verify your status.");
      return;
    }
    if (!isEmailValid) {
      Alert.alert("Verification Denied", "You are not a verified CHMSU student! Please use your official university email.");
      return;
    }
    if (q1 === "Talisay" && q2 === "Registrar" && q3 === "Dr. Norberto Mangulabnan") {
      setShowVerifyModal(true);
      setAttemptedNext(false);
    } else {
      Alert.alert("Security Check Failed", "Please provide the correct answers to the university security questions.");
    }
  };

  const handlePhase2Next = () => {
    setAttemptedNext(true);
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!age || !gender || !selectedBrgy || !password) {
      Alert.alert("Required Fields", "Please complete all fields.");
      return;
    }
    if (!hasMinLength || !hasNumber || !hasSpecial) {
      Alert.alert("Weak Password", "Your password does not meet the security requirements.");
      return;
    }
    setPhase(3);
    setAttemptedNext(false);
  };

  const handleCompleteSignup = () => {
    setAttemptedNext(true);
    if (!purpose || !prefCampus || !prefCourse || !prefGender || !prefYear) {
      Alert.alert("Incomplete", "Please finish all fields.");
      return;
    }
    setShowSuccessModal(true);
  };

  const handleBack = () => {
    setAttemptedNext(false);
    if (phase > 1) setPhase(phase - 1);
    else onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navHeader}>
        {phase > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.stampedIconBtn}>
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 45 }} /> 
        )}
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.loginRedirectText}>BACK TO LOGIN</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(phase / 4) * 100}%` }]} />
        </View>
        <Text style={styles.phaseIndicator}>STEP {phase} OF 4</Text>

        {phase === 1 && (
          <View>
            <Text style={styles.header}>School Verification</Text>
            <TouchableOpacity
              style={[styles.input, attemptedNext && !selectedUni ? styles.inputError : null, {marginBottom: 10}]}
              onPress={() => setShowUniDropdown(!showUniDropdown)}
            >
              <Text style={{ color: selectedUni ? "#000" : "#94a3b8", fontWeight: '700' }}>{selectedUni || "SELECT UNIVERSITY"}</Text>
            </TouchableOpacity>
            {showUniDropdown && (
              <View style={styles.dropdown}>
                <TouchableOpacity onPress={() => { setSelectedUni("Carlos Hilado Memorial State University"); setShowUniDropdown(false); }}>
                  <Text style={styles.dropdownItem}>Carlos Hilado Memorial State University</Text>
                </TouchableOpacity>
              </View>
            )}

            <SelectionRow
              label="Your Campus"
              items={["Talisay", "Binalbagan", "Fortune Town", "Alijis"]}
              selected={campus}
              onSelect={(val) => { setCampus(val); setUserCourse(""); }}
              error={attemptedNext}
            />

            {campus && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.label}>Your Course</Text>
                {Platform.OS === 'web' ? (
                  <select
                    style={{ ...webStyles.select, ...(attemptedNext && !userCourse ? { borderColor: '#ef4444' } : {}) }}
                    value={userCourse}
                    onChange={(e) => setUserCourse(e.target.value)}
                  >
                    <option value="">Select Course</option>
                    {campusCourses[campus].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <InputField placeholder="Your Course" value={userCourse} onChangeText={setUserCourse} error={attemptedNext} />
                )}
              </View>
            )}

            <InputField placeholder="First Name" value={firstName} onChangeText={setFirstName} error={attemptedNext} />
            <InputField placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} error={attemptedNext} />
            <InputField placeholder="Surname" value={surname} onChangeText={setSurname} error={attemptedNext} />

            <Text style={styles.label}>Birthday</Text>
            <View style={styles.dropdownRow}>
              {Platform.OS === 'web' ? (
                <>
                  <select style={{ ...webStyles.select, flex: 1 }} value={selMonth} onChange={(e) => setSelMonth(e.target.value)}>
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select style={{ ...webStyles.select, flex: 1 }} value={selDay} onChange={(e) => setSelDay(e.target.value)}>
                    <option value="">DD</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select style={{ ...webStyles.select, flex: 1 }} value={selYear} onChange={(e) => setSelYear(e.target.value)}>
                    <option value="">YYYY</option>
                    {Array.from({ length: 35 }, (_, i) => String(2010 - i)).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              ) : (
                <View style={{ flex: 1 }}>
                  <InputField placeholder="Birthday" value={birthdayText} onChangeText={setBirthdayText} error={attemptedNext} editable={false} />
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: -10, marginBottom: 15, fontWeight: '800' }}>FORMAT: {birthdayText || "PLEASE PROVIDE DATE"}</Text>
                </View>
              )}
            </View>

            <View style={styles.verificationDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>VERIFICATION DETAILS</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>School ID</Text>
            <View style={styles.idContainer}>
              <Text style={styles.idLabel}>GENERATED SCHOOL ID</Text>
              <Text style={styles.idValue}>{schoolId || "---"}</Text>
            </View>

            <Text style={styles.label}>School Email Address</Text>
            <InputField 
              placeholder="ex. juandelacruz@chmsu.edu.ph" 
              value={schoolEmail} 
              onChangeText={setSchoolEmail} 
              error={attemptedNext}
              keyboardType="email-address"
              isEmailField={true}
            />

            <View style={styles.verificationDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>QUICK SECURITY CHECK</Text>
              <View style={styles.dividerLine} />
            </View>
            <SelectionRow label="1. Main Campus?" items={["Talisay", "Alijis", "Binalbagan"]} selected={q1} onSelect={setQ1} error={attemptedNext} />
            <SelectionRow label="2. Busiest Office?" items={["Library", "Registrar", "Clinic"]} selected={q2} onSelect={setQ2} error={attemptedNext} />
            <SelectionRow label="3. University President?" items={["Dr. Norberto Mangulabnan", "Dr. Jose Rizal"]} selected={q3} onSelect={setQ3} error={attemptedNext} />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify}><Text style={styles.primaryBtnText}>VERIFY STUDENT STATUS</Text></TouchableOpacity>
          </View>
        )}

        {phase === 2 && (
          <View>
            <Text style={styles.header}>Personal Info</Text>
            <View style={styles.sectionContainer}>
              <View style={styles.verificationDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>PROFILE IDENTITY</Text>
              <View style={styles.dividerLine} />
            </View>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.readOnlyDisplay}><Text style={styles.readOnlyText}>{`${firstName} ${middleName} ${surname}`}</Text></View>
              <Text style={styles.label}>Birthday</Text>
              <View style={styles.readOnlyDisplay}><Text style={styles.readOnlyText}>{birthdayText}</Text></View>
              <Text style={styles.label}>Age</Text>
              <View style={styles.readOnlyDisplay}><Text style={styles.readOnlyText}>{age || "Calculating..."}</Text></View>
              <SelectionRow label="Gender" items={["Male", "Female", "Non-binary"]} selected={gender} onSelect={setGender} error={attemptedNext} />
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.verificationDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ADDRESS</Text>
              <View style={styles.dividerLine} />
            </View>
              <Text style={styles.label}>Barangay (Bacolod Only)</Text>
              {Platform.OS === 'web' ? (
                <select style={{ ...webStyles.select }} value={selectedBrgy} onChange={(e) => setSelectedBrgy(e.target.value)}>
                  <option value="">Select Barangay</option>
                  {bacolodBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <InputField placeholder="Barangay" value={selectedBrgy} onChangeText={setSelectedBrgy} error={attemptedNext} />
              )}
              <View style={styles.addressDisplayBox}>
                  <Text style={styles.addressLabel}>FULL ADDRESS - -</Text>
                  <Text style={styles.addressValue}>
                    {selectedBrgy ? `${selectedBrgy}, Bacolod City, Negros Occidental` : "Please select a barangay"}
                  </Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.verificationDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>LOGIN CREDENTIALS</Text>
              <View style={styles.dividerLine} />
            </View>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.readOnlyDisplay}><Text style={styles.readOnlyText}>{schoolEmail}</Text></View>
              <Text style={styles.label}>Password</Text>
              <InputField 
                placeholder="Create Password" 
                value={password} 
                secureTextEntry 
                onChangeText={setPassword} 
                error={attemptedNext} 
                isPasswordField={true}
              />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handlePhase2Next}><Text style={styles.primaryBtnText}>NEXT STEP</Text></TouchableOpacity>
          </View>
        )}

        {phase === 3 && (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.header}>Secret Identity</Text>
            <TouchableOpacity style={styles.diceButton} onPress={rollDice}>
                <Text style={{ fontSize: 60 }}>🎲</Text>
            </TouchableOpacity>
            <View style={styles.aliasDisplay}><Text style={styles.aliasValue}>{anonName}</Text></View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase(4)}><Text style={styles.primaryBtnText}>CONFIRM ALIAS</Text></TouchableOpacity>
          </View>
        )}

        {phase === 4 && (
          <View>
            <Text style={styles.header}>Preferences</Text>
            <SelectionRow label="I am looking for..." items={["Dating", "Friend/Company", "Study Buddy"]} selected={purpose} onSelect={setPurpose} error={attemptedNext} />
            <SelectionRow
              label="Preferred Campus"
              items={["Talisay", "Binalbagan", "Fortune Town", "Alijis", "Any"]}
              selected={prefCampus}
              onSelect={(val) => { setPrefCampus(val); if (val === "Any") setPrefCourse("Any"); else setPrefCourse(""); }}
              error={attemptedNext}
            />
            {prefCampus && (
              <View style={{ marginBottom: 15 }}>
                <Text style={styles.label}>Preferred Course</Text>
                {Platform.OS === 'web' ? (
                  <select style={{ ...webStyles.select }} value={prefCourse} onChange={(e) => setPrefCourse(e.target.value)} disabled={prefCampus === "Any"}>
                    <option value="">Select Course</option>
                    {campusCourses[prefCampus].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <InputField placeholder="Preferred Course" value={prefCourse} onChangeText={setPrefCourse} error={attemptedNext} editable={prefCampus !== "Any"} />
                )}
              </View>
            )}
            <SelectionRow label="Preferred Year Level" items={["1st Year", "2nd Year", "3rd Year", "4th Year", "Any"]} selected={prefYear} onSelect={setPrefYear} error={attemptedNext} />
            <SelectionRow label="Interested In" items={["Men", "Women", "Both"]} selected={prefGender} onSelect={setPrefGender} error={attemptedNext} />
            <TextInput placeholder="Age Range (Optional)" placeholderTextColor="#94a3b8" style={styles.input} value={prefAge} onChangeText={setPrefAge} />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#FFD700' }]} onPress={handleCompleteSignup}><Text style={[styles.primaryBtnText, {color: '#000'}]}>FINISH SIGNUP</Text></TouchableOpacity>
          </View>
        )}

        {/* MODAL: VERIFICATION SUCCESS */}
        <Modal visible={showVerifyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <View style={styles.verifyBadgeContainer}>
                <View style={styles.outerCircle}>
                   <View style={styles.innerCircle}>
                      <Text style={styles.checkIcon}>✓</Text>
                   </View>
                </View>
              </View>
              
              <Text style={styles.confirmTitle}>Student Verified!</Text>
              
              <View style={styles.verificationSummary}>
                <Text style={styles.vLabel}>UNIVERSITY:</Text>
                <Text style={styles.vValue}>{selectedUni}</Text>
                
                <Text style={styles.vLabel}>CAMPUS & COURSE:</Text>
                <Text style={styles.vValue}>{campus} - {userCourse}</Text>
                
                <Text style={styles.vLabel}>FULL NAME:</Text>
                <Text style={styles.vValue}>{`${firstName} ${middleName} ${surname}`}</Text>
                
                <Text style={styles.vLabel}>SCHOOL ID:</Text>
                <Text style={styles.vValue}>{schoolId}</Text>
                
                <Text style={styles.vLabel}>VERIFIED EMAIL:</Text>
                <Text style={styles.vValue}>{schoolEmail}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#2563eb' }]} 
                onPress={() => { setShowVerifyModal(false); setTimeout(() => setPhase(2), 100); }}
              >
                <Text style={styles.primaryBtnText}>Continue to Personal Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <Text style={{ fontSize: 60 }}>🛡️</Text>
              <Text style={styles.confirmTitle}>Secured!</Text>
              <View style={styles.privacyBox}>
                <Text style={styles.privacyText}>Welcome, <Text style={{fontWeight: '900', color: '#000'}}>{anonName}</Text>.</Text>
                <Text style={[styles.privacyText, {marginTop: 10}]}>Your identity is protected. Nobody can see your real name. You are anonymous!</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  onSignupSuccess({
                    email: schoolEmail, password, anonName, firstName, middleName, surname,
                    schoolId, schoolEmail, birthdayText, selectedUni, campus, userCourse,
                    age, gender, purpose, prefCampus, prefCourse, prefYear, prefGender, prefAge,
                    address: selectedBrgy ? `${selectedBrgy}, Bacolod City, Negros Occidental` : "Not Provided"
                  });
                  onBack();
                }}
              >
                <Text style={styles.primaryBtnText}>PROCEED TO LOGIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = {
  select: { width: '100%', padding: '14px', borderRadius: '12px', border: '3px solid #000', backgroundColor: '#fff', fontSize: '14px', fontWeight: '800', marginBottom: '15px', outline: 'none' }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  navHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    height: 70, 
    backgroundColor: '#fff', 
    borderBottomWidth: 3, 
    borderColor: '#000' 
  },
  stampedIconBtn: {
    backgroundColor: '#fff', width: 45, height: 45, borderRadius: 12, borderWidth: 3, borderColor: '#000',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4
  },
  backArrowText: { fontSize: 20, color: '#000', fontWeight: '900' },
  loginRedirectText: { color: '#000', fontWeight: '900', fontSize: 13, textDecorationLine: 'underline' },
  scrollContent: { 
    padding: 25,
  },
  header: { fontSize: 32, fontWeight: "900", color: "#000", marginBottom: 20, letterSpacing: -1 },
  label: { fontSize: 12, fontWeight: "900", color: "#000", marginBottom: 5, textTransform: 'uppercase' },
  input: { 
    backgroundColor: "#fff", padding: 16, borderRadius: 12, fontSize: 16, fontWeight: '700',
    borderWidth: 3, borderColor: "#000", color: '#000'
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  errorText: { fontSize: 10, color: '#ef4444', fontWeight: '900' },
  miniError: { color: '#ef4444', fontSize: 10, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  
  passwordStrengthContainer: { marginTop: 8 },
  strengthBarBackground: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 0, borderWidth: 2, borderColor: '#000', overflow: 'hidden', marginBottom: 8 },
  strengthBarFill: { height: '100%' },
  requirementRow: { flexDirection: 'row', justifyContent: 'space-between' },
  requirementText: { fontSize: 9, color: '#94a3b8', fontWeight: '900' },
  requirementMet: { color: '#000' },

  sectionContainer: { marginBottom: 20 },
  dropdownRow: { flexDirection: 'row', gap: 10 },
  dropdown: { backgroundColor: "#fff", borderWidth: 3, borderColor: "#000", borderRadius: 12, padding: 5, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, elevation: 4 },
  dropdownItem: { padding: 12, color: "#000", fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap" },
  chip: { 
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, 
    marginRight: 10, marginBottom: 10, borderWidth: 3, borderColor: '#000' 
  },
  chipSelected: { 
    backgroundColor: "#FFD700", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, 
    marginRight: 10, marginBottom: 10, borderWidth: 3, borderColor: '#000',
    shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, elevation: 4
  },
  chipText: { color: "#000", fontWeight: "800", fontSize: 13 },
  chipTextSelected: { color: "#000", fontWeight: "900", fontSize: 13 },
  idContainer: { 
    backgroundColor: "#fff", padding: 20, borderRadius: 15, marginBottom: 20, 
    alignItems: "center", borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, elevation: 5
  },
  idLabel: { fontSize: 11, fontWeight: '900', color: "#64748B", marginBottom: 5, textTransform: 'uppercase' },
  idValue: { fontSize: 26, fontWeight: "900", color: "#000" },
  primaryBtn: { 
    backgroundColor: "#000", padding: 20, borderRadius: 15, marginTop: 10, width: '100%',
    borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, elevation: 4
  },
  primaryBtnText: { color: "#fff", textAlign: "center", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  diceButton: { 
    padding: 25, backgroundColor: '#fff', borderRadius: 100, marginBottom: 20, 
    borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, elevation: 5 
  },
  aliasDisplay: { 
    backgroundColor: '#FFD700', padding: 25, borderRadius: 15, borderWidth: 3, borderColor: '#000', 
    width: '100%', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1
  },
  aliasValue: { fontSize: 26, fontWeight: '900', color: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(245, 247, 255, 0.95)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: {
    width: width * 0.9, backgroundColor: '#fff', borderRadius: 25, 
    borderWidth: 4, borderColor: '#000', padding: 25, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 10, height: 10 }, shadowOpacity: 1, shadowRadius: 0, elevation: 10
  },
  verifyBadgeContainer: { marginBottom: 15 },
  outerCircle: { width: 85, height: 85, borderRadius: 50, borderWidth: 4, borderColor: '#000', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  innerCircle: { width: 65, height: 65, borderRadius: 40, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  checkIcon: { color: '#fff', fontSize: 35, fontWeight: '900' },
  confirmTitle: { fontSize: 28, fontWeight: '900', marginBottom: 20, color: '#000', textTransform: 'uppercase', letterSpacing: -1 },
  verificationSummary: { width: '100%', backgroundColor: '#f8fafc', padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 3, borderColor: '#000' },
  vLabel: { fontSize: 11, color: '#64748b', fontWeight: '900', marginBottom: 2 },
  vValue: { fontSize: 15, color: '#000', fontWeight: '900', marginBottom: 12 },
  progressBar: { height: 12, backgroundColor: "#fff", borderRadius: 0, marginBottom: 8, borderWidth: 3, borderColor: '#000' },
  progressFill: { height: '100%', backgroundColor: "#FFD700" },
  phaseIndicator: { textAlign: "center", color: "#000", fontWeight: '900', fontSize: 12, marginBottom: 15 },
  verificationDivider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20, 
    justifyContent: 'center'
  },
  dividerLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#000'
  },
  dividerText: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#000', 
    letterSpacing: 1,
    paddingHorizontal: 12 
  },
  readOnlyDisplay: { backgroundColor: "#E2E8F0", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 3, borderColor: "#000" },
  readOnlyText: { color: "#000", fontSize: 16, fontWeight: '800' },
  addressDisplayBox: { marginTop: 5, padding: 15, backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#000', borderStyle: 'dashed' },
  addressLabel: { fontSize: 11, fontWeight: '900', color: '#64748b' },
  addressValue: { fontSize: 14, color: '#000', fontWeight: '800', marginTop: 2 },
  privacyBox: { backgroundColor: '#F0F9FF', padding: 20, borderRadius: 15, marginBottom: 25, borderWidth: 2, borderColor: '#000' },
  privacyText: { color: '#000', textAlign: 'center', fontWeight: '700', lineHeight: 20 }
});