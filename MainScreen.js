// MainScreen.js

import React, { useState, useEffect } from 'react'
import CheckboxNode from './CheckboxNode'
import { ScrollView, Text, StyleSheet } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { supabase } from './supabase'
import Admin from './Admin'

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

export default function MainScreen() {
  const [userId, setUserId] = useState(null)
  const [settings, setSettings] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  // the default tree to insert on first-run
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
      (_event, session) => {
        if (session?.user) fetchSettings(session.user.id)
      }
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
      // first time: insert default + non-admin
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

  // if admin, route to Admin screen
  if (isAdmin) {
    return <Admin />
  }

  // helper to set a node + all descendants
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

  // the main walker: flips the target and then re-computes ancestors
  function updateSettingsTree(tree, path, isChecked) {
    const segments = path.split('.')
    function walk(subtree, depth) {
      return Object.fromEntries(
        Object.entries(subtree).map(([key, node]) => {
          let updated = { ...node }

          if (key === segments[depth]) {
            if (depth === segments.length - 1) {
              // target node: flip + all its children
              updated.checked = isChecked
              if (updated.children) {
                updated.children = setAllChildren(updated.children, isChecked)
              }
            } else if (updated.children) {
              // ancestor of target: recurse deeper
              updated.children = walk(updated.children, depth + 1)
              // then set this node checked only if all children are checked
              updated.checked = Object.values(updated.children).every(c => c.checked)
            }
          }

          return [key, updated]
        })
      )
    }

    return walk(tree, 0)
  }

  // invoked by each CheckboxNode
  async function toggleNode(path, isChecked) {
    if (!userId) return
    const updated = updateSettingsTree(settings, path, isChecked)
    setSettings(updated)
    await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, settings: updated },
        { onConflict: 'user_id' }
      )
  }

  // calendar day tap
  async function onDayPress(day) {
    const date = day.dateString
    setSelectedDate(date)
    if (!userId) return
    const withDate = { ...settings, calendarDate: date }
    setSettings(withDate)
    await supabase
      .from('user_settings')
      .upsert(
        { user_id: userId, settings: withDate },
        { onConflict: 'user_id' }
      )
  }

  // --- render for non-admin users ---
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
        markedDates={{
          [selectedDate]: { selected: true, disableTouchEvent: true }
        }}
        style={styles.calendar}
      />

      {selectedDate !== '' && (
        <Text style={styles.selected}>Picked date: {selectedDate}</Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 50 },
  header:    { fontSize: 22, marginBottom: 24, textAlign: 'center' },
  calendar:  { borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 24 },
  selected:  { marginTop: 12, fontSize: 16, textAlign: 'center' }
})
