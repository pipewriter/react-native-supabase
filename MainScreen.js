import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'

// Recursive component to render nested checkboxes
function CheckboxNode({ nodeKey, node, onToggle, level = 0 }) {
  return (
    <View style={{ marginLeft: level * 20, marginVertical: 4 }}>
      <BouncyCheckbox
        size={20}
        fillColor="#4630EB"
        unfillColor="#FFFFFF"
        isChecked={node.checked}
        text={node.label}
        textStyle={styles.label}
        iconStyle={styles.icon}
        onPress={(isChecked) => onToggle(nodeKey, isChecked)}
      />
      {node.children &&
        Object.entries(node.children).map(([key, child]) => (
          <CheckboxNode
            key={key}
            nodeKey={`${nodeKey}.${key}`}
            node={child}
            onToggle={onToggle}
            level={level + 1}
          />
        ))}
    </View>
  )
}

export default function App() {
  const [userId, setUserId] = useState(null)
  const [settings, setSettings] = useState({})
  const [selectedDate, setSelectedDate] = useState('')

  // default tree structure
  const defaultTree = {
    checkbox1: {
      label: 'Option 1',
      checked: false,
      children: {
        sub1: { label: 'Sub 1', checked: false },
        sub2: { label: 'Sub 2', checked: false }
      }
    },
    checkbox2: { label: 'Option 2', checked: false }
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        console.warn('no user logged in')
        return
      }
      setUserId(user.id)
      await fetchSettings(user.id)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) fetchSettings(session.user.id)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchSettings(uid) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', uid)
      .single()

    if (error) {
      // initialize if missing
      const { error: insertErr } = await supabase
        .from('user_settings')
        .insert({ user_id: uid, settings: defaultTree })
      if (insertErr) console.error('init settings error', insertErr)
      else setSettings(defaultTree)
    } else {
      setSettings(data.settings)
    }
  }

  // deep-copy & update nested key
  function updateSettingsTree(tree, path, isChecked) {
    const keys = path.split('.')
    const newTree = { ...tree }
    let curr = newTree
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (i === keys.length - 1) {
        curr[key] = { ...curr[key], checked: isChecked }
      } else {
        curr[key] = {
          ...curr[key],
          children: { ...curr[key].children }
        }
        curr = curr[key].children
      }
    }
    return newTree
  }

  async function toggleNode(path, isChecked) {
    if (!userId) return
    const updated = updateSettingsTree(settings, path, isChecked)
    setSettings(updated)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, settings: updated }, { onConflict: 'user_id' })
    if (error) console.error('update settings error', error)
  }

  // optional: persist calendar date
  async function onDayPress(day) {
    const dateStr = day.dateString
    setSelectedDate(dateStr)
    if (!userId) return
    const treeWithDate = { ...settings, calendarDate: dateStr }
    setSettings(treeWithDate)
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, settings: treeWithDate },
        { onConflict: 'user_id' }
      )
    if (error) console.error('update date error', error)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Your Setting Tree</Text>

      {Object.entries(settings).map(([key, node]) =>
        node && node.label ? (
          <CheckboxNode
            key={key}
            nodeKey={key}
            node={node}
            onToggle={toggleNode}
          />
        ) : null
      )}

      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          [selectedDate]: { selected: true, disableTouchEvent: true }
        }}
        style={styles.calendar}
      />

      {selectedDate ? (
        <Text style={styles.selected}>Picked date: {selectedDate}</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 50
  },
  header: {
    fontSize: 22,
    marginBottom: 24,
    textAlign: 'center'
  },
  label: {
    fontSize: 16
  },
  icon: {
    borderRadius: 4,
    borderWidth: 1
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: 24
  },
  selected: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center'
  }
})
