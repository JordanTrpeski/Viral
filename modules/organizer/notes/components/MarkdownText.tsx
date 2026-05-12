import { Fragment } from 'react'
import { Text, View, type StyleProp, type TextStyle } from 'react-native'
import { colors, fontSize, spacing } from '@core/theme'

type MarkdownTextProps = {
  content: string
  compact?: boolean
  numberOfLines?: number
  style?: StyleProp<TextStyle>
}

type InlineSegment = {
  text: string
  bold: boolean
  italic: boolean
}

function parseInline(markdown: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let buffer = ''
  let bold = false
  let italic = false
  let index = 0

  function pushBuffer() {
    if (!buffer) return
    segments.push({ text: buffer, bold, italic })
    buffer = ''
  }

  while (index < markdown.length) {
    if (markdown.startsWith('**', index)) {
      pushBuffer()
      bold = !bold
      index += 2
      continue
    }

    if (markdown[index] === '*') {
      pushBuffer()
      italic = !italic
      index += 1
      continue
    }

    buffer += markdown[index]
    index += 1
  }

  pushBuffer()
  return segments
}

function InlineMarkdown({
  text,
  style,
  numberOfLines,
}: {
  text: string
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}) {
  const segments = parseInline(text)

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: colors.text,
          fontSize: fontSize.body,
          lineHeight: fontSize.body * 1.55,
        },
        style,
      ]}
    >
      {segments.map((segment, index) => (
        <Text
          key={`${segment.text}-${index}`}
          style={[
            segment.bold ? { fontWeight: '700' } : null,
            segment.italic ? { fontStyle: 'italic' } : null,
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  )
}

function getVisibleLines(content: string, compact: boolean): string[] {
  const lines = content.split(/\r?\n/)
  if (!compact) return lines

  const firstNonEmpty = lines.find((line) => line.trim().length > 0)
  return firstNonEmpty ? [firstNonEmpty] : []
}

export default function MarkdownText({
  content,
  compact = false,
  numberOfLines,
  style,
}: MarkdownTextProps) {
  const lines = getVisibleLines(content, compact)

  return (
    <View style={{ gap: compact ? 0 : spacing.xs }}>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()

        if (!line) {
          return compact ? null : <View key={`empty-${index}`} style={{ height: spacing.xs }} />
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/)
        if (heading) {
          const [, level, text] = heading
          return (
            <InlineMarkdown
              key={`heading-${index}`}
              text={text}
              numberOfLines={numberOfLines}
              style={[
                {
                  color: colors.text,
                  fontSize: level.length === 1 ? fontSize.sectionHeader : fontSize.cardTitle,
                  fontWeight: '700',
                  lineHeight: (level.length === 1 ? fontSize.sectionHeader : fontSize.cardTitle) * 1.35,
                },
                style,
              ]}
            />
          )
        }

        const bullet = line.match(/^[-*]\s+(.+)$/)
        if (bullet) {
          return (
            <View key={`bullet-${index}`} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, lineHeight: fontSize.body * 1.55 }}>
                •
              </Text>
              <InlineMarkdown text={bullet[1]} numberOfLines={numberOfLines} style={[{ flex: 1 }, style]} />
            </View>
          )
        }

        const numbered = line.match(/^(\d+)\.\s+(.+)$/)
        if (numbered) {
          return (
            <View key={`numbered-${index}`} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.body, lineHeight: fontSize.body * 1.55 }}>
                {numbered[1]}.
              </Text>
              <InlineMarkdown text={numbered[2]} numberOfLines={numberOfLines} style={[{ flex: 1 }, style]} />
            </View>
          )
        }

        return (
          <Fragment key={`paragraph-${index}`}>
            <InlineMarkdown text={line} numberOfLines={numberOfLines} style={style} />
          </Fragment>
        )
      })}
    </View>
  )
}
