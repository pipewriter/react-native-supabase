import React, { useState, useEffect } from 'react'
import CheckboxNode from './CheckboxNode'
import {
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  Button,
  TouchableOpacity,
  View
} from 'react-native'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'
import Admin from './Admin'
import { Picker } from '@react-native-picker/picker'

// your JSON source
const data = {
  settings: {
    notifications: { email: true, sms: false, push: { android: false, ios: true } },
    privacy: { location: false, camera: true, microphone: false },
    security: { twoFactorAuth: false, backupCodes: true }
  },
  preferences: {
    theme: { darkMode: false, highContrast: false },
    language: { english: true, spanish: false, nested: { regionalDialects: { catalan: true, quechua: false } } }
  },
  integrations: {
    slack: false,
    github: { issues: true, pullRequests: false },
    jira: { basic: false, advanced: { workflows: true, automations: false } }
  }
}

// buildTree turns your raw JSON into { label, checked, children? } nodes
function buildTree(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => {
      if (typeof val === 'boolean') {
        return [key, { label: key, checked: val }]
      } else {
        return [key, { label: key, checked: false, children: buildTree(val) }]
      }
    })
  )
}

// fixed time slots
const AVAILABLE_TIMES = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM'
]

export default function MainScreen() {
  const [userId, setUserId] = useState(null)
  const [settings, setSettings] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDateBooking, setSelectedDateBooking] = useState('')
  const [selectedTimeBooking, setSelectedTimeBooking] = useState(null)
  const [bookedTimes, setBookedTimes] = useState([])
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([])
  const [selectedValue, setSelectedValue] = useState('Consultation')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // email validation and submission enable flag
  const isValidEmail = (mail) => /\S+@\S+\.\S+/.test(mail)
  const canSubmitBooking = Boolean(selectedTimeBooking && isValidEmail(email))

  // default tree for user settings
  const defaultTree = buildTree(data)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) return
      setUserId(user.id)
      await fetchSettings(user.id)
      await fetchNotes(user.id)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) fetchSettings(session.user.id)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  // fetch user settings
  async function fetchSettings(uid) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings, is_admin')
      .eq('user_id', uid)
      .single()
    if (error) {
      await supabase
        .from('user_settings')
        .insert({ user_id: uid, settings: defaultTree, is_admin: false })
      setSettings(defaultTree)
      setIsAdmin(false)
    } else {
      setSettings(data.settings)
      setIsAdmin(data.is_admin)
    }
  }

  // fetch notes for display
  async function fetchNotes(uid) {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', uid)
    if (!error) setNotes(data)
  }

  if (isAdmin) {
    return <Admin />
  }

  // helper to set all descendants
  function setAllChildren(children, checked) {
    return Object.fromEntries(
      Object.entries(children).map(([k, node]) => {
        const updated = { ...node, checked }
        if (node.children) {
          updated.children = setAllChildren(node.children, checked)
        }
        return [k, updated]
      })
    )
  }

  // update settings tree with cascade
  function updateSettingsTree(tree, path, isChecked) {
    const segments = path.split('.')
    function walk(subtree, depth) {
      return Object.fromEntries(
        Object.entries(subtree).map(([key, node]) => {
          let updated = { ...node }
          if (key === segments[depth]) {
            if (depth === segments.length - 1) {
              updated.checked = isChecked
              if (updated.children) updated.children = setAllChildren(updated.children, isChecked)
            } else if (updated.children) {
              updated.children = walk(updated.children, depth + 1)
              updated.checked = Object.values(updated.children).every(c => c.checked)
            }
          }
          return [key, updated]
        })
      )
    }
    return walk(tree, 0)
  }

  // toggle a node in the user settings
  async function toggleNode(path, isChecked) {
    if (!userId) return
    const updated = updateSettingsTree(settings, path, isChecked)
    setSettings(updated)
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, settings: updated }, { onConflict: 'user_id' })
  }

  // fetch existing bookings for a given date
  async function fetchBookings(date) {
    const start = `${date}T00:00:00`
    const endDay = new Date(date)
    endDay.setDate(endDay.getDate() + 1)
    const end = endDay.toISOString().split('T')[0] + 'T00:00:00'
    const { data, error } = await supabase
      .from('bookings')
      .select('booking')
      .gte('booking', start)
      .lt('booking', end)
    if (!error) {
      const times = data.map(({ booking }) => {
        const dt = new Date(booking)
        return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      })
      setBookedTimes(times)
    }
  }

  // when user picks a day for booking: load bookedTimes
  function onDayPressBooking(day) {
    const date = day.dateString
    setSelectedDateBooking(date)
    setSelectedTimeBooking(null)
    fetchBookings(date)
  }

  // user note date picker
  function onDayPress(day) {
    setSelectedDate(day.dateString)
  }

  // input handlers
  function onChangeText(text) {
    setNote(text)
  }

  async function onSubmitNote() {
    await supabase
      .from('notes')
      .insert({ user_id: userId, content: `${selectedDate} ${note}` })
    await fetchNotes(userId)
  }

  // submit booking: insert and refresh
  async function onSubmitBooking() {
    if (!canSubmitBooking) return
    const bookingDateTime = `${selectedDateBooking} ${selectedTimeBooking}`
    const { error } = await supabase
      .from('bookings')
      .insert({ booking: bookingDateTime, user_id: userId, name, email, service: selectedValue })
    if (!error) {
      await fetchBookings(selectedDateBooking)
      setSelectedTimeBooking(null)
    }
  }

  // marks for booking calendar: next 30 days
  const today = new Date().toISOString().split('T')[0]
  const markedDatesBooking = () => {
    const marks = {}
    let cursor = new Date()
    for (let i = 0; i < 30; i++) {
      const ds = cursor.toISOString().split('T')[0]
      marks[ds] = { marked: true, dotColor: 'green' }
      cursor.setDate(cursor.getDate() + 1)
    }
    if (selectedDateBooking) {
      marks[selectedDateBooking] = { ...marks[selectedDateBooking], selected: true, selectedColor: '#00adf5' }
    }
    return marks
  }

  // filter out booked times
  const availableTimes = AVAILABLE_TIMES.filter(time => !bookedTimes.includes(time))

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Your Setting Tree</Text>
      {Object.entries(settings).map(([key, node]) => (
        <CheckboxNode key={key} nodeKey={key} node={node} onToggle={toggleNode} />
      ))}

      {/* Notes Section */}
      <Text style={styles.h1}>Write Note</Text>
      <Calendar onDayPress={onDayPress} markedDates={{ [selectedDate]: { selected: true } }} style={styles.calendar} />
      {selectedDate !== '' && <Text style={styles.selected}>Picked date: {selectedDate}</Text>}
      <TextInput onChangeText={onChangeText} placeholder="enter note for day here" />
      <Button onPress={onSubmitNote} title="Submit Note" color="#841584" />
      {notes.map(n => <Text key={n.content}>{n.content}</Text>)}

      {/* Booking Section */}
      <Text style={styles.h1}>Make Booking</Text>
      <Calendar minDate={today} onDayPress={onDayPressBooking} markedDates={markedDatesBooking()} style={styles.calendar} />

      {selectedDateBooking !== '' && (
        <>
          <Text style={styles.heading}>Available times on {selectedDateBooking}:</Text>
          <ScrollView style={{ marginTop: 8 }}>
            {availableTimes.map(time => (
              <TouchableOpacity key={time} style={styles.radioRow} onPress={() => setSelectedTimeBooking(time)}>
                <View style={[styles.radioOuter, selectedTimeBooking === time && styles.radioInner]} />
                <Text style={styles.radioLabel}>{time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {selectedTimeBooking && <Text style={styles.confirm}>You picked {selectedTimeBooking} on {selectedDateBooking}</Text>}

      <TextInput onChangeText={setName} placeholder="enter name" />
      <TextInput onChangeText={setEmail} placeholder="enter email" />

      <Text>Service: {selectedValue}</Text>
      <Picker selectedValue={selectedValue} onValueChange={(itemValue) => setSelectedValue(itemValue)} style={{ width: 200 }}>
        <Picker.Item label="Consultation" value="Consultation" />
        <Picker.Item label="Checkup" value="Checkup" />
        <Picker.Item label="Procedure" value="Procedure" />
      </Picker>

      <Button onPress={onSubmitBooking} title="Submit Booking" color="#841584" disabled={!canSubmitBooking} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 50 },
  header: { fontSize: 22, marginBottom: 24, textAlign: 'center' },
  calendar: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 24 },
  selected: { marginTop: 12, fontSize: 16, textAlign: 'center' },
  h1: { fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  heading: { marginTop: 16, fontWeight: 'bold', fontSize: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#444', marginRight: 8 },
  radioInner: { backgroundColor: '#444' },
  radioLabel: { fontSize: 16 },
  confirm: { marginTop: 20, fontStyle: 'italic' }
})
