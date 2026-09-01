export interface TimeControlPreset {
  minutes: number
  incrementSeconds: number
  label: string
  /** Short name shown on the preset tile, e.g. "Standard" — purely descriptive. */
  category: string
}

export type TimeControlMode = 'rapid' | 'classical'

export interface TimeControlModeConfig {
  label: string
  presets: TimeControlPreset[]
}

/** `presets[0]` is each mode's default. */
export const TIME_CONTROLS: Record<TimeControlMode, TimeControlModeConfig> = {
  rapid: {
    label: 'Rapid',
    presets: [
      { minutes: 10, incrementSeconds: 5, label: '10 + 5', category: 'Quick' },
      { minutes: 15, incrementSeconds: 10, label: '15 + 10', category: 'Standard' },
      { minutes: 20, incrementSeconds: 10, label: '20 + 10', category: 'Extended' },
    ],
  },
  classical: {
    label: 'Classical',
    presets: [
      { minutes: 25, incrementSeconds: 10, label: '25 + 10', category: 'Standard' },
      { minutes: 30, incrementSeconds: 15, label: '30 + 15', category: 'Extended' },
      { minutes: 45, incrementSeconds: 15, label: '45 + 15', category: 'Long' },
      { minutes: 60, incrementSeconds: 30, label: '60 + 30', category: 'Full' },
    ],
  },
}

export const TIME_CONTROL_MODE_LIST: TimeControlMode[] = ['rapid', 'classical']
