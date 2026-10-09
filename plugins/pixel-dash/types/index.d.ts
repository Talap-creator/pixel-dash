export type Frame = string

declare module 'claude-code' {
  interface PluginState {
    'pixel-dash': { frame: Frame | null }
  }
}
