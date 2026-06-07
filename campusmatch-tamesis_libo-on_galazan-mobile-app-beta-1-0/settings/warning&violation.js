import AsyncStorage from '@react-native-async-storage/async-storage';

export var BANNED_WORDS = ["pota", "tangina", "gago", "gaga", "mama mo", "bobo", "kinginamo", "king ina mo", "fuck", "fuck you", "fck", "fck u", "fck you", "fuck u", "bwesit", "giatay", "pisti", "pesti", "ukininam", "kanim iroy"];

export var checkViolation = function(text) {
  var words = text.toLowerCase().split(/\s+/);
  var detected = words.filter(function(word) { return BANNED_WORDS.includes(word); });
  return {
    isViolated: detected.length > 0,
    violatedWords: detected.filter(function(w, i, a) { return a.indexOf(w) === i; })
  };
};

export var recordViolation = async function(userId, content, type, violatedWords, userMeta) {
  var meta = userMeta || {};
  try {
    var key = "@violations_" + userId;
    var stored = await AsyncStorage.getItem(key);
    var violations = stored ? JSON.parse(stored) : [];

    var newViolation = {
      id: Date.now().toString(),
      type: type,
      content: content,
      violatedWords: violatedWords,
      timestamp: new Date().toISOString(),
    };

    violations.push(newViolation);
    await AsyncStorage.setItem(key, JSON.stringify(violations));

    var adminRaw = await AsyncStorage.getItem("@violations_log");
    var adminLog = adminRaw ? JSON.parse(adminRaw) : [];

    adminLog.push({
      id: newViolation.id,
      type: newViolation.type,
      content: newViolation.content,
      violatedWords: newViolation.violatedWords,
      timestamp: Date.now(),
      userEmail: userId,
      anonName: meta.anonName || "Anonymous",
      userAvatar: meta.userAvatar || "👤",
    });

    await AsyncStorage.setItem("@violations_log", JSON.stringify(adminLog));

    return violations.length;
  } catch (e) {
    console.error("Failed to record violation", e);
    return 0;
  }
};

/**
 * checkSuspension
 * 
 * Returns an object describing the user's suspension status:
 * {
 *   isSuspended: boolean,       // true if suspended AND period not yet over
 *   isPending: boolean,         // true if 5 strikes hit but no admin decision yet
 *   suspensionData: object|null, // the raw suspension record from @suspended_users
 *   violationCount: number,
 * }
 * 
 * Usage:
 *   const status = await checkSuspension(user.email);
 *   if (status.isSuspended || status.isPending) { show modal }
 */
export var checkSuspension = async function(userEmail) {
  if (!userEmail) return { isSuspended: false, isPending: false, suspensionData: null, violationCount: 0 };
  try {
    // Get violation count
    const storedV = await AsyncStorage.getItem(`@violations_${userEmail}`);
    const violations = storedV ? JSON.parse(storedV) : [];
    const violationCount = violations.length;

    // Get suspension record
    const storedS = await AsyncStorage.getItem("@suspended_users");
    const allSuspended = storedS ? JSON.parse(storedS) : [];
    const suspensionData = allSuspended.find(s => s.userEmail === userEmail) || null;

    // Actively suspended (admin decided and time not yet up)
    const isSuspended = suspensionData !== null && Date.now() < suspensionData.suspensionUntil;

    // 5 strikes hit but admin hasn't acted yet
    const isPending = violationCount >= 5 && !suspensionData;

    return { isSuspended, isPending, suspensionData, violationCount };
  } catch (e) {
    console.error("checkSuspension error:", e);
    return { isSuspended: false, isPending: false, suspensionData: null, violationCount: 0 };
  }
};