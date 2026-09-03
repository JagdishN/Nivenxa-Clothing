import { test, expect } from '@playwright/test'
import { resolveDrawDecision } from '../src/lib/chess/drawDecision'
import { SKILL_TIERS, skillForStrength, strengthSteps, type SkillTier } from '../src/lib/chess/skillTiers'

// Pure-logic acceptance tests for the draw-offer decision and the
// tier -> Stockfish-skill mapping — no browser/page needed, these just
// exercise the exported functions directly.

test.describe('resolveDrawDecision', () => {
  const tiers: SkillTier[] = ['beginner', 'intermediate', 'expert', 'master']

  for (const tier of tiers) {
    test(`${tier}: rejects a clearly winning position`, () => {
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawRejectCp, tier)).toBe('reject')
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawRejectCp + 500, tier)).toBe('reject')
    })

    test(`${tier}: accepts a clearly losing position`, () => {
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawAcceptCp, tier)).toBe('accept')
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawAcceptCp - 500, tier)).toBe('accept')
    })

    test(`${tier}: never accepts above the reject threshold, regardless of "randomness"`, () => {
      // rng() always returning 0 would force acceptance inside the "consider"
      // band if the eval weren't already at/above the hard reject cutoff.
      const alwaysZero = () => 0
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawRejectCp, tier, alwaysZero)).toBe('reject')
    })

    test(`${tier}: never rejects below the accept threshold, regardless of "randomness"`, () => {
      const alwaysOne = () => 0.999999
      expect(resolveDrawDecision(SKILL_TIERS[tier].drawAcceptCp, tier, alwaysOne)).toBe('accept')
    })
  }

  test('Master does not automatically accept a draw at the start of a game (eval 0)', () => {
    // A fresh/roughly-equal position is squarely inside Master's narrow
    // consider band (-40..+40) — it must not be a guaranteed accept.
    const alwaysHigh = () => 0.999999 // biases toward "reject" within the band
    expect(resolveDrawDecision(0, 'master', alwaysHigh)).toBe('reject')
  })

  test('Master is stricter than Intermediate at the same evaluation', () => {
    // +60cp: outside Master's reject threshold (40) so Master always rejects,
    // regardless of rng — but it's still inside Intermediate's consider band
    // (reject at 100), so Intermediate CAN accept there depending on rng.
    expect(resolveDrawDecision(60, 'master', () => 0)).toBe('reject')
    expect(resolveDrawDecision(60, 'intermediate', () => 0)).toBe('accept')
  })

  test('higher tiers have tighter (more disciplined) accept/reject bands than lower tiers', () => {
    const bandWidth = (t: SkillTier) => SKILL_TIERS[t].drawRejectCp - SKILL_TIERS[t].drawAcceptCp
    expect(bandWidth('master')).toBeLessThan(bandWidth('expert'))
    expect(bandWidth('expert')).toBeLessThanOrEqual(bandWidth('intermediate'))
    expect(bandWidth('intermediate')).toBeLessThan(bandWidth('beginner'))
  })
})

test.describe('tier -> Stockfish skill mapping', () => {
  test('strengthSteps matches the documented ranges', () => {
    expect(strengthSteps('beginner')).toBe(3) // 0-2
    expect(strengthSteps('intermediate')).toBe(5) // 3-7
    expect(strengthSteps('expert')).toBe(6) // 8-13
    expect(strengthSteps('master')).toBe(7) // 14-20, matches "Strength: 1 of 7"
  })

  test('skillForStrength maps 1-of-N to the tier\'s minSkill, and N-of-N to maxSkill', () => {
    for (const tier of ['beginner', 'intermediate', 'expert', 'master'] as SkillTier[]) {
      expect(skillForStrength(tier, 1)).toBe(SKILL_TIERS[tier].minSkill)
      expect(skillForStrength(tier, strengthSteps(tier))).toBe(SKILL_TIERS[tier].maxSkill)
    }
  })

  test('Master strength 7 of 7 maps to Stockfish skill 20', () => {
    expect(skillForStrength('master', 7)).toBe(20)
  })

  test('skillForStrength clamps out-of-range input', () => {
    expect(skillForStrength('master', 0)).toBe(14)
    expect(skillForStrength('master', 99)).toBe(20)
  })

  test('tier skill ranges do not overlap and stay within 0-20', () => {
    const ranges = (['beginner', 'intermediate', 'expert', 'master'] as SkillTier[]).map((t) => SKILL_TIERS[t])
    for (const r of ranges) {
      expect(r.minSkill).toBeGreaterThanOrEqual(0)
      expect(r.maxSkill).toBeLessThanOrEqual(20)
      expect(r.minSkill).toBeLessThanOrEqual(r.maxSkill)
    }
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i].maxSkill).toBeLessThan(ranges[i + 1].minSkill)
    }
  })
})
