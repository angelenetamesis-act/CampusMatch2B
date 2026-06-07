import React from 'react';
import { 
  View, Text, FlatList, Modal, TouchableOpacity, Image, StyleSheet, Platform 
} from 'react-native';

const HistoryScreen = ({ isVisible, onClose, posts, now, getRelativeTime }) => {
  
  // Helper to format timestamp into Jan 1, 2026
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderHistoryPost = ({ item }) => {
    // Determine status
    const isExpired = item.expiryTime < now;
    const isDeleted = item.isDeleted === true || item.status === 'deleted';
    const isViolated = item.status === 'violated';

    // Determine status color and label
    let statusLabel = 'Active';
    let statusColor = '#10B981'; // Green

    if (isViolated) {
      statusLabel = 'VIOLATED';
      statusColor = '#F59E0B'; // Orange/Yellow
    } else if (isDeleted) {
      statusLabel = 'Deleted';
      statusColor = '#64748B'; // Gray
    } else if (isExpired) {
      statusLabel = 'Expired';
      statusColor = '#EF4444'; // Red
    }

    return (
      <View style={[
        styles.postCard, 
        { 
          backgroundColor: isViolated ? '#FFFBEB' : isDeleted ? '#F8FAFC' : isExpired ? '#FAF9FF' : '#fff',
          borderStyle: isDeleted ? 'dashed' : 'solid',
          borderColor: isViolated ? '#F59E0B' : '#000',
          opacity: isDeleted ? 0.9 : 1
        }
      ]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarMini, isViolated && { borderColor: '#F59E0B' }]}>
              <Text style={{ fontSize: 18 }}>{item.userAvatar || "👤"}</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.postAuthor}>{item.userName}</Text>
                {isViolated && (
                  <View style={[styles.youBadge, { backgroundColor: '#F59E0B', borderColor: '#000' }]}>
                    <Text style={[styles.youBadgeText, { color: '#fff' }]}>VIOLATION</Text>
                  </View>
                )}
                {isDeleted && !isViolated && (
                  <View style={[styles.youBadge, { backgroundColor: '#CBD5E1' }]}>
                    <Text style={styles.youBadgeText}>DELETED</Text>
                  </View>
                )}
              </View>
              
              {/* Updated Date Format Pattern */}
              <Text style={styles.postTime}>
                {formatDate(item.timestamp)} • {getRelativeTime(item.timestamp)} • Status: <Text style={{ color: statusColor, fontWeight: '900' }}>
                  {statusLabel}
                </Text>
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.contentArea}>
          <Text style={[styles.postText, isViolated && { color: '#92400E' }]}>{item.content}</Text>
          
          {/* Added Tag and Mood Display */}
          <View style={{flexDirection: 'row', marginTop: 8}}>
            {item.tag && <Text style={{fontSize: 12, color: '#7C3AED', fontWeight: '900'}}>{item.tag} </Text>}
            {item.mood && <Text style={{fontSize: 12, color: '#7C3AED', fontWeight: '900'}}>{item.mood}</Text>}
          </View>

          {isDeleted && !isViolated && (
            <Text style={[styles.postText, { 
              marginTop: 10, 
              fontStyle: 'italic', 
              color: '#94A3B8', 
              fontSize: 13 
            }]}>
              This spark was extinguished by the user.
            </Text>
          )}

          {isViolated && (
            <Text style={[styles.postText, { 
              marginTop: 10, 
              fontWeight: 'bold', 
              color: '#F59E0B', 
              fontSize: 12 
            }]}>
              ⚠️ This content breached community guidelines.
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={[
            styles.commentBtn, 
            { backgroundColor: (isExpired || isDeleted || isViolated) ? '#E2E8F0' : '#DCFCE7' }
          ]}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/13/13673.png' }} 
              style={styles.commentIcon} 
            />
            <Text style={styles.commentLabel}>
              {item.comments?.length || 0} COMMENTS (READ ONLY)
            </Text>
          </View>
          
          {item.comments && item.comments.length > 0 && (
            <View style={{ marginTop: 12 }}>
              {item.comments.map(c => (
                <View key={c.id} style={styles.historyCommentBubble}>
                  <Text style={styles.commentUser}>{c.userName}:</Text>
                  <Text style={styles.commentBodySmall}>{c.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="fade" transparent>
      <View style={styles.fadeOverlay}>
        <View style={styles.floatingModalCard}>
          <View style={styles.commentHeader}>
            <View>
              <Text style={styles.commentTitle}>Activity History</Text>
              <Text style={styles.matchCountSub}>
                Viewing {posts.length} archived sparks
              </Text>
            </View>
          </View>
          
          <FlatList
            data={posts}
            keyExtractor={m => m.id.toString()}
            renderItem={renderHistoryPost}
            ListEmptyComponent={<Text style={styles.emptyText}>No archived sparks found.</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            extraData={now} 
          />
          
          <TouchableOpacity style={styles.closeFloatingBtn} onPress={onClose}>
            <Text style={styles.closeFloatingText}>CLOSE ARCHIVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fadeOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  floatingModalCard: { backgroundColor: '#fff', width: '95%', height: '85%', borderRadius: 30, padding: 20, borderWidth: 3, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  commentTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  matchCountSub: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  closeFloatingBtn: { marginTop: 20, backgroundColor: '#000', paddingVertical: 12, borderRadius: 15, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  closeFloatingText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 50, fontWeight: '700', color: '#94A3B8' },
  postCard: { backgroundColor: '#fff', borderRadius: 25, marginBottom: 20, padding: 18, borderWidth: 2.5, borderColor: '#000' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  postAuthor: { fontWeight: '900', color: '#1E293B', fontSize: 16 },
  postTime: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  contentArea: { paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9' },
  postText: { fontSize: 15, color: '#334155', lineHeight: 22, fontWeight: '500' },
  cardFooter: { paddingTop: 12 },
  commentBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: '#000', alignSelf: 'flex-start' },
  commentIcon: { width: 16, height: 16, tintColor: '#000', marginRight: 8 },
  commentLabel: { color: '#000', fontWeight: '900', fontSize: 11 },
  historyCommentBubble: { marginBottom: 8, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 15, borderWidth: 1.5, borderColor: '#000' },
  commentUser: { fontWeight: '900', fontSize: 12, color: '#1E293B' },
  commentBodySmall: { fontSize: 12, color: '#475569', fontWeight: '500' },
  youBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 8, borderWidth: 1, borderColor: '#000' },
  youBadgeText: { fontSize: 9, fontWeight: '900', color: '#000' },
});

export default HistoryScreen;