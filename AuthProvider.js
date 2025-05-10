// AuthProvider.js
import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase, auth } from './supabase'

const AuthContext = createContext({ user: null })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // check initial session
    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // listen for changes
    const { data: listener } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = () => auth.signOut()

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
