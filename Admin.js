import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function Admin() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, Admin!</Text>
      <Text style={styles.subtitle}>Welcome to the admin dashboard.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666'
  }
})
