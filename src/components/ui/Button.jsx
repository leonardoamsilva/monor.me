function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-transparent border border-border text-text hover:bg-surface-hover',
    danger: 'bg-danger text-white hover:bg-red-600'
  }

  return (
    <button className={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]}`} {...props}>{children}</button>
  )
}

export default Button;