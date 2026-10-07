import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { theme } from '../../theme';
import { useParentStudents, LinkedStudent } from '../../hooks/useParentStudents';
import { ChevronDown, Check, User } from 'lucide-react-native';

export function ChildSwitcher() {
  const { children, selectedChild, setSelectedChildId } = useParentStudents();
  const [modalVisible, setModalVisible] = useState(false);

  if (children.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => children.length > 1 && setModalVisible(true)}
        activeOpacity={children.length > 1 ? 0.7 : 1}
      >
        <View style={styles.avatar}>
          {selectedChild?.student.image_url ? (
            <Image
              source={{ uri: selectedChild.student.image_url }}
              style={styles.avatarImg}
            />
          ) : (
            <User size={16} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.studentName} numberOfLines={1}>
            {selectedChild?.student.name || 'Select Child'}
          </Text>
          <Text style={styles.studentClass} numberOfLines={1}>
            {selectedChild?.student.class_name
              ? `Class: ${selectedChild.student.class_name}${
                  selectedChild.student.section ? ` (${selectedChild.student.section})` : ''
                }`
              : 'Student'}
          </Text>
        </View>
        {children.length > 1 && (
          <ChevronDown size={16} color={theme.colors.textMuted} style={styles.chevron} />
        )}
      </TouchableOpacity>

      {/* Child Switcher Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Child / Ward</Text>
            <FlatList
              data={children}
              keyExtractor={(item) => item.student_id}
              renderItem={({ item }) => {
                const isSelected = item.student_id === selectedChild?.student_id;
                return (
                  <TouchableOpacity
                    style={[styles.itemRow, isSelected && styles.itemRowActive]}
                    onPress={() => {
                      setSelectedChildId(item.student_id);
                      setModalVisible(false);
                    }}
                  >
                    <View style={styles.itemAvatar}>
                      {item.student.image_url ? (
                        <Image
                          source={{ uri: item.student.image_url }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <User size={18} color={theme.colors.primary} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.student.name}</Text>
                      <Text style={styles.itemSub}>
                        {item.student.class_name || 'Class N/A'}
                        {item.student.section ? ` - ${item.student.section}` : ''} •{' '}
                        {item.relationship_type || 'Ward'}
                      </Text>
                    </View>
                    {isSelected && (
                      <Check size={18} color={theme.colors.primary} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.l,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  studentClass: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  chevron: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.borderRadius.m,
    marginBottom: 6,
  },
  itemRowActive: {
    backgroundColor: theme.colors.primary + '15',
  },
  itemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 8,
  },
});
