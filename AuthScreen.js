// AuthScreen.js
import React, { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native'
import { auth } from './supabase'

export default function AuthScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    const { error } = await auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Sign in error', error.message)
  }

  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await auth.signUp({ email, password })
    setLoading(false)
    if (error) Alert.alert('Sign up error', error.message)
    else Alert.alert('Check your email', 'A confirmation link has been sent.')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome—please log in</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={styles.buttons}>
        <Button title="Sign In"  onPress={handleSignIn}  disabled={loading} />
        <Button title="Sign Up"  onPress={handleSignUp}  disabled={loading} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:16 },
  header:    { fontSize:24, marginBottom:24, textAlign:'center' },
  input:     { borderWidth:1, borderColor:'#ccc', padding:8, marginBottom:16, borderRadius:4 },
  buttons:   { flexDirection:'row', justifyContent:'space-between' },
})
