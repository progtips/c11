export function Alert({ variant = 'default', className = '', children }) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100',
    destructive: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  }

  return (
    <div className={`rounded-lg border p-3 sm:p-4 ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function AlertTitle({ className = '', children }) {
  return (
    <h5 className={`mb-1 font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h5>
  )
}

export function AlertDescription({ className = '', children }) {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children}
    </div>
  )
}

