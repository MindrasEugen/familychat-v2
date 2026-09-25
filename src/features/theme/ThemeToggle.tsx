import { MoonIcon, SunIcon } from '../../components/icons'
import { setTheme, useThemeStore, type Theme } from './themeStore'

const OPTIONS: { value: Theme; label: string; Icon: typeof MoonIcon }[] = [
  { value: 'dark', label: 'Scuro', Icon: MoonIcon },
  { value: 'light', label: 'Chiaro', Icon: SunIcon },
]

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)

  return (
    <div className="card">
      <span className="section-label">Tema</span>
      <div className="theme-toggle" role="group" aria-label="Tema dell'app">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
