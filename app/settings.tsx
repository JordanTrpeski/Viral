import { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Share,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import GorhomBottomSheet from '@gorhom/bottom-sheet'
import Constants from 'expo-constants'
import { MMKV } from 'react-native-mmkv'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { Button, BottomSheet } from '@core/components'
import { useUserStore } from '@core/store/userStore'
import { db } from '@core/db/database'
import { kgToLbs, lbsToKg, cmToFtIn, ftInToCm, formatHeight, formatWeight } from '@core/utils/units'
import type { OnboardingGoal } from '@core/store/onboardingStore'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const mmkv = new MMKV({ id: 'user-store' })
const notifStorage = new MMKV({ id: 'notifications' })

// ─── Goal config ────────────────────────────────────────────────────────────

const GOALS: { id: OnboardingGoal; label: string; icon: IoniconsName; color: string }[] = [
  { id: 'lose_weight',    label: 'Lose Weight',   icon: 'flame',         color: colors.danger },
  { id: 'maintain',       label: 'Maintain',       icon: 'scale-outline', color: colors.warning },
  { id: 'build_muscle',   label: 'Build Muscle',   icon: 'barbell',       color: colors.workout },
  { id: 'general_health', label: 'General Health', icon: 'heart',         color: colors.success },
]

const WATER_INTERVALS = [1, 2, 3, 4, 6, 8, 12]

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: fontSize.label,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.lg,
      }}
    >
      {title}
    </Text>
  )
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  rightElement,
}: {
  icon: IoniconsName
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
  rightElement?: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: pressed && onPress ? colors.surface2 : 'transparent',
        gap: spacing.md,
      })}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textMuted} />
      <Text
        style={{
          flex: 1,
          color: danger ? colors.danger : colors.text,
          fontSize: fontSize.body,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>{value}</Text>
      ) : null}
      {rightElement ?? null}
      {onPress && !rightElement ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </Pressable>
  )
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginLeft: spacing.lg + 20 + spacing.md,
      }}
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  )
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter()
  const { profile, units, updateProfile, setUnits } = useUserStore()
  const goalSheetRef = useRef<GorhomBottomSheet>(null)

  // ── Edit profile state ──
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(profile?.name ?? '')
  const [dob,  setDob]        = useState(profile?.dateOfBirth ?? '')
  const [calGoal, setCalGoal] = useState(String(profile?.calorieGoalKcal ?? ''))

  // Weight / height in current units
  const [weightVal, setWeightVal] = useState(() =>
    profile ? (units === 'metric' ? String(profile.weightKg) : String(kgToLbs(profile.weightKg))) : ''
  )
  const [heightFt, setHeightFt] = useState(() => {
    if (!profile) return ''
    const { ft } = cmToFtIn(profile.heightCm)
    return String(ft)
  })
  const [heightIn, setHeightIn] = useState(() => {
    if (!profile) return ''
    const { inches } = cmToFtIn(profile.heightCm)
    return String(inches)
  })
  const [heightCm, setHeightCm] = useState(() =>
    profile ? String(profile.heightCm) : ''
  )

  // ── Notification prefs ──
  const [workoutEnabled,  setWorkoutEnabled]  = useState(notifStorage.getBoolean('workout_enabled') ?? false)
  const [workoutTime,     setWorkoutTime]     = useState(notifStorage.getString('workout_time') ?? '08:00')
  const [waterEnabled,    setWaterEnabled]    = useState(notifStorage.getBoolean('water_enabled') ?? false)
  const [waterInterval,   setWaterInterval]   = useState(notifStorage.getNumber('water_interval') ?? 2)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function startEdit() {
    setName(profile?.name ?? '')
    setDob(profile?.dateOfBirth ?? '')
    setCalGoal(String(profile?.calorieGoalKcal ?? ''))
    setWeightVal(
      profile
        ? units === 'metric'
          ? String(profile.weightKg)
          : String(kgToLbs(profile.weightKg))
        : ''
    )
    if (profile) {
      const { ft, inches } = cmToFtIn(profile.heightCm)
      setHeightFt(String(ft))
      setHeightIn(String(inches))
      setHeightCm(String(profile.heightCm))
    }
    setEditing(true)
  }

  function saveProfile() {
    if (!profile) return
    const weightKg =
      units === 'metric' ? Number(weightVal) : lbsToKg(Number(weightVal))
    const heightCmVal =
      units === 'metric' ? Number(heightCm) : ftInToCm(Number(heightFt), Number(heightIn))
    updateProfile({
      name: name.trim(),
      dateOfBirth: dob,
      weightKg,
      heightCm: heightCmVal,
      calorieGoalKcal: Number(calGoal) || profile.calorieGoalKcal,
    })
    setEditing(false)
  }

  function selectGoal(g: OnboardingGoal) {
    updateProfile({ goals: [g] })
    goalSheetRef.current?.close()
  }

  function toggleUnits() {
    setUnits(units === 'metric' ? 'imperial' : 'metric')
  }

  function saveNotifPref(key: string, value: boolean | string | number) {
    if (typeof value === 'boolean') notifStorage.set(key, value)
    else if (typeof value === 'number') notifStorage.set(key, value)
    else notifStorage.set(key, value)
  }

  async function handleExport() {
    if (!profile) return
    const payload = JSON.stringify({ profile, exportedAt: new Date().toISOString() }, null, 2)
    await Share.share({ message: payload, title: 'MyOS Data Export' })
  }

  function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete your profile and all logged data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: () => {
            db.execSync('DELETE FROM user_profile;')
            db.execSync('DELETE FROM daily_log;')
            mmkv.clearAll()
            notifStorage.clearAll()
            useUserStore.setState({
              profile: null,
              units: 'metric',
              onboardingComplete: false,
            })
            router.replace('/onboarding')
          },
        },
      ]
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const currentGoal = (profile?.goals?.[0] ?? 'general_health') as OnboardingGoal
  const goalConfig  = GOALS.find((g) => g.id === currentGoal) ?? GOALS[3]
  const appVersion  = Constants.expoConfig?.version ?? '—'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ padding: spacing.sm, marginRight: spacing.sm }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', flex: 1 }}>
          Settings
        </Text>
        {!editing ? (
          <Pressable onPress={startEdit} style={{ padding: spacing.sm }}>
            <Text style={{ color: colors.primary, fontSize: fontSize.body, fontWeight: '600' }}>
              Edit
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={saveProfile} style={{ padding: spacing.sm }}>
            <Text style={{ color: colors.success, fontSize: fontSize.body, fontWeight: '600' }}>
              Save
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* ── Profile ── */}
        <SectionTitle title="Profile" />
        <Card>
          {editing ? (
            <View style={{ padding: spacing.md, gap: spacing.md }}>
              <EditField label="Name" value={name} onChange={setName} />
              <EditField label="Date of Birth" value={dob} onChange={setDob} hint="YYYY-MM-DD" />

              {units === 'metric' ? (
                <EditField label="Weight (kg)" value={weightVal} onChange={setWeightVal} numeric />
              ) : (
                <EditField label="Weight (lbs)" value={weightVal} onChange={setWeightVal} numeric />
              )}

              {units === 'metric' ? (
                <EditField label="Height (cm)" value={heightCm} onChange={setHeightCm} numeric />
              ) : (
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
                    Height
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <EditField label="ft" value={heightFt} onChange={setHeightFt} numeric containerFlex={1} />
                    <EditField label="in" value={heightIn} onChange={setHeightIn} numeric containerFlex={1} />
                  </View>
                </View>
              )}

              <EditField label="Calorie goal (kcal)" value={calGoal} onChange={setCalGoal} numeric />

              <Pressable
                onPress={() => goalSheetRef.current?.expand()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface2,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, flex: 1 }}>Goal</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '500' }}>
                  {goalConfig.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />
              </Pressable>
            </View>
          ) : (
            <>
              <Row icon="person-outline" label="Name" value={profile?.name ?? '—'} />
              <Divider />
              <Row
                icon="barbell-outline"
                label="Weight"
                value={profile ? formatWeight(profile.weightKg, units) : '—'}
              />
              <Divider />
              <Row
                icon="resize-outline"
                label="Height"
                value={profile ? formatHeight(profile.heightCm, units) : '—'}
              />
              <Divider />
              <Row icon="calendar-outline" label="Date of Birth" value={profile?.dateOfBirth ?? '—'} />
              <Divider />
              <Row
                icon={goalConfig.icon}
                label="Goal"
                value={goalConfig.label}
              />
            </>
          )}
        </Card>

        {/* ── Preferences ── */}
        <SectionTitle title="Preferences" />
        <Card>
          <Row
            icon="globe-outline"
            label="Units"
            value={units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
            onPress={toggleUnits}
          />
          <Divider />
          <Row
            icon="flame-outline"
            label="Calorie goal"
            value={profile?.calorieGoalKcal ? `${profile.calorieGoalKcal} kcal` : '—'}
            onPress={startEdit}
          />
        </Card>

        {/* ── Notifications ── */}
        <SectionTitle title="Notifications" />
        <Card>
          <Row
            icon="barbell-outline"
            label="Workout reminder"
            rightElement={
              <NotifToggle
                enabled={workoutEnabled}
                onToggle={(v) => { setWorkoutEnabled(v); saveNotifPref('workout_enabled', v) }}
              />
            }
          />
          {workoutEnabled && (
            <>
              <Divider />
              <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons name="time-outline" size={20} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.body, flex: 1 }}>Time</Text>
                <TextInput
                  value={workoutTime}
                  onChangeText={(v) => { setWorkoutTime(v); saveNotifPref('workout_time', v) }}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={{
                    color: colors.text,
                    fontSize: fontSize.body,
                    textAlign: 'right',
                    minWidth: 60,
                  }}
                />
              </View>
            </>
          )}
          <Divider />
          <Row
            icon="water-outline"
            label="Water reminder"
            rightElement={
              <NotifToggle
                enabled={waterEnabled}
                onToggle={(v) => { setWaterEnabled(v); saveNotifPref('water_enabled', v) }}
              />
            }
          />
          {waterEnabled && (
            <>
              <Divider />
              <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.sm }}>
                  Remind every
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                  {WATER_INTERVALS.map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => { setWaterInterval(h); saveNotifPref('water_interval', h) }}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        borderRadius: radius.full,
                        backgroundColor: waterInterval === h ? colors.water : colors.surface2,
                        borderWidth: 1,
                        borderColor: waterInterval === h ? colors.water : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: waterInterval === h ? colors.bg : colors.textMuted,
                          fontSize: fontSize.label,
                          fontWeight: '600',
                        }}
                      >
                        {h}h
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}
        </Card>

        {/* ── Data ── */}
        <SectionTitle title="Data" />
        <Card>
          <Row icon="download-outline" label="Export all data" onPress={handleExport} />
          <Divider />
          <Row icon="trash-outline" label="Clear all data" onPress={handleClearData} danger />
        </Card>

        {/* ── About ── */}
        <SectionTitle title="About" />
        <Card>
          <Row icon="information-circle-outline" label="Version" value={`v${appVersion}`} />
          <Divider />
          <Row icon="cloud-outline" label="Updates" value="Manual" />
        </Card>

      </ScrollView>

      {/* Goal picker sheet */}
      <BottomSheet ref={goalSheetRef} snapPoints={['55%']}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginBottom: spacing.lg }}>
            Select Goal
          </Text>
          <View style={{ gap: spacing.sm }}>
            {GOALS.map((g) => {
              const selected = currentGoal === g.id
              return (
                <Pressable
                  key={g.id}
                  onPress={() => selectGoal(g.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: selected ? colors.surface2 : 'transparent',
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: selected ? g.color : colors.border,
                    padding: spacing.md,
                    gap: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name={g.icon} size={20} color={selected ? g.color : colors.textMuted} />
                  <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, fontWeight: selected ? '600' : '400' }}>
                    {g.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={g.color} />}
                </Pressable>
              )
            })}
          </View>
        </View>
      </BottomSheet>

    </SafeAreaView>
  )
}

// ─── Small helpers ───────────────────────────────────────────────────────────

function EditField({
  label,
  value,
  onChange,
  hint,
  numeric,
  containerFlex,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  numeric?: boolean
  containerFlex?: number
}) {
  return (
    <View style={{ flex: containerFlex }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.label, marginBottom: spacing.xs }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={hint ?? label}
        placeholderTextColor={colors.textMuted}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={{
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          color: colors.text,
          fontSize: fontSize.body,
          minHeight: 44,
        }}
        selectionColor={colors.primary}
      />
    </View>
  )
}

function NotifToggle({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onToggle(!enabled)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: enabled ? colors.primary : colors.surface2,
        borderWidth: 1,
        borderColor: enabled ? colors.primary : colors.border,
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: colors.text,
          alignSelf: enabled ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  )
}
