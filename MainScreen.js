import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'

export default function App() {
  const [checked,  setChecked]  = useState(false)
  const [checked2, setChecked2] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  // fetch persisted states on mount
  useEffect(() => {
    fetchCheckboxes()
  }, [])

  async function fetchCheckboxes() {
    const { data, error } = await supabase
      .from('checkbox_states')
      .select('name, is_checked')

    if (error) {
      console.error('Fetch error:', error)
      return
    }

    const c1 = data.find(r => r.name === 'checkbox1')?.is_checked ?? false
    const c2 = data.find(r => r.name === 'checkbox2')?.is_checked ?? false
    setChecked(c1)
    setChecked2(c2)
  }

  // upsert a single checkbox state
  async function toggleCheckbox(name, isNowChecked) {
    const { error } = await supabase
      .from('checkbox_states')
      .upsert(
        { name, is_checked: isNowChecked },
        { onConflict: 'name' }
      )

    if (error) {
      console.error('Update error:', error)
      return
    }

    // update local UI immediately
    if (name === 'checkbox1') setChecked(isNowChecked)
    else if (name === 'checkbox2') setChecked2(isNowChecked)
  }

  // (optional) persist calendar selection too
  async function onDayPress(day) {
    const dateStr = day.dateString
    setSelectedDate(dateStr)

    await supabase
      .from('checkbox_states')
      .upsert(
        { name: 'calendarDate', is_checked: false }, 
        { onConflict: 'name' }
      )
    // you could instead use a separate table for dates
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        React Native + Supabase Stateful Checkboxes
      </Text>

      <View style={styles.row}>
        <BouncyCheckbox
          size={25}
          fillColor="#4630EB"
          unfillColor="#FFFFFF"
          isChecked={checked}
          text={checked ? 'Checked ✅' : 'Unchecked ⭕'}
          textStyle={styles.label}
          iconStyle={styles.icon}
          onPress={(isNowChecked) => {
            toggleCheckbox('checkbox1', isNowChecked)
          }}
        />

        <BouncyCheckbox
          size={25}
          fillColor="#4630EB"
          unfillColor="#FFFFFF"
          isChecked={checked2}
          text={checked2 ? 'Checked ✅' : 'Unchecked ⭕'}
          textStyle={styles.label}
          iconStyle={styles.icon}
          onPress={(isNowChecked) => {
            toggleCheckbox('checkbox2', isNowChecked)
          }}
        />
      </View>

      <Calendar
        onDayPress={day => onDayPress(day)}
        markedDates={{
          [selectedDate]: { selected: true, disableTouchEvent: true },
        }}
        style={styles.calendar}
      />

      {selectedDate !== '' && (
        <Text style={styles.selected}>
          You picked: {selectedDate}
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
  header: {
    fontSize: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  row: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
  },
  icon: {
    borderRadius: 4,
    borderWidth: 1,
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  selected: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
})
