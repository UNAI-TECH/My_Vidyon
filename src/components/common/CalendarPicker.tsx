import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  getYear,
  setYear,
  setMonth,
  getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react-native';
import { theme } from '../../theme';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: string;
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CalendarModal: React.FC<CalendarModalProps> = ({ 
  visible, 
  onClose, 
  onSelect, 
  initialDate,
  title = "Select Date"
}) => {
  const [currentMonth, setCurrentMonth] = useState(initialDate ? new Date(initialDate) : new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate ? new Date(initialDate) : new Date());
  const [view, setView] = useState<'calendar' | 'year' | 'month'>('calendar');

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    const startYear = currentYear - 60;
    const endYear = currentYear + 10;
    const res = [];
    for (let i = endYear; i >= startYear; i--) {
      res.push(i);
    }
    return res;
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleDayPress = (day: Date) => {
    setSelectedDate(day);
    onSelect(format(day, 'yyyy-MM-dd'));
    onClose();
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setView('calendar');
  };

  const handleMonthSelect = (monthIdx: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIdx));
    setView('calendar');
  };

  const renderCalendar = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <ChevronLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <TouchableOpacity onPress={() => setView('month')}>
            <Text style={styles.monthText}>{format(currentMonth, 'MMMM')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('year')}>
            <Text style={styles.yearText}>{format(currentMonth, 'yyyy')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <ChevronRight size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={styles.weekDayText}>{d}</Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <TouchableOpacity 
              key={idx} 
              style={[
                styles.dayCell, 
                isSelected && styles.selectedDayCell,
                isToday && !isSelected && styles.todayCell
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text style={[
                styles.dayText,
                !isCurrentMonth && styles.otherMonthDayText,
                isSelected && styles.selectedDayText,
                isToday && !isSelected && styles.todayText
              ]}>
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderYearPicker = () => (
    <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pickerGrid}>
      {years.map(year => (
        <TouchableOpacity 
          key={year} 
          style={[styles.pickerItem, getYear(currentMonth) === year && styles.pickerItemActive]}
          onPress={() => handleYearSelect(year)}
        >
          <Text style={[styles.pickerItemText, getYear(currentMonth) === year && styles.pickerItemTextActive]}>
            {year}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMonthPicker = () => (
    <View style={styles.pickerGrid}>
      {months.map((month, idx) => (
        <TouchableOpacity 
          key={month} 
          style={[styles.pickerItem, getMonth(currentMonth) === idx && styles.pickerItemActive]}
          onPress={() => handleMonthSelect(idx)}
        >
          <Text style={[styles.pickerItemText, getMonth(currentMonth) === idx && styles.pickerItemTextActive]}>
            {month}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.topBar}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {view === 'calendar' && renderCalendar()}
          {view === 'year' && renderYearPicker()}
          {view === 'month' && renderMonthPicker()}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.todayBtn} onPress={() => handleDayPress(new Date())}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    flexBasis: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2
  },
  selectedDayCell: {
    backgroundColor: theme.colors.primary
  },
  todayCell: {
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500'
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold'
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: 'bold'
  },
  otherMonthDayText: {
    color: '#CBD5E1'
  },
  pickerScroll: {
    maxHeight: 300
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10
  },
  pickerItem: {
    flexBasis: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC'
  },
  pickerItemActive: {
    backgroundColor: theme.colors.primary
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  pickerItemTextActive: {
    color: 'white'
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    alignItems: 'center'
  },
  todayBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9'
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary
  }
});
