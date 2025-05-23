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
    notifications: { email: {}, sms: {}, push: { android: {}, ios: {} } },
    privacy: { location: {}, camera: {}, microphone: {} },
    security: { twoFactorAuth: {}, backupCodes: {} }
  },
  preferences: {
    theme: { darkMode: {}, highContrast: {} },
    language: { english: {}, spanish: {}, nested: { regionalDialects: { catalan: {}, quechua: {} } } }
  },
  integrations: {
    slack: {},
    github: { issues: {}, pullRequests: {} },
    jira: { basic: {}, advanced: { workflows: {}, automations: {} } }
  }
}
// const data = {
//   settings: {
//     notifications: { email: {}, sms: false, push: { android: false, ios: true } },
//     privacy: { location: false, camera: true, microphone: false },
//     security: { twoFactorAuth: false, backupCodes: true }
//   },
//   preferences: {
//     theme: { darkMode: false, highContrast: false },
//     language: { english: true, spanish: false, nested: { regionalDialects: { catalan: true, quechua: false } } }
//   },
//   integrations: {
//     slack: false,
//     github: { issues: true, pullRequests: false },
//     jira: { basic: false, advanced: { workflows: true, automations: false } }
//   }
// }

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
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([])
  const [selectedValue, setSelectedValue] = useState('Consultation')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  function removeFromDataGivenNodeKey(nodeKey){
    console.log('parent')
    console.log('remove ' + nodeKey)
    const segments = nodeKey.split('.')
    let node = data;
    while(segments.length > 1){
      console.log('loop')
      console.log(node)
      node = node[segments[0]]; 
      segments.shift()
    }
    console.log('there ' + segments[0])
    console.log(node)
    delete node[segments[0]]
    const defaultTree = buildTree(data)
    setSettings(defaultTree)
    console.log("new data2")
    console.log(data) 

  }
  function addToDataGivenNodeKey(nodeKey, value){
    console.log('parent')
    console.log('add ' + nodeKey)
    const segments = nodeKey.split('.')
    let node = data;
    while(segments.length > 1){
      console.log('loop')
      console.log(node)
      node = node[segments[0]]; 
      segments.shift()
    }
    console.log('there ' + segments[0])
    console.log(node)
    node[segments[0]] = {}
    // delete node[segments[0]]
    const defaultTree = buildTree(data)
    setSettings(defaultTree)
    console.log("new data2")
    console.log(data) 
  }
  // helper flag function
  const isValidEmail = mail => /\S+@\S+\.\S+/.test(mail)
  function canSubmitBooking() {
    return selectedTimeBooking !== null && isValidEmail(email)
  }

  // the default tree to insert on first-run
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
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) fetchSettings(session.user.id)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchSettings(uid) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings, is_admin')
      .eq('user_id', uid)
      .single()

    if (error) {
      await supabase.from('user_settings').insert({ user_id: uid, settings: defaultTree, is_admin: false })
      setSettings(defaultTree)
      setIsAdmin(false)
    } else {
      setSettings(data.settings)
      setIsAdmin(data.is_admin)
    }
  }

  async function fetchNotes(uid) {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', uid)
    if (!error) setNotes(data)
  }

  if (isAdmin) return <Admin />

  function setAllChildren(children, checked) {
    return Object.fromEntries(Object.entries(children).map(([k, node]) => {
      const updated = { ...node, checked }
      if (node.children) updated.children = setAllChildren(node.children, checked)
      return [k, updated]
    }))
  }

  function clearNodeFromSettings(node){
    // settings
    console.log(settings)
    console.log(node)
    // setSettings(updated)
  }

  function updateSettingsTree(tree, path, isChecked) {
    console.log(tree)
    console.log(path)
    const segments = path.split('.')
    const walk = (subtree, depth) => Object.fromEntries(
      Object.entries(subtree).map(([key, node]) => {
        console.log(subtree)
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
    return walk(tree, 0)
  }

  async function toggleNode(path, isChecked) {
    if (!userId) return
    console.log("here where I should be")
    const updated = updateSettingsTree(settings, path, isChecked)
    console.log(updated)
    setSettings(updated)
    await supabase.from('user_settings').upsert({ user_id: userId, settings: updated }, { onConflict: 'user_id' })
  }

  function onDayPressBooking(day) {
    setSelectedDateBooking(day.dateString)
    setSelectedTimeBooking(null)
  }

  function onDayPress(day) {
    setSelectedDate(day.dateString)
  }

  async function onSubmitNote() {
    if (!selectedDate) return
    await supabase.from('notes').insert({ user_id: userId, content: `${selectedDate} ${note}` })
    await fetchNotes(userId)
  }
  function toPacificISOString(dateStr, timeStr) {

    // 1. Combine date and time into a parseable string for a specific timezone
  //    We'll initially assume the input date/time is for 'America/Los_Angeles'
  //    and then convert it to UTC.

  //    Handle AM/PM for timeStr
  let [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) { // Midnight case
    hours = 0;
  }

  // Construct a string that JavaScript's Date object can parse,
  // ideally specifying the timezone if known, or handle it during formatting.
  // For this example, let's create a date object assuming the input is in 'America/Los_Angeles'
  // NOTE: Directly parsing timezone-naive strings like "YYYY-MM-DD HH:MM:SS"
  // can be tricky as the browser/environment might assume local or UTC.
  // It's often better to use a library for robust timezone handling (like date-fns-tz or Luxon).
  // However, for a more direct approach with Intl.DateTimeFormat:

  const initialDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

  // 2. Format this date into a string that represents it in Pacific Time.
  //    Then, we want the UTC equivalent of that Pacific Time.

  //    To ensure we interpret the combined string as Pacific Time,
  //    and then get its UTC equivalent:
  const pacificDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Use 24-hour format for easier parsing next
  }).format(initialDate);

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(5, 7), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(8, 10), 10);

  // The most reliable way is often to use a library, but with vanilla JS:
  const inputDateTimeStr = `${dateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Create a formatter for Pacific Time
  const pacificFormatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23' // Ensures 24-hour format
  });

  // Let's assemble the date components for 'America/Los_Angeles'
  const tempDateForPT = new Date(Date.UTC(year, month, day, hours, minutes, 0));


  // Let's make an object that represents the local time in PT
  const ptTime = {
    year: year,
    month: month + 1, // Back to 1-indexed for display or further processing
    day: day,
    hour: hours,
    minute: minutes,
    timeZone: 'America/Los_Angeles'
  };
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false // Use 24 hour format
  });

  const initialNaiveDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);



  const pdtYear = parseInt(dateStr.substring(0, 4));
  const pdtMonth = parseInt(dateStr.substring(5, 7)) -1; // JS months are 0-indexed
  const pdtDay = parseInt(dateStr.substring(8, 10));

  let pdtHours = parseInt(timeStr.substring(0, 2));
  const pdtMinutes = parseInt(timeStr.substring(3, 5));
  const ampm = timeStr.substring(6, 8);

  if (ampm === 'PM' && pdtHours !== 12) {
    pdtHours += 12;
  } else if (ampm === 'AM' && pdtHours === 12) { // 12 AM is 00 hours
    pdtHours = 0;
  }

  // To find the offset:
  const tempDate = new Date(Date.UTC(pdtYear, pdtMonth, pdtDay, pdtHours, pdtMinutes));
  const formatterForOffset = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    timeZoneName: 'shortOffset' // e.g., GMT-7
  });

  const parts = formatterForOffset.formatToParts(tempDate);
  let offsetString = "GMT+0"; // Default
  for(const part of parts) {
    if (part.type === 'timeZoneName') {
      offsetString = part.value; // e.g., "GMT-7"
      break;
    }
  }

  const offsetMatch = offsetString.match(/GMT([+-])(\d+)(?::(\d+))?/);
  let offsetHours = 0;
  let offsetMinutes = 0;
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    offsetHours = sign * parseInt(offsetMatch[2]);
    if (offsetMatch[3]) {
      offsetMinutes = sign * parseInt(offsetMatch[3]);
    }
  }
  const offsetTotalMinutes = offsetHours * 60 + offsetMinutes;


  // Now, create a Date object assuming the input numbers were for PT.
  // We want to get the UTC equivalent.
  // If it's 3 PM in PT, and PT is UTC-7, then it's 10 PM UTC.
  // So, we take the PT hours and *subtract* the offset (which is negative for PT).
  // UTC_hour = PT_hour - offset_hours
  // E.g., 15:00 PT (UTC-7) => 15 - (-7) = 22:00 UTC.

  const utcDate = new Date(Date.UTC(pdtYear, pdtMonth, pdtDay, pdtHours - offsetHours, pdtMinutes - offsetMinutes));

  return utcDate.toISOString();
}
  async function onSubmitBooking() {
    console.log('here1')
    if (!canSubmitBooking()) return
    console.log('here22')
    console.log(selectedDateBooking)
    console.log(selectedTimeBooking)
    console.log(toPacificISOString(selectedDateBooking,selectedTimeBooking))
    // console.log(new Date(`${selectedDateBooking}T${selectedTimeBooking}`).toISOString())
    // const timestamp = new Date(`${selectedDateBooking}T${selectedTimeBooking}`).toISOString()
    const timestamp = toPacificISOString(selectedDateBooking,selectedTimeBooking)
    // const timestamp = "2025-05-18T14:30:00.000Z"  
    console.log('here3')
    const { error } = await supabase.from('booking').insert({
      booking: timestamp,
      user_id: userId,    
      name,
      email,
      service: selectedValue
    })
    if (error) console.error('Booking insert error:', error)
    else console.log('Booking successful')
  }

  const today = new Date().toISOString().split('T')[0]
  const markedDatesBooking = () => {
    const marks = {}
    let cursor = new Date()
    for (let i = 0; i < 30; i++) {
      const ds = cursor.toISOString().split('T')[0]
      marks[ds] = { marked: true, dotColor: 'green' }
      cursor.setDate(cursor.getDate() + 1)
    }
    if (selectedDateBooking) marks[selectedDateBooking] = { ...marks[selectedDateBooking], selected: true, selectedColor: '#00adf5' }
    return marks
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Your Setting Tree</Text>
      {Object.entries(settings).map(([key, node]) => (  
          <>

        <CheckboxNode addFunc={addToDataGivenNodeKey} removeFunc={removeFromDataGivenNodeKey} key={key} nodeKey={key} node={node} onToggle={toggleNode} />
            {/* <Button onPress={()=>{removeFromDataGivenNodeKey( key);console.log(node);node.children = []}} title="remove" />
            <TextInput onChangeText={setName} placeholder="enter name" />
            <Button onPress={()=>{addToDataGivenNodeKey(key+ "." + name);console.log(node);node.children = []}} title="add" /> */}
        </>
      ))}

      <Text style={styles.h1}>{'\n'}Write Note</Text>
      <Calendar onDayPress={onDayPress} markedDates={{ [selectedDate]: { selected: true, disableTouchEvent: true } }} style={styles.calendar} />
      {selectedDate ? <Text style={styles.selected}>Picked date: {selectedDate}</Text> : null}
      <TextInput onChangeText={setNote} placeholder="enter note for day here" />
      <Button onPress={onSubmitNote} title="Submit Note" color="#841584" />
      {notes.map(n => <Text key={n.content}>{n.content}</Text>)}

      <Text style={styles.h1}>{'\n'}Make Booking</Text>
      <Calendar minDate={today} onDayPress={onDayPressBooking} markedDates={markedDatesBooking()} style={styles.calendar} />

      {selectedDateBooking ? (
        <>
          <Text style={styles.heading}>Available times on {selectedDateBooking}:</Text>
          <ScrollView style={{ marginTop: 8 }}>
            {AVAILABLE_TIMES.map(time => (
              <TouchableOpacity key={time} style={styles.radioRow} onPress={() => setSelectedTimeBooking(time)}>
                <View style={[styles.radioOuter, selectedTimeBooking === time && styles.radioInner]} />
                <Text style={styles.radioLabel}>{time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      ) : null}

      {selectedTimeBooking ? <Text style={styles.confirm}>You picked {selectedTimeBooking} on {selectedDateBooking}</Text> : null}

      <TextInput onChangeText={setName} placeholder="enter name" />
      <TextInput onChangeText={setEmail} placeholder="enter email" />

      <Text>Selected Service: {selectedValue}</Text>
      <Picker selectedValue={selectedValue} onValueChange={val => setSelectedValue(val)} style={{ width: 200 }}>
        <Picker.Item label="Consultation" value="Consultation" />
        <Picker.Item label="Checkup" value="Checkup" />
        <Picker.Item label="Procedure" value="Procedure" />
      </Picker>

      <Button onPress={onSubmitBooking} title="Submit Booking" color="#841584" disabled={!canSubmitBooking()} />
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
