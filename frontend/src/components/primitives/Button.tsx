type Props = {
  children: React.ReactNode
  href?: string
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

export function Button({
  children, href, variant = 'primary', type = 'button', onClick, disabled,
}: Props) {
  const className = `btn btn-${variant}`
  if (href) {
    return (
      <a className={className} href={href}>
        {children}
        <span aria-hidden="true">→</span>
      </a>
    )
  }
  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
