import type { GameState, MeetingSession, NarrativeEntry } from '../types/game'
import { enrichNarrativeEntry } from './eventReactions'

let meetingNarrativeCounter = 0

function nextId(): string {
  meetingNarrativeCounter += 1
  return `n-meeting-${meetingNarrativeCounter}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function otherParticipantIds(session: MeetingSession): string[] {
  return session.participantIds.filter((id) => id !== session.hostId)
}

function formatNames(
  ids: string[],
  characters: GameState['characters'],
): string {
  return ids
    .map((id) => characters[id]?.name)
    .filter(Boolean)
    .join('、')
}

function isCrossHouse(
  session: MeetingSession,
  characters: GameState['characters'],
): boolean {
  const houses = new Set(
    session.participantIds
      .map((id) => characters[id]?.houseId)
      .filter(Boolean),
  )
  return houses.size > 1
}

function buildMeetingStartText(
  hostName: string,
  othersText: string,
  participantCount: number,
  crossHouse: boolean,
): string {
  if (crossHouse) {
    return pick([
      `【会晤】${hostName}发出邀约，${othersText}应约而至，跨族会晤正式开始。`,
      `【会晤】${hostName}与${othersText}在会晤厅相见，两族同席，气氛谨慎而正式。`,
      `【会晤】${hostName}召集${othersText}等人会面，共 ${participantCount} 人出席，跨族会谈就此开幕。`,
    ])
  }
  return pick([
    `【会晤】${hostName}邀请${othersText}见面，${participantCount} 人齐聚会晤厅，会谈开始。`,
    `【会晤】${hostName}召集${othersText}等人，族中会晤就此开幕。`,
    `【会晤】${hostName}与${othersText}等人应约而至，会晤正式开始。`,
  ])
}

function buildMeetingEndText(
  hostName: string,
  othersText: string,
  crossHouse: boolean,
): string {
  if (crossHouse) {
    return pick([
      `【会晤】${hostName}与${othersText}的跨族会面结束，各自散去。`,
      `【会晤】会谈告一段落，${hostName}与${othersText}等人告别离去。`,
      `【会晤】跨族会晤结束，${hostName}与${othersText}等人先后离席。`,
    ])
  }
  return pick([
    `【会晤】${hostName}与${othersText}等人的会面结束，众人各自散去。`,
    `【会晤】族中会晤告一段落，${hostName}与${othersText}等人告别离去。`,
    `【会晤】会谈结束，${hostName}与${othersText}等人先后离席。`,
  ])
}

export function buildMeetingStartEntry(
  state: GameState,
  session: MeetingSession,
): NarrativeEntry {
  const host = state.characters[session.hostId]
  const hostName = host?.name ?? '某人'
  const otherIds = otherParticipantIds(session)
  const othersText = formatNames(otherIds, state.characters) || '众人'
  const crossHouse = isCrossHouse(session, state.characters)

  const entry: NarrativeEntry = {
    id: nextId(),
    year: state.year,
    month: state.month,
    type: 'event',
    text: buildMeetingStartText(
      hostName,
      othersText,
      session.participantIds.length,
      crossHouse,
    ),
    characterIds: [...session.participantIds],
  }

  return enrichNarrativeEntry(entry, state.characters)
}

export function buildMeetingEndEntry(
  state: GameState,
  session: MeetingSession,
): NarrativeEntry {
  const host = state.characters[session.hostId]
  const hostName = host?.name ?? '某人'
  const otherIds = otherParticipantIds(session)
  const othersText = formatNames(otherIds, state.characters) || '众人'
  const crossHouse = isCrossHouse(session, state.characters)

  const entry: NarrativeEntry = {
    id: nextId(),
    year: state.year,
    month: state.month,
    type: 'event',
    text: buildMeetingEndText(hostName, othersText, crossHouse),
    characterIds: [...session.participantIds],
  }

  return enrichNarrativeEntry(entry, state.characters)
}
