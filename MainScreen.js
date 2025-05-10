import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'

export default function App() {
  const [checked,  setChecked]  = useState(false)
  const [checked2, setChecked2] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [notes,     setNotes]     = useState([])

  // on mount, fetch existing notes
  useEffect(() => {
    fetchNotes()
  }, [])

  // fetch all notes from Supabase
  async function fetchNotes() {
    let { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('id', { ascending: true })

    if (error) console.error('Fetch error:', error)
    else       setNotes(data)
  }

  // insert a new note (called on checkbox press)
  async function addNote(content) {
    const { error } = await supabase
      .from('notes')
      .insert([{ content }])

    if (error) console.error('Insert error:', error)
    else        fetchNotes()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        Hello, React Native + Supabase!
      </Text>

      {/* ——— Bouncy Checkboxes ——— */}
      <View style={styles.row}>
        <BouncyCheckbox
          size={25}
          fillColor="#4630EB"
          unfillColor="#FFFFFF"
          isChecked={checked}
          text={checked ? 'Checked ✅' : 'Unchecked ⭕'}
          textStyle={styles.label}
          iconStyle={styles.icon}
          onPress={(isChecked) => {
            setChecked(isChecked)
            addNote(`Checkbox 1 is now ${isChecked}`)
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
          onPress={(isChecked2) => {
            setChecked2(isChecked2)
            addNote(`Checkbox 2 is now ${isChecked2}`)
          }}
        />
      </View>

      {/* ——— Calendar ——— */}
      <Calendar
        onDayPress={day => {
          setSelectedDate(day.dateString)
          addNote(`Picked date: ${day.dateString}`)
        }}
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

      {/* ——— Display all notes pulled from Supabase ——— */}
      <Text style={[styles.header, { marginTop: 32 }]}>
        Notes in Supabase:
      </Text>
      {notes.map(note => (
        <Text key={note.id} style={styles.note}>
          • {note.content}
        </Text>
      ))}
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
  note: {
    fontSize: 16,
    marginVertical: 4,
  },
})
