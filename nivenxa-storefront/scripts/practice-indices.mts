import { BASICS } from '../src/lib/chess/basics/data'
const out: Record<string, { total: number; practice: number[] }> = {}
for (const l of BASICS) {
  const steps = (l as any).boardSteps ?? (l as any).steps ?? []
  out[l.slug] = { total: steps.length, practice: steps.flatMap((s: any, i: number) => (s.kind === 'demo' ? [] : [i])) }
}
console.log(JSON.stringify(out))
