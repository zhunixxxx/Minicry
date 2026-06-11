import type {
  GameState,
  MeetingRelationOutcome,
  MeetingSession,
  NarrativeEntry,
} from '../types/game'
import { enrichNarrativeEntry } from './eventReactions'
import { compareMeetingRelations } from './meetingRelations'

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
      `【会面】${hostName}发出请柬，${othersText}应邀到访庄园，跨家族会面正式开始。`,
      `【会面】${hostName}与${othersText}在客厅相见，两家同席，气氛谨慎而合乎礼数。`,
      `【会面】${hostName}召集${othersText}等人会面，共 ${participantCount} 人出席，邻领会谈就此开始。`,
    ])
  }
  return pick([
    `【会面】${hostName}邀请${othersText}见面，${participantCount} 人齐聚客厅，茶叙开始。`,
    `【会面】${hostName}召集${othersText}等人，家族内部会面就此开始。`,
    `【会面】${hostName}与${othersText}等人到场，会面正式开始。`,
  ])
}

const MEETING_END_IMPROVED_SAME = [
  (host: string, others: string) =>
    `【会面】${host}与${others}的会面在融洽氛围中结束，彼此约定改日再聚。`,
  (host: string, others: string) =>
    `【会面】茶叙圆满，${host}与${others}等人依依惜别，相谈甚欢。`,
  (host: string, others: string) =>
    `【会面】${host}与${others}等人相谈甚欢，会面在笑声中结束，气氛比开始时更热络。`,
  (host: string, others: string) =>
    `【会面】会谈结束，${host}与${others}等人互道后会有期，显然还想再见面。`,
]

const MEETING_END_IMPROVED_CROSS = [
  (host: string, others: string) =>
    `【会面】${host}与${others}的跨家族会面意外顺利，分别时彼此都多了些好感。`,
  (host: string, others: string) =>
    `【会面】邻领会谈在友好氛围中结束，${host}与${others}等人约定保持联系。`,
  (host: string, others: string) =>
    `【会面】${host}与${others}等人告别时多了几句寒暄，两家关系似乎缓和了些。`,
  (host: string, others: string) =>
    `【会面】跨家族会面圆满收场，${host}与${others}等人依依惜别，舆论或将有正面解读。`,
]

const MEETING_END_WORSEENED_SAME = [
  (host: string, others: string) =>
    `【会面】${host}与${others}的会面不欢而散，众人冷脸离去。`,
  (host: string, others: string) =>
    `【会面】会谈过程中摩擦不断，${host}与${others}等人勉强告辞，气氛凝重。`,
  (host: string, others: string) =>
    `【会面】${host}与${others}等人话不投机，会面草草结束，彼此显然不想再谈。`,
  (host: string, others: string) =>
    `【会面】茶叙以不愉快收场，${host}与${others}等人几乎不再对视，各自散去。`,
]

const MEETING_END_WORSEENED_CROSS = [
  (host: string, others: string) =>
    `【会面】${host}与${others}的跨家族会面破裂，双方依礼告别，眼里却没有温度。`,
  (host: string, others: string) =>
    `【会面】邻领会谈不欢而散，${host}与${others}等人冷脸离去，媒体恐怕又要做文章。`,
  (host: string, others: string) =>
    `【会面】${host}与${others}等人话里带刺，会面在僵局中结束，两家关系雪上加霜。`,
  (host: string, others: string) =>
    `【会面】跨家族会面以不愉快收场，${host}与${others}等人几乎不再寒暄，各自乘车离去。`,
]

const MEETING_END_UNCHANGED_SAME = [
  (host: string, others: string) =>
    `【会面】${host}与${others}等人的会面结束，众人各自散去。`,
  (host: string, others: string) =>
    `【会面】家族内部茶叙告一段落，${host}与${others}等人告别离开。`,
  (host: string, others: string) =>
    `【会面】会谈结束，${host}与${others}等人先后离场。`,
]

const MEETING_END_UNCHANGED_CROSS = [
  (host: string, others: string) =>
    `【会面】${host}与${others}的跨家族会面结束，各自乘车离去。`,
  (host: string, others: string) =>
    `【会面】茶叙告一段落，${host}与${others}等人依礼告别。`,
  (host: string, others: string) =>
    `【会面】邻领会面结束，${host}与${others}等人先后离场。`,
]

function buildMeetingEndText(
  hostName: string,
  othersText: string,
  crossHouse: boolean,
  outcome: MeetingRelationOutcome,
): string {
  let pool: Array<(host: string, others: string) => string>
  if (outcome === 'improved') {
    pool = crossHouse ? MEETING_END_IMPROVED_CROSS : MEETING_END_IMPROVED_SAME
  } else if (outcome === 'worsened') {
    pool = crossHouse ? MEETING_END_WORSEENED_CROSS : MEETING_END_WORSEENED_SAME
  } else {
    pool = crossHouse ? MEETING_END_UNCHANGED_CROSS : MEETING_END_UNCHANGED_SAME
  }
  return pick(pool)(hostName, othersText)
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
    eventKind: 'meeting_start',
    reactionContext: {
      actorId: session.hostId,
      crossHouse,
    },
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
  const { outcome } = compareMeetingRelations(
    session.participantIds,
    session.initialRelations,
    session.initialBonds,
    state.characters,
  )

  const entry: NarrativeEntry = {
    id: nextId(),
    year: state.year,
    month: state.month,
    type: 'event',
    text: buildMeetingEndText(hostName, othersText, crossHouse, outcome),
    characterIds: [...session.participantIds],
    eventKind: 'meeting_end',
    reactionContext: {
      actorId: session.hostId,
      crossHouse,
      meetingOutcome: outcome,
      meetingInitialRelations: session.initialRelations,
      meetingInitialBonds: session.initialBonds,
    },
  }

  return enrichNarrativeEntry(entry, state.characters)
}
