// App.js
import React from 'react'
import { View, Button } from 'react-native'
import { AuthProvider, useAuth } from './AuthProvider'
import AuthScreen from './AuthScreen'
import MainScreen from './MainScreen'   // rename your existing ScrollView UI to MainScreen

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}

function Root() {
  const { user, signOut } = useAuth()

  if (!user) {
    return <AuthScreen />
  }

  return (
    <View style={{ flex:1 }}>
      <MainScreen />
      <Button title="Sign Out" onPress={signOut} />
    </View>
  )
}
