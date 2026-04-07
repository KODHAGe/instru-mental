const ADJECTIVES = [
  'acoustic', 'analog', 'bold', 'bright', 'classic', 'clean', 'clear', 'cool',
  'crisp', 'dark', 'deep', 'dense', 'digital', 'dry', 'dusty', 'electric',
  'fast', 'flat', 'fluid', 'funky', 'fuzzy', 'groovy', 'harsh', 'heavy',
  'high', 'hollow', 'light', 'live', 'loud', 'low', 'mellow', 'muted',
  'narrow', 'open', 'pure', 'raw', 'rich', 'round', 'sharp', 'smooth',
  'soft', 'solid', 'strong', 'swift', 'thin', 'tight', 'vintage', 'warm',
  'wet', 'wide', 'wild', 'wiry',
]

const NOUNS = [
  'air', 'amp', 'arena', 'banjo', 'bass', 'beat', 'bell', 'bongo',
  'bow', 'breath', 'buzz', 'cab', 'cello', 'choir', 'chord', 'clap',
  'conga', 'cymbal', 'dial', 'drum', 'echo', 'fade', 'fader', 'fife',
  'flute', 'gong', 'groove', 'hall', 'harp', 'hook', 'horn', 'hum',
  'jazz', 'keys', 'knob', 'loop', 'lute', 'mallet', 'mixer', 'mode',
  'motif', 'noise', 'note', 'oboe', 'organ', 'patch', 'pedal', 'phrase',
  'piano', 'pick', 'ping', 'pitch', 'pluck', 'pulse', 'riff', 'ring',
  'rock', 'room', 'scale', 'session', 'shaker', 'sitar', 'snare', 'solo',
  'song', 'space', 'stage', 'stomp', 'strum', 'studio', 'swell', 'synth',
  'tabla', 'take', 'tape', 'tempo', 'theme', 'timbre', 'tone', 'track',
  'tuba', 'tune', 'vibe', 'vinyl', 'viola', 'voice', 'wave',
]

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function generateRoomCode(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${pick(NOUNS)}`
}

export function buildRoomUrl(code: string): string {
  return `${location.origin}${location.pathname}#room=${code}`
}

export function extractRoomCodeFromHash(): string | null {
  const params = new URLSearchParams(location.hash.slice(1))
  return params.get('room')
}
