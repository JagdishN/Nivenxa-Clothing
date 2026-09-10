'use client'
import { useState } from 'react'
import theme from '../../../LivingTheme.module.scss'

export interface TierRow {
  from_liters: number
  to_liters: number | null
  rate_multiplier: number
}

const EMPTY_TIER: TierRow = { from_liters: 0, to_liters: null, rate_multiplier: 1 }

export default function BillingMethodEditor({
  effectiveFrom,
  initialMethod,
  initialSlabMethod,
  initialTiers,
  save,
}: {
  effectiveFrom: string
  initialMethod: 'standard' | 'slab'
  initialSlabMethod: 'progressive' | 'whole_consumption'
  initialTiers: TierRow[]
  save: (formData: FormData) => void
}) {
  const [method, setMethod] = useState(initialMethod)
  const [slabMethod, setSlabMethod] = useState(initialSlabMethod)
  const [tiers, setTiers] = useState<TierRow[]>(initialTiers.length > 0 ? initialTiers : [EMPTY_TIER])

  function updateTier(i: number, field: keyof TierRow, raw: string) {
    setTiers((prev) => {
      const next = [...prev]
      const value = raw === '' ? null : Number(raw)
      next[i] = { ...next[i], [field]: field === 'to_liters' ? value : (value ?? 0) }
      return next
    })
  }

  function addTier() {
    setTiers((prev) => {
      const last = prev[prev.length - 1]
      return [...prev, { from_liters: last?.to_liters ?? 0, to_liters: null, rate_multiplier: 1 }]
    })
  }

  function removeTier(i: number) {
    setTiers((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  return (
    <form action={save}>
      <input type="hidden" name="effective_from" value={effectiveFrom} />
      <div className={theme.card}>
        <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
          Billing method
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="radio" name="water_billing_method" value="standard" checked={method === 'standard'} onChange={() => setMethod('standard')} />
            Standard — same rate for all consumption
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="radio" name="water_billing_method" value="slab" checked={method === 'slab'} onChange={() => setMethod('slab')} />
            Slab-based — rate rises with consumption
          </label>
        </div>

        {method === 'slab' && (
          <>
            <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
              Slab calculation
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="slab_calculation_method"
                  value="progressive"
                  checked={slabMethod === 'progressive'}
                  onChange={() => setSlabMethod('progressive')}
                />
                Progressive — each band&rsquo;s own litres billed at that band&rsquo;s rate
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="slab_calculation_method"
                  value="whole_consumption"
                  checked={slabMethod === 'whole_consumption'}
                  onChange={() => setSlabMethod('whole_consumption')}
                />
                Whole-consumption — total usage picks one rate for everything
              </label>
            </div>

            <p className={theme.label} style={{ marginBottom: '0.5rem' }}>
              Tiers — multiplier applies to this month&rsquo;s live base rate (see the Water page), never a fixed ₹ amount
            </p>
            <input type="hidden" name="tier_count" value={tiers.length} />
            <div className={theme.tableScroll} style={{ marginBottom: '0.75rem' }}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>From (L)</th>
                    <th>To (L)</th>
                    <th>Multiplier</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          name={`tier_from_${i}`}
                          className={theme.input}
                          type="number"
                          value={tier.from_liters}
                          onChange={(e) => updateTier(i, 'from_liters', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          name={`tier_to_${i}`}
                          className={theme.input}
                          type="number"
                          placeholder="Unbounded"
                          value={tier.to_liters ?? ''}
                          onChange={(e) => updateTier(i, 'to_liters', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          name={`tier_multiplier_${i}`}
                          className={theme.input}
                          type="number"
                          step="0.1"
                          value={tier.rate_multiplier}
                          onChange={(e) => updateTier(i, 'rate_multiplier', e.target.value)}
                        />
                      </td>
                      <td>
                        {tiers.length > 1 && (
                          <button type="button" className={theme.buttonGhost} onClick={() => removeTier(i)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className={theme.buttonGhost} style={{ marginBottom: '1.25rem' }} onClick={addTier}>
              Add tier
            </button>
          </>
        )}

        <div>
          <button type="submit" className={theme.button}>
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
