import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { daysUntilBirthday, birthdayPassedWithinDays, birthdayColorForDays, getPersonDaysUntilBirthday } from '@modules/organizer/shared/organizerUtils'
import SwipeableRow from '@core/components/SwipeableRow'
import type { OrganizerPerson, OrganizerTier } from '@core/types'
import { Alert } from 'react-native'

type SortMode = 'birthday' | 'name' | 'tier'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ person, tier, size = 44 }: { person: OrganizerPerson; tier?: OrganizerTier; size?: number }) {
  const initial = person.name.trim()[0]?.toUpperCase() ?? '?'
  const bg = tier?.color ?? colors.textMuted
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `${bg}33`, borderWidth: 2, borderColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: bg, fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
    </View>
  )
}

// ── Person card ───────────────────────────────────────────────────────────────

function PersonCard({
  person, tier, onPress, onEdit, onDelete,
}: {
  person: OrganizerPerson
  tier?: OrganizerTier
  onPress: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const days = getPersonDaysUntilBirthday(person)
  const isRecent = person.birthdayDay !== null && person.birthdayMonth !== null
    && birthdayPassedWithinDays(person.birthdayDay, person.birthdayMonth, 7)

  return (
    <SwipeableRow rightActions={[
      { label: 'Edit', icon: 'pencil', color: colors.organizer, onPress: onEdit },
      { label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: onDelete },
    ]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          padding: spacing.sm, gap: spacing.sm,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Avatar person={person} tier={tier} />

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{person.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            {person.relationship && (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>{person.relationship}</Text>
            )}
            {tier && (
              <View style={{
                backgroundColor: `${tier.color}22`, borderRadius: radius.full,
                paddingHorizontal: 6, paddingVertical: 1,
                borderWidth: 1, borderColor: `${tier.color}44`,
              }}>
                <Text style={{ color: tier.color, fontSize: fontSize.micro, fontWeight: '600' }}>
                  {tier.emoji} {tier.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Birthday indicator */}
        {days !== null && (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            {isRecent ? (
              <Text style={{ color: colors.success, fontSize: fontSize.micro, fontWeight: '700' }}>🎂 Recent</Text>
            ) : days === 0 ? (
              <Text style={{ color: colors.danger, fontSize: fontSize.label, fontWeight: '700' }}>🎂 Today!</Text>
            ) : (
              <>
                <Text style={{ color: birthdayColorForDays(days), fontSize: fontSize.label, fontWeight: '700' }}>
                  {days}d
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>birthday</Text>
              </>
            )}
          </View>
        )}
      </Pressable>
    </SwipeableRow>
  )
}

// ── Upcoming strip card ───────────────────────────────────────────────────────

function UpcomingCard({ person, tier, onPress }: { person: OrganizerPerson; tier?: OrganizerTier; onPress: () => void }) {
  const days = getPersonDaysUntilBirthday(person)!
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.sm, width: 100, alignItems: 'center', gap: spacing.xs,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Avatar person={person} tier={tier} size={36} />
      <Text style={{ color: colors.text, fontSize: fontSize.micro, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
        {person.name.split(' ')[0]}
      </Text>
      <Text style={{ color: birthdayColorForDays(days), fontSize: fontSize.micro, fontWeight: '700' }}>
        {days === 0 ? 'Today!' : `${days}d`}
      </Text>
    </Pressable>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PeopleScreen() {
  const router = useRouter()
  const { people, tiers, loadPeople, loadTiers, removePerson } = useOrganizerStore()

  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState<SortMode>('birthday')
  const [filterTier, setFilter]   = useState<string | null>(null)

  useEffect(() => {
    loadPeople()
    loadTiers()
  }, [])

  const tierMap = useMemo(() => {
    const m: Record<string, OrganizerTier> = {}
    tiers.forEach((t) => { m[t.id] = t })
    return m
  }, [tiers])

  const filtered = useMemo(() => {
    let list = people
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (filterTier) {
      list = list.filter((p) => p.tierId === filterTier)
    }
    return list
  }, [people, search, filterTier])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'tier') {
      list.sort((a, b) => {
        const tA = tierMap[a.tierId]?.orderIndex ?? 99
        const tB = tierMap[b.tierId]?.orderIndex ?? 99
        return tA - tB
      })
    } else {
      // birthday: nearest first, no-birthday at end
      list.sort((a, b) => {
        const dA = getPersonDaysUntilBirthday(a)
        const dB = getPersonDaysUntilBirthday(b)
        if (dA === null && dB === null) return 0
        if (dA === null) return 1
        if (dB === null) return -1
        return dA - dB
      })
    }
    return list
  }, [filtered, sort, tierMap])

  const upcoming = useMemo(() =>
    people
      .filter((p) => p.birthdayDay !== null && p.birthdayMonth !== null)
      .map((p) => ({ person: p, days: daysUntilBirthday(p.birthdayDay!, p.birthdayMonth!) }))
      .filter(({ days }) => days <= 30)
      .sort((a, b) => a.days - b.days)
  , [people])

  const recentBirthdays = useMemo(() =>
    people.filter((p) =>
      p.birthdayDay !== null && p.birthdayMonth !== null &&
      birthdayPassedWithinDays(p.birthdayDay!, p.birthdayMonth!, 7)
    )
  , [people])

  function handleDelete(person: OrganizerPerson) {
    Alert.alert(
      'Delete Person',
      `Remove ${person.name}? This will also delete their gift ideas and notification overrides.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removePerson(person.id) },
      ],
    )
  }

  const sortedTiers = [...tiers].sort((a, b) => a.orderIndex - b.orderIndex)

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
          People
        </Text>
        <Pressable onPress={() => router.push('/organizer/birthdays' as never)} style={{ padding: spacing.sm }}>
          <Ionicons name="gift-outline" size={22} color={colors.people} />
        </Pressable>
        <Pressable onPress={() => router.push('/organizer/person-add' as never)} style={{ padding: spacing.sm }}>
          <Ionicons name="person-add-outline" size={22} color={colors.people} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: spacing.sm, gap: spacing.xs,
          }}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={search} onChangeText={setSearch}
              placeholder="Search people…" placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingVertical: spacing.sm }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Sort pills */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          {(['birthday', 'name', 'tier'] as SortMode[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
              style={{
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
                borderRadius: radius.full,
                backgroundColor: sort === s ? `${colors.people}22` : colors.surface,
                borderWidth: 1, borderColor: sort === s ? `${colors.people}66` : colors.border,
              }}
            >
              <Text style={{ color: sort === s ? colors.people : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                {s === 'birthday' ? '🎂 Birthday' : s === 'name' ? 'A–Z' : '🏅 Tier'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tier filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.xs }}>
          <Pressable
            onPress={() => setFilter(null)}
            style={{
              paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
              borderRadius: radius.full,
              backgroundColor: filterTier === null ? `${colors.people}22` : colors.surface,
              borderWidth: 1, borderColor: filterTier === null ? `${colors.people}66` : colors.border,
            }}
          >
            <Text style={{ color: filterTier === null ? colors.people : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>All</Text>
          </Pressable>
          {sortedTiers.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setFilter(filterTier === t.id ? null : t.id)}
              style={{
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
                borderRadius: radius.full,
                backgroundColor: filterTier === t.id ? `${t.color}22` : colors.surface,
                borderWidth: 1, borderColor: filterTier === t.id ? `${t.color}66` : colors.border,
              }}
            >
              <Text style={{ color: filterTier === t.id ? t.color : colors.textMuted, fontSize: fontSize.micro, fontWeight: '600' }}>
                {t.emoji} {t.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Upcoming birthdays strip */}
        {upcoming.length > 0 && (
          <View style={{ paddingTop: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
              UPCOMING — NEXT 30 DAYS
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
              {upcoming.map(({ person }) => (
                <UpcomingCard
                  key={person.id} person={person}
                  tier={tierMap[person.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${person.id}` as never)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent birthdays section */}
        {recentBirthdays.length > 0 && (
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
            <Text style={{ color: colors.success, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.xs }}>
              🎉 RECENT BIRTHDAYS
            </Text>
            <View style={{ gap: spacing.xs }}>
              {recentBirthdays.map((person) => (
                <PersonCard
                  key={person.id} person={person}
                  tier={tierMap[person.tierId]}
                  onPress={() => router.push(`/organizer/person-profile?id=${person.id}` as never)}
                  onEdit={() => router.push(`/organizer/person-add?id=${person.id}` as never)}
                  onDelete={() => handleDelete(person)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Main list */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs }}>
          {sorted.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
              <Ionicons name="people-outline" size={44} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
                {search.trim() ? 'No people match your search' : 'No people yet — add someone!'}
              </Text>
            </View>
          ) : (
            sorted.map((person) => (
              <PersonCard
                key={person.id} person={person}
                tier={tierMap[person.tierId]}
                onPress={() => router.push(`/organizer/person-profile?id=${person.id}` as never)}
                onEdit={() => router.push(`/organizer/person-add?id=${person.id}` as never)}
                onDelete={() => handleDelete(person)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
