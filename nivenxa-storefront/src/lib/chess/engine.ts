import type { EngineMoveOptions, EngineTopMove, SkillLevel } from './types'

const WORKER_URL = '/stockfish/stockfish-18-lite-single.js'

function goCommand(options: EngineMoveOptions): string {
  if (options.movetime) return `go movetime ${options.movetime}`
  if (options.depth) return `go depth ${options.depth}`
  return 'go movetime 1000'
}

/**
 * Thin wrapper around the Stockfish WASM Web Worker, speaking the UCI text
 * protocol. One instance = one worker; not shared across components.
 */
export class StockfishEngine {
  private worker: Worker | null = null
  private readyPromise: Promise<void> | null = null
  private ready = false

  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise

    this.readyPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('StockfishEngine can only be initialized in the browser'))
        return
      }

      let worker: Worker
      try {
        worker = new Worker(WORKER_URL)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to create Stockfish worker'))
        return
      }
      this.worker = worker

      const onMessage = (event: MessageEvent) => {
        const line = event.data
        if (typeof line !== 'string') return
        if (line.trim() === 'uciok') {
          worker.postMessage('isready')
        } else if (line.trim() === 'readyok') {
          worker.removeEventListener('message', onMessage)
          this.ready = true
          resolve()
        }
      }
      const onError = () => {
        reject(new Error('Stockfish worker failed to load (WASM may be unsupported or unreachable)'))
      }

      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      worker.postMessage('uci')
    })

    return this.readyPromise
  }

  private assertReady(): Worker {
    if (!this.worker || !this.ready) {
      throw new Error('StockfishEngine is not ready — call and await init() before use')
    }
    return this.worker
  }

  setSkillLevel(level: SkillLevel): void {
    const worker = this.assertReady()
    const clamped = Math.max(0, Math.min(20, Math.round(level)))
    worker.postMessage(`setoption name Skill Level value ${clamped}`)
  }

  getBestMove(fen: string, options: EngineMoveOptions = {}): Promise<string> {
    const worker = this.assertReady()

    return new Promise<string>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const line = event.data
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return
        worker.removeEventListener('message', onMessage)
        const move = line.split(' ')[1]
        if (!move || move === '(none)') {
          reject(new Error('Stockfish returned no legal move for this position'))
        } else {
          resolve(move)
        }
      }
      worker.addEventListener('message', onMessage)
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(goCommand(options))
    })
  }

  getTopMoves(fen: string, multiPv: number, options: EngineMoveOptions = {}): Promise<EngineTopMove[]> {
    const worker = this.assertReady()
    const pvCount = Math.max(1, Math.round(multiPv))

    return new Promise<EngineTopMove[]>((resolve) => {
      const lines = new Map<number, EngineTopMove>()

      const onMessage = (event: MessageEvent) => {
        const line = event.data
        if (typeof line !== 'string') return

        if (line.startsWith('info') && line.includes(' pv ')) {
          const multipvMatch = line.match(/multipv (\d+)/)
          const pvMatch = line.match(/ pv (\S+)/)
          if (!multipvMatch || !pvMatch) return

          const mateMatch = line.match(/score mate (-?\d+)/)
          const cpMatch = line.match(/score cp (-?\d+)/)
          const evaluation = mateMatch
            ? { type: 'mate' as const, value: parseInt(mateMatch[1], 10) }
            : { type: 'cp' as const, value: cpMatch ? parseInt(cpMatch[1], 10) : 0 }

          lines.set(parseInt(multipvMatch[1], 10), { move: pvMatch[1], evaluation })
        } else if (line.startsWith('bestmove')) {
          worker.removeEventListener('message', onMessage)
          worker.postMessage('setoption name MultiPV value 1')
          resolve(
            Array.from(lines.entries())
              .sort(([a], [b]) => a - b)
              .map(([, topMove]) => topMove)
          )
        }
      }

      worker.addEventListener('message', onMessage)
      worker.postMessage(`setoption name MultiPV value ${pvCount}`)
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(goCommand(options))
    })
  }

  /** Centipawn evaluation for the side to move; mate scores collapse to ±100000. */
  evaluatePosition(fen: string, depth = 15): Promise<number> {
    const worker = this.assertReady()

    return new Promise<number>((resolve) => {
      let lastScore = 0

      const onMessage = (event: MessageEvent) => {
        const line = event.data
        if (typeof line !== 'string') return

        if (line.startsWith('info') && line.includes('score')) {
          const mateMatch = line.match(/score mate (-?\d+)/)
          const cpMatch = line.match(/score cp (-?\d+)/)
          if (mateMatch) {
            const movesToMate = parseInt(mateMatch[1], 10)
            lastScore = movesToMate === 0 ? 0 : Math.sign(movesToMate) * 100000
          } else if (cpMatch) {
            lastScore = parseInt(cpMatch[1], 10)
          }
        } else if (line.startsWith('bestmove')) {
          worker.removeEventListener('message', onMessage)
          resolve(lastScore)
        }
      }

      worker.addEventListener('message', onMessage)
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go depth ${depth}`)
    })
  }

  stop(): void {
    this.worker?.postMessage('stop')
  }

  destroy(): void {
    this.worker?.postMessage('quit')
    this.worker?.terminate()
    this.worker = null
    this.readyPromise = null
    this.ready = false
  }
}
