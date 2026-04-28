import { tierColors } from '@core/theme'
import { dbGetTierCount, dbInsertTier, dbInsertTierRule } from '@core/db/organizerQueries'

// [tierId, name, color, emoji, dailyCountdown, dailyCountdownStartDays, orderIndex]
const TIERS: [string, string, string, string, boolean, number, number][] = [
  ['tier_very_important', 'Very Important', tierColors.veryImportant, '👑', true,  7, 0],
  ['tier_family',         'Family',         tierColors.family,         '❤️',  false, 7, 1],
  ['tier_close_friends',  'Close Friends',  tierColors.closeFriends,   '⭐',  false, 7, 2],
  ['tier_friends',        'Friends',        tierColors.friends,        '🤝', false, 7, 3],
  ['tier_acquaintances',  'Acquaintances',  tierColors.acquaintances,  '👋', false, 7, 4],
]

// [ruleId, tierId, daysBefore, notificationTime, messageTemplate]
const TIER_RULES: [string, string, number, string, string][] = [
  // Very Important: 30d, 14d, 7d, 3d, 1d, 0d
  ['rule_vi_30', 'tier_very_important', 30, '09:00', "[Name]'s birthday is in 30 days! Start planning 🎉"],
  ['rule_vi_14', 'tier_very_important', 14, '09:00', "[Name]'s birthday is in 2 weeks!"],
  ['rule_vi_7',  'tier_very_important',  7, '09:00', "[Name]'s birthday is in [Days] days!"],
  ['rule_vi_3',  'tier_very_important',  3, '09:00', "[Name]'s birthday is in [Days] days! 🎂"],
  ['rule_vi_1',  'tier_very_important',  1, '09:00', "Tomorrow is [Name]'s birthday! Don't forget 🎁"],
  ['rule_vi_0',  'tier_very_important',  0, '08:00', "🎂 Today is [Name]'s birthday! Happy [Age]th! 🎉"],

  // Family: 14d, 7d, 1d, 0d
  ['rule_fam_14', 'tier_family', 14, '09:00', "[Name]'s birthday is in 2 weeks!"],
  ['rule_fam_7',  'tier_family',  7, '09:00', "[Name]'s birthday is in [Days] days!"],
  ['rule_fam_1',  'tier_family',  1, '09:00', "Tomorrow is [Name]'s birthday!"],
  ['rule_fam_0',  'tier_family',  0, '08:00', "🎂 Today is [Name]'s birthday!"],

  // Close Friends: 7d, 3d, 1d, 0d
  ['rule_cf_7', 'tier_close_friends', 7, '09:00', "[Name]'s birthday is in [Days] days!"],
  ['rule_cf_3', 'tier_close_friends', 3, '09:00', "[Name]'s birthday is in [Days] days! 🎂"],
  ['rule_cf_1', 'tier_close_friends', 1, '09:00', "Tomorrow is [Name]'s birthday!"],
  ['rule_cf_0', 'tier_close_friends', 0, '08:00', "🎂 Today is [Name]'s birthday!"],

  // Friends: 3d, 1d, 0d
  ['rule_fr_3', 'tier_friends', 3, '09:00', "[Name]'s birthday is in [Days] days!"],
  ['rule_fr_1', 'tier_friends', 1, '09:00', "Tomorrow is [Name]'s birthday!"],
  ['rule_fr_0', 'tier_friends', 0, '08:00', "🎂 Today is [Name]'s birthday!"],

  // Acquaintances: 1d, 0d
  ['rule_ac_1', 'tier_acquaintances', 1, '09:00', "Tomorrow is [Name]'s birthday!"],
  ['rule_ac_0', 'tier_acquaintances', 0, '08:00', "Today is [Name]'s birthday!"],
]

export function seedOrganizerTiersIfNeeded(): void {
  if (dbGetTierCount() > 0) return

  TIERS.forEach(([id, name, color, emoji, dailyCountdown, dailyCountdownStartDays, orderIndex]) => {
    dbInsertTier(id, name, color, emoji, dailyCountdown, dailyCountdownStartDays, orderIndex, true)
  })

  TIER_RULES.forEach(([id, tierId, daysBefore, notificationTime, messageTemplate]) => {
    dbInsertTierRule(id, tierId, daysBefore, notificationTime, messageTemplate)
  })
}
