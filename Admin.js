// Admin.js

import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'
import { supabase } from './supabase'

// A read-only version of your checkbox node
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
        useBuiltInState={false}         // disable internal toggling
        disableBuiltInState              // alias prop name
        // disableText                      // optional: if you want only the box clickable
        text={node.label}
        iconStyle={styles.icon}
        textStyle={styles.label}
        onPress={() => { /* no-op */ }}
      />
      {children}
    </View>
  )
}

export default function Admin() {
  const [allSettings, setAllSettings] = useState([])

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('user_id, settings')
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setAllSettings(data)
      })
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {allSettings.map(({ user_id, settings }) => (
        <View key={user_id} style={styles.userBlock}>
          <Text style={styles.userTitle}>{user_id}</Text>
          {Object.entries(settings).map(([key, node]) => (
            <ReadonlyNode key={key} node={node} />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FFF' },
  userBlock: { marginBottom: 32 },
  userTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  label: { fontSize: 16 },
  icon: { borderRadius: 4, borderWidth: 1 }
})
