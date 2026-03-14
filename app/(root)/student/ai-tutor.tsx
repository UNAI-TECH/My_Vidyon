import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  Bot, 
  Send, 
  Sparkles,
  Zap
} from 'lucide-react-native';

export default function AITutor() {
  const [query, setQuery] = useState('');
  
  return (
    <View style={styles.container}>
      <PageHeader title="AI Study Tutor" subtitle="Personalized doubt solving & study planning" />

      <ScrollView contentContainerStyle={styles.chatArea}>
        <View style={styles.aiMessage}>
          <Bot size={20} color={theme.colors.primary} {...({} as any)} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Hello! I'm your Vidyon AI Tutor. How can I help you with your studies today?</Text>
          </View>
        </View>

        <View style={styles.suggestionGrid}>
          <TouchableOpacity style={styles.suggestionCard}>
            <Zap size={16} color="#F59E0B" {...({} as any)} />
            <Text style={styles.suggestionTitle}>Explain Physics Ch.4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.suggestionCard}>
            <Sparkles size={16} color="#A855F7" {...({} as any)} />
            <Text style={styles.suggestionTitle}>Create Study Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Ask anything about your syllabus..." 
            value={query}
            onChangeText={setQuery}
          />
          <TouchableOpacity style={styles.sendBtn}>
            <Send size={20} color="white" {...({} as any)} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  chatArea: { padding: 24, gap: 24 },
  aiMessage: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bubble: { backgroundColor: 'white', borderRadius: 20, borderTopLeftRadius: 4, padding: 16, flex: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  bubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  suggestionGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  suggestionCard: { backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', flex: 1, alignItems: 'center', gap: 6 },
  suggestionTitle: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted },
  inputWrapper: { padding: 24, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 8, gap: 12 },
  input: { flex: 1, fontSize: 14, paddingLeft: 12 },
  sendBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }
});
