// CheckboxNode.js
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import BouncyCheckbox from 'react-native-bouncy-checkbox'

export default function CheckboxNode({ nodeKey, node, onToggle, level = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children && Object.keys(node.children).length > 0

  return (
    <View style={{ marginLeft: level * 20, marginVertical: 4 }}>
      <View style={styles.row}>
        {hasChildren && (
          <TouchableOpacity
            onPress={() => setExpanded(e => !e)}
            style={styles.expandToggle}
          >
            <Text style={styles.toggleIcon}>
              {expanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
        )}
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
      </View>

      {hasChildren && expanded && (
        Object.entries(node.children).map(([key, child]) => (
          <CheckboxNode
            key={key}
            nodeKey={`${nodeKey}.${key}`}
            node={child}
            onToggle={onToggle}
            level={level + 1}
          />
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  expandToggle: { paddingHorizontal: 4 },
  toggleIcon: { fontSize: 14, width: 14, textAlign: 'center' },
  label: { fontSize: 16 },
  icon: { borderRadius: 4, borderWidth: 1 },
})
