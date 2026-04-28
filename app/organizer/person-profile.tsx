import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Image, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, spacing, radius } from '@core/theme'
import { useOrganizerStore } from '@modules/organizer/organizerStore'
import {
  daysUntilBirthday, currentAge, birthdayColorForDays, birthdayPassedWithinDays,
} from '@modules/organizer/shared/organizerUtils'
import {
  dbGetGiftIdeas, dbInsertGiftIdea, dbToggleGiftIdea, dbDeleteGiftIdea,
  dbGetNotesByPerson, dbGetEventsByPerson,
} from '@core/db/organizerQueries'
import type { OrganizerGiftIdea, OrganizerNote, OrganizerEvent } from '@core/types'
import SwipeableRow from '@core/components/SwipeableRow'

let _giftCounter = 0

export default function PersonProfileScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { people, tiers, loadPeople, loadTiers } = useOrganizerStore()
  const person = people.find((p) => p.id === id)
  const tier   = tiers.find((t) => t.id === person?.tierId)

  const [giftIdeas, setGiftIdeas]   = useState<OrganizerGiftIdea[]>([])
  const [linkedNotes, setNotes]     = useState<OrganizerNote[]>([])
  const [linkedEvents, setEvents]   = useState<OrganizerEvent[]>([])
  const [newIdea, setNewIdea]       = useState('')
  const [newPrice, setNewPrice]     = useState('')

  useEffect(() => {
    loadPeople()
    loadTiers()
  }, [])

  useFocusEffect(useCallback(() => {
    if (id) {
      setGiftIdeas(dbGetGiftIdeas(id))
      setNotes(dbGetNotesByPerson(id))
      setEvents(dbGetEventsByPerson(id))
    }
  }, [id]))

  function addGiftIdea() {
    if (!newIdea.trim()) return
    const price = newPrice.trim() ? parseFloat(newPrice.trim()) : null
    const giftId = `gift_${++_giftCounter}_${Date.now()}`
    dbInsertGiftIdea(giftId, id!, newIdea.trim(), price)
    setGiftIdeas(dbGetGiftIdeas(id!))
    setNewIdea('')
    setNewPrice('')
  }

  function toggleGift(giftId: string, purchased: boolean) {
    dbToggleGiftIdea(giftId, !purchased)
    setGiftIdeas(dbGetGiftIdeas(id!))
  }

  function deleteGift(giftId: string) {
    dbDeleteGiftIdea(giftId)
    setGiftIdeas(dbGetGiftIdeas(id!))
  }

  if (!person) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Person not found</Text>
      </SafeAreaView>
    )
  }

  const hasBirthday   = person.birthdayDay !== null && person.birthdayMonth !== null
  const days          = hasBirthday ? daysUntilBirthday(person.birthdayDay!, person.birthdayMonth!) : null
  const isToday       = days === 0
  const isRecent      = hasBirthday && birthdayPassedWithinDays(person.birthdayDay!, person.birthdayMonth!, 7)
  const age           = person.birthdayYear && hasBirthday
    ? currentAge(person.birthdayYear, person.birthdayMonth!, person.birthdayDay!)
    : null
  const bdayColor     = days !== null && !isRecent ? birthdayColorForDays(days) : colors.success
  const initial       = person.name.trim()[0]?.toUpperCase() ?? '?'

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const bdayLabel = hasBirthday
    ? `${person.birthdayDay} ${MONTHS[(person.birthdayMonth ?? 1) - 1]}${person.birthdayYear ? ` ${person.birthdayYear}` : ''}`
    : null

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
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push(`/organizer/person-add?id=${person.id}` as never)}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="pencil" size={20} color={colors.people} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Hero section */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md }}>
          {person.photoUri ? (
            <Image source={{ uri: person.photoUri }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: tier?.color ?? colors.people }} />
          ) : (
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: `${tier?.color ?? colors.people}22`,
              borderWidth: 3, borderColor: tier?.color ?? colors.people,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: tier?.color ?? colors.people, fontSize: 40, fontWeight: '700' }}>{initial}</Text>
            </View>
          )}

          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>{person.name}</Text>

          {/* Tier badge */}
          {tier && (
            <View style={{
              backgroundColor: `${tier.color}22`, borderRadius: radius.full,
              paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
              borderWidth: 1, borderColor: `${tier.color}55`,
            }}>
              <Text style={{ color: tier.color, fontSize: fontSize.label, fontWeight: '600' }}>
                {tier.emoji} {tier.name}
              </Text>
            </View>
          )}

          {/* Birthday info */}
          {hasBirthday && (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>
                🎂 {bdayLabel}{age !== null ? ` · ${age} years old` : ''}
              </Text>
              {isToday ? (
                <Text style={{ color: colors.danger, fontSize: fontSize.sectionHeader, fontWeight: '700' }}>🎉 Happy Birthday!</Text>
              ) : isRecent ? (
                <Text style={{ color: colors.success, fontSize: fontSize.label, fontWeight: '600' }}>Birthday just passed!</Text>
              ) : days !== null ? (
                <Text style={{ color: bdayColor, fontSize: fontSize.label, fontWeight: '600' }}>
                  {days === 1 ? 'Tomorrow!' : `${days} days away`}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Contact + notes */}
        {(person.phone || person.relationship || person.notes) && (
          <View style={{ marginHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md }}>
            {person.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${person.phone}`)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Ionicons name="call-outline" size={18} color={colors.organizer} />
                <Text style={{ flex: 1, color: colors.organizer, fontSize: fontSize.body }}>{person.phone}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            )}
            {person.relationship && (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm, borderBottomWidth: person.notes ? 1 : 0, borderBottomColor: colors.border }}>
                <Ionicons name="heart-outline" size={18} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: fontSize.body }}>{person.relationship}</Text>
              </View>
            )}
            {person.notes && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm }}>
                <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.body, lineHeight: 20 }}>{person.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Gift ideas */}
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.sm }}>
            🎁 GIFT IDEAS
          </Text>
          <View style={{ gap: spacing.xs }}>
            {giftIdeas.map((gift) => (
              <SwipeableRow
                key={gift.id}
                rightActions={[{ label: 'Delete', icon: 'trash-outline', color: colors.danger, onPress: () => deleteGift(gift.id) }]}
              >
                <Pressable
                  onPress={() => toggleGift(gift.id, gift.isPurchased)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.surface, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.sm, gap: spacing.sm,
                  }}
                >
                  <Ionicons
                    name={gift.isPurchased ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={gift.isPurchased ? colors.success : colors.textMuted}
                  />
                  <Text style={{
                    flex: 1, color: gift.isPurchased ? colors.textMuted : colors.text,
                    fontSize: fontSize.body,
                    textDecorationLine: gift.isPurchased ? 'line-through' : 'none',
                  }}>
                    {gift.idea}
                  </Text>
                  {gift.priceEstimate !== null && (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>€{gift.priceEstimate.toFixed(0)}</Text>
                  )}
                </Pressable>
              </SwipeableRow>
            ))}

            {/* Add idea inline */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              gap: spacing.xs,
            }}>
              <TextInput
                value={newIdea} onChangeText={setNewIdea}
                placeholder="Add a gift idea…" placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.text, fontSize: fontSize.body, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}
                onSubmitEditing={addGiftIdea}
                returnKeyType="done"
              />
              <TextInput
                value={newPrice} onChangeText={setNewPrice}
                placeholder="€" placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ width: 52, color: colors.text, fontSize: fontSize.body, textAlign: 'center', paddingVertical: spacing.sm }}
              />
              <Pressable onPress={addGiftIdea} hitSlop={8} style={{ paddingRight: spacing.sm }}>
                <Ionicons name="add-circle" size={22} color={newIdea.trim() ? colors.people : colors.textMuted} />
              </Pressable>
            </View>

            {giftIdeas.length === 0 && !newIdea && (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.label, textAlign: 'center', paddingVertical: spacing.sm }}>
                No gift ideas yet
              </Text>
            )}
          </View>
        </View>

        {/* Linked notes */}
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.sm }}>
            📝 LINKED NOTES
          </Text>
          {linkedNotes.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No notes linked to {person.name.split(' ')[0]}</Text>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {linkedNotes.map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => router.push(`/organizer/note-edit?id=${note.id}` as never)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.sm, opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {note.title && <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{note.title}</Text>}
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.label }} numberOfLines={2}>{note.body}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Linked events */}
        <View style={{ marginHorizontal: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.micro, fontWeight: '600', marginBottom: spacing.sm }}>
            📅 LINKED EVENTS
          </Text>
          {linkedEvents.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.label }}>No events linked to {person.name.split(' ')[0]}</Text>
          ) : (
            <View style={{ gap: spacing.xs }}>
              {linkedEvents.map((event) => (
                <View
                  key={event.id}
                  style={{
                    backgroundColor: colors.surface, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  }}
                >
                  <View style={{ width: 4, height: '100%', borderRadius: 2, backgroundColor: event.color ?? colors.calendar }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.body, fontWeight: '600' }}>{event.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.micro }}>
                      {event.date}{event.startTime ? ` · ${event.startTime}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
