import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { supabase } from './supabase'

// same read-only node as before, but no collapse logic here:
function ReadonlyNode({ node, level = 0 }) {
  const children = node.children
    ? Object.entries(node.children).map(([key, child]) => (
        <ReadonlyNode key={key} node={child} level={level + 1} />
      ))
    : null

  return (
    <View style={{ marginLeft: level * 20, marginVertical: 4, opacity: 0.8 }}>
      <BouncyCheckbox
        size={20}
        fillColor="#4630EB"
        unfillColor="#FFF"
        isChecked={node.checked}
        disableBuiltInState
        text={node.label}
        iconStyle={styles.icon}
        textStyle={styles.label}
        onPress={() => {}}
      />
      {children}
    </View>
  )
}

export default function Admin() {
  const [allSettings, setAllSettings] = useState([])
  const [expandedUsers, setExpandedUsers] = useState({})       // track which user blocks are open

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('user_id, settings')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setAllSettings(data)
      })
  }, [])

  const toggleUser = (user_id) => {
    setExpandedUsers(prev => ({
      ...prev,
      [user_id]: !prev[user_id]
    }))
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {allSettings.map(({ user_id, settings }) => {
        const isOpen = !!expandedUsers[user_id]
        return (
          <View key={user_id} style={styles.userBlock}>
            <TouchableOpacity onPress={() => toggleUser(user_id)}>
              <Text style={styles.userTitle}>
                {isOpen ? '▼' : '▶'}  {user_id}
              </Text>
            </TouchableOpacity>

            {isOpen && Object.entries(settings).map(([key, node]) => (
              <ReadonlyNode key={key} node={node} />
            ))}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { padding: 16, backgroundColor: '#FFF' },
  userBlock:    { marginBottom: 32 },
  userTitle:    { fontSize: 18, fontWeight: 'bold', marginVertical: 8 },
  label:        { fontSize: 16 },
  icon:         { borderRadius: 4, borderWidth: 1 },
})
