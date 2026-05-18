import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius, fonts } from '@core/theme'
import { useWorkoutStoreV2, type SessionSummaryV2 } from '@modules/health/workout/workoutStoreV2'
import { getLastSessionByTemplateV2, type SessionDetailV2 } from '@core/db/workoutQueriesV2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtVolume(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`
}

// ─── Difficulty picker ────────────────────────────────────────────────────────

function DifficultyPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const LEVELS = [
    { v: 1, label: 'Very Easy' },
    { v: 3, label: 'Easy' },
    { v: 5, label: 'Moderate' },
    { v: 7, label: 'Hard' },
    { v: 9, label: 'Very Hard' },
    { v: 10, label: 'Max Effort' },
  ]

  function diffColor(v: number): string {
    if (v <= 3) return colors.success
    if (v <= 6) return colors.warning
    return colors.danger
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.label,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: `${fonts.ui}_600SemiBold`,
      }}>
        Session Difficulty
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {LEVELS.map(({ v, label }) => {
          const active = value === v
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={({ pressed }) => ({
                backgroundColor: active ? `${diffColor(v)}33` : colors.surface2,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: active ? diffColor(v) : colors.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 5,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{
                color: active ? diffColor(v) : colors.textMuted,
                fontSize: fontSize.label,
                fontWeight: active ? '600' : '400',
                fontFamily: active ? `${fonts.ui}_600SemiBold` : `${fonts.ui}_400Regular`,
              }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ─── PR card ─────────────────────────────────────────────────────────────────

function PRCard({ summary }: { summary: SessionSummaryV2 }) {
  const newPRs = summary.personalBests.filter((pb) => pb.isNew)
  if (newPRs.length === 0) return null

  return (
    <View style={{
      backgroundColor: `${colors.primary}18`,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
      padding: spacing.md,
      gap: spacing.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="trophy" size={18} color={colors.primary} />
        <Text style={{
          color: colors.primary,
          fontSize: fontSize.cardTitle,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          New PRs! 🎉
        </Text>
      </View>
      {newPRs.map((pb) => (
        <View key={pb.exercise.id} style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.sm,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}>
          <Text style={{
            color: colors.text,
            fontSize: fontSize.label,
            fontWeight: '600',
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            {pb.exercise.name}
          </Text>
          <Text style={{
            color: colors.primary,
            fontSize: fontSize.cardTitle,
            fontWeight: '700',
            marginTop: 2,
            fontFamily: `${fonts.mono}_700Bold`,
          }}>
            {pb.weightKg} kg × {pb.reps}
          </Text>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.micro,
            fontFamily: `${fonts.ui}_400Regular`,
          }}>
            Est. 1RM: {pb.estimatedOneRM} kg
          </Text>
        </View>
      ))}
    </View>
  )
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      alignItems: 'center',
      gap: 2,
    }}>
      <Text style={{
        color: colors.textMuted,
        fontSize: fontSize.micro,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: `${fonts.ui}_400Regular`,
      }}>
        {label}
      </Text>
      <Text style={{
        color: colors.text,
        fontSize: fontSize.cardTitle,
        fontWeight: '700',
        fontFamily: `${fonts.mono}_700Bold`,
      }}>
        {value}
      </Text>
      {sub && (
        <Text style={{
          color: colors.textMuted,
          fontSize: 9,
          fontFamily: `${fonts.ui}_400Regular`,
        }}>
          {sub}
        </Text>
      )}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FinishSessionScreen() {
  const router = useRouter()
  const { activeSession, sessionExercises, finishSession, clearSummary } = useWorkoutStoreV2()

  const [notes, setNotes] = useState('')
  const [difficulty, setDifficulty] = useState(5)

  // Last session for same template — for comparison
  const lastSession = useMemo<SessionDetailV2 | null>(() => {
    if (!activeSession?.templateId) return null
    return getLastSessionByTemplateV2(activeSession.templateId, activeSession.id)
  }, [activeSession?.templateId, activeSession?.id])

  // Preview stats from current session state (before finishSession is called)
  const confirmedSets = sessionExercises.flatMap((e) => e.sets.filter((s) => s.confirmed && !s.isWarmup))
  const previewVolume = Math.round(
    confirmedSets.reduce((sum, s) => sum + (parseFloat(s.weightInput) || 0) * (parseInt(s.repsInput) || 0), 0),
  )
  const previewDuration = activeSession
    ? Math.max(60, Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
    : 0
  const previewExercises = sessionExercises.filter((e) => e.sets.some((s) => s.confirmed && !s.isWarmup)).length

  if (!activeSession) {
    router.replace('/health/workout')
    return null
  }

  function handleSave() {
    const summary = finishSession(notes.trim() || undefined, difficulty)
    if (!summary) { router.replace('/health/workout'); return }

    // Show summary then go home
    clearSummary()
    router.replace('/health/workout')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: spacing.sm,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{
          flex: 1,
          color: colors.text,
          fontSize: fontSize.sectionHeader,
          fontWeight: '700',
          fontFamily: `${fonts.ui}_700Bold`,
        }}>
          Finish Workout
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session summary stats */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: `${colors.workout}44`,
          padding: spacing.lg,
          gap: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={{
              color: colors.text,
              fontSize: fontSize.cardTitle,
              fontWeight: '600',
              fontFamily: `${fonts.ui}_600SemiBold`,
            }}>
              Session Complete
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatBox label="Duration" value={fmtDuration(previewDuration)} />
            <StatBox label="Exercises" value={String(previewExercises)} />
            <StatBox label="Sets" value={String(confirmedSets.length)} />
            <StatBox label="Volume" value={fmtVolume(previewVolume)} />
          </View>
        </View>

        {/* PR detection preview */}
        {sessionExercises.some((e) => e.sets.some((s) => s.confirmed && !s.isWarmup)) && (
          <PRCard summary={{
            totalExercises: previewExercises,
            totalSets: confirmedSets.length,
            totalVolumeKg: previewVolume,
            durationSeconds: previewDuration,
            personalBests: sessionExercises.flatMap((ex) => {
              const workSets = ex.sets.filter((s) => s.confirmed && !s.isWarmup)
              if (!workSets.length) return []
              const best = workSets.reduce((acc, s) => {
                const w = parseFloat(s.weightInput) || 0
                const r = parseInt(s.repsInput) || 0
                const orm = w * (1 + r / 30)
                return orm > acc.orm ? { w, r, orm } : acc
              }, { w: 0, r: 0, orm: 0 })
              if (!best.w) return []
              return [{
                exercise: ex.exercise,
                weightKg: best.w,
                reps: best.r,
                estimatedOneRM: Math.round(best.orm),
                isNew: true,
              }]
            }),
          }} />
        )}

        {/* vs Last Time comparison */}
        {lastSession && (() => {
          const lastVol = lastSession.totalVolumeKg
          const diff = previewVolume - lastVol
          const pct = lastVol > 0 ? Math.abs(diff / lastVol * 100) : 0
          const up = diff > 0
          const same = Math.abs(diff) < 1
          return (
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="git-compare-outline" size={16} color={colors.textMuted} />
                <Text style={{
                  color: colors.textMuted, fontSize: fontSize.label,
                  fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
                  fontFamily: `${fonts.ui}_600SemiBold`,
                }}>
                  vs Last Time · {lastSession.session.date}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                    Today
                  </Text>
                  <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>
                    {fmtVolume(previewVolume)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                    Last time
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.cardTitle, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold` }}>
                    {fmtVolume(lastVol)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2, alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontFamily: `${fonts.ui}_400Regular` }}>
                    Change
                  </Text>
                  <Text style={{
                    fontSize: fontSize.cardTitle, fontWeight: '700', fontFamily: `${fonts.mono}_700Bold`,
                    color: same ? colors.textMuted : up ? colors.success : '#c0533a',
                  }}>
                    {same ? '=' : up ? `+${pct.toFixed(0)}%` : `-${pct.toFixed(0)}%`}
                  </Text>
                </View>
              </View>
            </View>
          )
        })()}

        {/* Difficulty picker */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
        }}>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </View>

        {/* Notes */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        }}>
          <Text style={{
            color: colors.textMuted,
            fontSize: fontSize.label,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontFamily: `${fonts.ui}_600SemiBold`,
          }}>
            Session Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel? What to improve next time…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: fontSize.body,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              minHeight: 80,
              textAlignVertical: 'top',
              fontFamily: `${fonts.ui}_400Regular`,
            }}
            selectionColor={colors.primary}
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{
            backgroundColor: colors.workout,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={{
              color: '#fff',
              fontSize: fontSize.cardTitle,
              fontWeight: '700',
              fontFamily: `${fonts.ui}_700Bold`,
            }}>
              Save Workout
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
