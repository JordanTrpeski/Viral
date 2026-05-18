import React from 'react'
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, fontSize, spacing, radius } from '@core/theme'

export default function BarcodeScanner() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Barcode Scanner</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Ionicons name="barcode-outline" size={80} color={colors.border} />
          <View style={styles.scanFrame} />
        </View>

        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.body}>
          Barcode scanning will be added in a future update. You can search for food by name in the meantime.
        </Text>

        <Pressable style={styles.searchBtn} onPress={() => router.back()}>
          <Ionicons name="search-outline" size={18} color={colors.bg} />
          <Text style={styles.searchBtnText}>Search by name instead</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitle: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.sectionHeader, color: colors.text,
  },

  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  placeholder: {
    width: 240, height: 240,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  scanFrame: {
    position: 'absolute',
    width: 160, height: 160,
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  title: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.screenTitle, color: colors.text,
    marginBottom: spacing.sm, textAlign: 'center',
  },
  body: {
    fontFamily: `${fonts.ui}_400Regular`, fontSize: fontSize.body, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22,
    marginBottom: spacing.xl,
  },
  searchBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  searchBtnText: {
    fontFamily: `${fonts.ui}_700Bold`, fontSize: fontSize.body, color: colors.bg,
  },
})
