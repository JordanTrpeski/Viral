import { useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import {
  daysUntilBirthday, birthdayPassedWithinDays, birthdayColorForDays,
  currentAge, ageTheyAreTurning,
} from '@modules/organizer/shared/organizerUtils'
import type { OrganizerPerson, OrganizerTier } from '@core/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Row ────────────────────────────────────────────────────────────────────────

function BirthdayRow({
  person, tier, onPress,
}: {
  person: OrganizerPerson
  tier?: OrganizerTier
  onPress: () => void
}) {
  const days = daysUntilBirthday(person.birthdayDay!, person.birthdayMonth!)
  const isRecent = birthdayPassedWithinDays(person.birthdayDay!, person.birthdayMonth!, 7)
  const isToday  = days === 0

  const age = person.birthdayYear
    ? (isToday || isRecent
        ? currentAge(person.birthdayYear, person.birthdayMonth!, person.birthdayDay!)
        : ageTheyAreTurning(person.birthdayYear, person.birthdayDay!, person.birthdayMonth!))
    : null

  const bdayStr = `${person.birthdayDay} ${MONTHS[(person.birthdayMonth ?? 1) - 1]}`
  const initial = person.name.trim()[0]?.toUpperCase() ?? '?'
  const tierColor = tier?.color ?? colors.textMuted

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: isToday ? `${colors.danger}55` : colors.border,
        padding: spacing.sm, gap: spacing.sm,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Avatar */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: `${tierColor}22`, borderWidth: 2, borderColor: tierColor,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: tierColor, fontSize: 18, fontWeight: '700' }}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{person.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
            {bdayStr}{age !== null ? ` · turns ${age}` : ''}
          </Text>
          {tier && (
            <View style={{
              backgroundColor: `${tier.color}22`, borderRadius: radius.full,
              paddingHorizontal: 6, paddingVertical: 1,
              borderWidth: 1, borderColor: `${tier.color}44`,
            }}>
              <Text style={{ color: tier.color, fontSize: fontSize.micro, fontWeight: '600' }}>
                {tier.emoji}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Days indicator */}
      <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
        {isToday ? (
          <Text style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: '700' }}>🎂 Today!</Text>
        ) : isRecent ? (
          <>
            <Text style={{ color: colors.success, fontSize: fontSize.micro, fontWeight: '700' }}>passed</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{Math.abs(days - 365)}d ago</Text>
          </>
        ) : (
          <>
            <Text style={{ color: birthdayColorForDays(days), fontSize: fontSize.cardTitle, fontWeight: '700' }}>{days}</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>days</Text>
          </>
        )}
      </View>
    </Pressable>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────

function Section({ title, color = colors.textMuted, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color, fontSize: fontSize.micro, fontWeight: '600', paddingHorizontal: spacing.xs }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function BirthdaysScreen() {
  const router = useRouter()
  const { people, tiers, loadPeople, loadTiers } = useOrganizerStore()

  useEffect(() => {
    loadPeople()
    loadTiers()
  }, [])

  const tierMap = useMemo(() => Object.fromEntries(tiers.map((t) => [t.id, t])), [tiers])

  const withBirthday = useMemo(() =>
    people.filter((p) => p.birthdayDay !== null && p.birthdayMonth !== null)
  , [people])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthEnd   = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  function birthdayThisMonth(p: OrganizerPerson): boolean {
    const bday = new Date(now.getFullYear(), (p.birthdayMonth ?? 1) - 1, p.birthdayDay ?? 1)
    return bday >= monthStart && bday <= monthEnd
  }

  function birthdayNextMonth(p: OrganizerPerson): boolean {
    const bday = new Date(now.getFullYear(), (p.birthdayMonth ?? 1) - 1, p.birthdayDay ?? 1)
    return bday >= nextMonthStart && bday <= nextMonthEnd
  }

  const recent   = withBirthday.filter((p) => birthdayPassedWithinDays(p.birthdayDay!, p.birthdayMonth!, 7))
  const today    = withBirthday.filter((p) => daysUntilBirthday(p.birthdayDay!, p.birthdayMonth!) === 0)
  const thisMonth = withBirthday
    .filter((p) => birthdayThisMonth(p) && !recent.find((r) => r.id === p.id) && daysUntilBirthday(p.birthdayDay!, p.birthdayMonth!) > 0)
    .sort((a, b) => daysUntilBirthday(a.birthdayDay!, a.birthdayMonth!) - daysUntilBirthday(b.birthdayDay!, b.birthdayMonth!))
  const nextMonth = withBirthday
    .filter((p) => birthdayNextMonth(p))
    .sort((a, b) => a.birthdayMonth! - b.birthdayMonth! || a.birthdayDay! - b.birthdayDay!)
  const later = withBirthday
    .filter((p) => !birthdayThisMonth(p) && !birthdayNextMonth(p) && !recent.find((r) => r.id === p.id))
    .sort((a, b) => daysUntilBirthday(a.birthdayDay!, a.birthdayMonth!) - daysUntilBirthday(b.birthdayDay!, b.birthdayMonth!))

  const totalWithBirthday = withBirthday.length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '600', marginLeft: spacing.xs }}>
          Birthdays
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.label, paddingRight: spacing.sm }}>
          {totalWithBirthday} {totalWithBirthday === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {totalWithBirthday === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Ionicons name="gift-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>No birthdays added yet</Text>
          <Pressable
            onPress={() => router.push('/organizer/person-add' as never)}
            style={{ backgroundColor: colors.people, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: fontSize.body }}>Add someone</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}>

          {today.length > 0 && (
            <Section title="🎉 TODAY" color={colors.danger}>
              {today.map((p) => (
                <BirthdayRow key={p.id} person={p} tier={tierMap[p.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${p.id}` as never)} />
              ))}
            </Section>
          )}

          {recent.filter((p) => daysUntilBirthday(p.birthdayDay!, p.birthdayMonth!) !== 0).length > 0 && (
            <Section title="✅ RECENT — LAST 7 DAYS" color={colors.success}>
              {recent.filter((p) => daysUntilBirthday(p.birthdayDay!, p.birthdayMonth!) !== 0).map((p) => (
                <BirthdayRow key={p.id} person={p} tier={tierMap[p.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${p.id}` as never)} />
              ))}
            </Section>
          )}

          {thisMonth.length > 0 && (
            <Section title={`THIS MONTH — ${MONTHS[now.getMonth()].toUpperCase()}`}>
              {thisMonth.map((p) => (
                <BirthdayRow key={p.id} person={p} tier={tierMap[p.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${p.id}` as never)} />
              ))}
            </Section>
          )}

          {nextMonth.length > 0 && (
            <Section title={`NEXT MONTH — ${MONTHS[(now.getMonth() + 1) % 12].toUpperCase()}`}>
              {nextMonth.map((p) => (
                <BirthdayRow key={p.id} person={p} tier={tierMap[p.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${p.id}` as never)} />
              ))}
            </Section>
          )}

          {later.length > 0 && (
            <Section title="LATER">
              {later.map((p) => (
                <BirthdayRow key={p.id} person={p} tier={tierMap[p.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${p.id}` as never)} />
              ))}
            </Section>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
