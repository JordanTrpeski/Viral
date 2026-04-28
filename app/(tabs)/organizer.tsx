import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import { runBirthdayScheduler, requestNotificationPermission } from '@modules/organizer/shared/notificationScheduler'
import { createStorage } from '@core/utils/storage'
import { localDateStr } from '@core/utils/units'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const orgStorage = createStorage('organizer')

interface HubCard {
  title: string
  subtitle: string
  icon: IoniconsName
  color: string
  route: string
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function OrganizerScreen() {
  const router = useRouter()
  const { people, reminders, notes, loadPeople, loadReminders, loadNotes } = useOrganizerStore()
  const [permissionGranted, setPermissionGranted] = useState(true)
  const permSheetRef = useRef<BottomSheet>(null)

  useEffect(() => {
    loadPeople()
    loadReminders()
    loadNotes()

    checkPermissionAndSchedule()
  }, [])

  async function checkPermissionAndSchedule() {
    const { status } = await Notifications.getPermissionsAsync()
    if (status === 'granted') {
      setPermissionGranted(true)
      runBirthdayScheduler()
    } else {
      setPermissionGranted(false)
      const prompted = orgStorage.getBoolean('notif_prompted')
      if (!prompted) {
        setTimeout(() => permSheetRef.current?.expand(), 800)
        orgStorage.set('notif_prompted', true)
      }
    }
  }

  async function handleGrantPermission() {
    permSheetRef.current?.close()
    const granted = await requestNotificationPermission()
    setPermissionGranted(granted)
    if (granted) runBirthdayScheduler()
  }

  const today         = localDateStr()
  const overdueCount  = reminders.filter((r) => !r.isCompleted && r.dueDate < today).length
  const pinnedCount   = notes.filter((n) => n.isPinned && !n.isArchived).length

  const upcomingBirthday = people
    .filter((p) => p.birthdayDay !== null && p.birthdayMonth !== null)
    .map((p) => {
      const now = new Date()
      const thisYear = now.getFullYear()
      const bday = new Date(thisYear, (p.birthdayMonth ?? 1) - 1, p.birthdayDay ?? 1)
      if (bday < now) bday.setFullYear(thisYear + 1)
      const days = Math.round((bday.getTime() - now.getTime()) / 86400000)
      return { name: p.name.split(' ')[0], days }
    })
    .sort((a, b) => a.days - b.days)[0] ?? null

  const cards: HubCard[] = [
    {
      title: 'People',
      subtitle: people.length > 0
        ? `${people.length} ${people.length === 1 ? 'person' : 'people'}${upcomingBirthday ? ` · ${upcomingBirthday.name} in ${upcomingBirthday.days}d` : ''}`
        : 'Add people & birthdays',
      icon: 'people-outline',
      color: colors.people,
      route: '/organizer/people',
    },
    {
      title: 'Reminders',
      subtitle: overdueCount > 0
        ? `${overdueCount} overdue`
        : reminders.filter((r) => !r.isCompleted).length > 0
          ? `${reminders.filter((r) => !r.isCompleted).length} pending`
          : 'No pending reminders',
      icon: 'alarm-outline',
      color: colors.reminders,
      route: '/organizer/reminders',
    },
    {
      title: 'Calendar',
      subtitle: 'Events & birthdays',
      icon: 'calendar-outline',
      color: colors.calendar,
      route: '/organizer/calendar',
    },
    {
      title: 'Notes',
      subtitle: notes.filter((n) => !n.isArchived).length > 0
        ? `${notes.filter((n) => !n.isArchived).length} notes${pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ''}`
        : 'Capture anything',
      icon: 'document-text-outline',
      color: colors.notes,
      route: '/organizer/notes',
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '700' }}>
          Organizer
        </Text>
        <Pressable onPress={() => router.push('/organizer/tiers' as never)} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Permission banner */}
      {!permissionGranted && (
        <Pressable
          onPress={() => permSheetRef.current?.expand()}
          style={{
            marginHorizontal: spacing.md, marginBottom: spacing.sm,
            backgroundColor: `${colors.warning}18`, borderRadius: radius.md,
            borderWidth: 1, borderColor: `${colors.warning}44`,
            flexDirection: 'row', alignItems: 'center',
            padding: spacing.sm, gap: spacing.sm,
          }}
        >
          <Ionicons name="notifications-off-outline" size={18} color={colors.warning} />
          <Text style={{ flex: 1, color: colors.warning, fontSize: fontSize.label }}>
            Notifications off — birthday reminders won't fire
          </Text>
          <Text style={{ color: colors.warning, fontSize: fontSize.micro, fontWeight: '700' }}>FIX</Text>
        </Pressable>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {cards.map((card) => (
          <Pressable
            key={card.title}
            onPress={() => router.push(card.route as never)}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, gap: spacing.md,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{
              width: 48, height: 48, borderRadius: radius.md,
              backgroundColor: `${card.color}22`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={card.icon} size={24} color={card.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' }}>
                {card.title}
              </Text>
              <Text style={{
                color: card.title === 'Reminders' && overdueCount > 0 ? colors.danger : colors.textMuted,
                fontSize: fontSize.body, marginTop: 2,
              }}>
                {card.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Permission prompt bottom sheet */}
      <BottomSheet
        ref={permSheetRef}
        index={-1}
        snapPoints={['48%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ padding: spacing.xl, gap: spacing.lg, alignItems: 'center' }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: `${colors.organizer}22`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="notifications-outline" size={36} color={colors.organizer} />
          </View>

          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sectionHeader, fontWeight: '700', textAlign: 'center' }}>
              Enable birthday reminders
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center', lineHeight: 22 }}>
              MyOS needs notification permission to remind you about birthdays based on your importance tiers — from 30 days out down to the day itself.
            </Text>
          </View>

          <Pressable
            onPress={handleGrantPermission}
            style={({ pressed }) => ({
              backgroundColor: colors.organizer, borderRadius: radius.md,
              paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
              width: '100%', alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: fontSize.body, fontWeight: '700' }}>Allow Notifications</Text>
          </Pressable>

          <Pressable onPress={() => permSheetRef.current?.close()}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>Not now</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  )
}
