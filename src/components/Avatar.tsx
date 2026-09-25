// Foto profilo rotonda, oppure l'iniziale dello username se la foto manca.
export function Avatar({
  url,
  name,
  size = 'md',
}: {
  url: string | null | undefined
  name: string | null | undefined
  size?: 'sm' | 'md'
}) {
  const className = size === 'sm' ? 'avatar sm' : 'avatar'

  if (url) return <img className={className} src={url} alt="" />

  const initial = name?.trim().charAt(0).toUpperCase() || '?'
  return (
    <span className={className} aria-hidden="true">
      {initial}
    </span>
  )
}
