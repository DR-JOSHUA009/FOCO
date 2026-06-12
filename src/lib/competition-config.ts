export const DELIVERY_POINTS = {
  1: 50,  // first to submit
  2: 40,  // second
  3: 30,  // third
  default: 20  // 4th place onwards
} as const

export const VOTE_POINTS_PER_VOTE = 10
export const BEST_EVIDENCE_BONUS = 20
export const VOTING_DURATION_HOURS = 24
export const MISSION_INTERVAL_DAYS = 2

export function getDeliveryPoints(rank: number): number {
  if (rank <= 3) return DELIVERY_POINTS[rank as 1|2|3]
  return DELIVERY_POINTS.default
}
