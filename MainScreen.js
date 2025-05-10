import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'
import Admin from './Admin'  // new Admin screen

// JSON source
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

function buildTree(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => {
      if (typeof val === 'boolean') return [key, { label: key, checked: val }]
      return [key, { label: key, checked: false, children: buildTree(val) }]
    })
  )
}

function CheckboxNode({ nodeKey, node, onToggle, level = 0 }) {
  const hasChildren = node.children && Object.keys(node.children).length > 0
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
        onPress={isChecked => onToggle(nodeKey, isChecked)}
      />
      {hasChildren &&
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
  const [isAdmin, setIsAdmin] = useState(false)  // admin flag
  const [selectedDate, setSelectedDate] = useState('')

  const defaultTree = buildTree(data)

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) return
      setUserId(user.id)
      await fetchSettings(user.id)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_e, session) => session?.user && fetchSettings(session.user.id)
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchSettings(uid) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings, is_admin')
      .eq('user_id', uid)
      .single()

    if (error) {
      // initialize row with defaultTree + non-admin
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

  // route admin users to Admin screen
  if (isAdmin) {
    return <Admin />
  }

  // non-admin: show settings tree
  function updateSettingsTree(tree, path, isChecked) {
    const keys = path.split('.')
    const newTree = { ...tree }
    let curr = newTree
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (i === keys.length - 1) curr[key] = { ...curr[key], checked: isChecked }
      else {
        curr[key] = { ...curr[key], children: { ...curr[key].children } }
        curr = curr[key].children
      }
    }
    return newTree
  }

  async function toggleNode(path, isChecked) {
    if (!userId) return
    const updated = updateSettingsTree(settings, path, isChecked)
    setSettings(updated)
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, settings: updated }, { onConflict: 'user_id' })
  }

  async function onDayPress(day) {
    const dateStr = day.dateString
    setSelectedDate(dateStr)
    if (!userId) return
    const treeWithDate = { ...settings, calendarDate: dateStr }
    setSettings(treeWithDate)
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, settings: treeWithDate }, { onConflict: 'user_id' })
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Your Setting Tree</Text>
      {Object.entries(settings).map(([key, node]) => (
        <CheckboxNode
          key={key}
          nodeKey={key}
          node={node}
          onToggle={toggleNode}
        />
      ))}
      <Calendar
        onDayPress={onDayPress}
        markedDates={{ [selectedDate]: { selected: true, disableTouchEvent: true } }}
        style={styles.calendar}
      />
      {selectedDate ? <Text style={styles.selected}>Picked date: {selectedDate}</Text> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 50 },
  header: { fontSize: 22, marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 16 },
  icon: { borderRadius: 4, borderWidth: 1 },
  calendar: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 24 },
  selected: { marginTop: 12, fontSize: 16, textAlign: 'center' }
})
