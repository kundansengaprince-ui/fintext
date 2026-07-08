export function validatePassword(password) {
  const errors = []
  if (password.length < 8)                              errors.push('at least 8 characters')
  if (!/[A-Z]/.test(password))                         errors.push('an uppercase letter')
  if (!/[a-z]/.test(password))                         errors.push('a lowercase letter')
  if (!/\d/.test(password))                            errors.push('a number')
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password))    errors.push('a special character')
  return errors
}

export function passwordStrength(password) {
  if (!password) return null
  const errors = validatePassword(password)
  if (errors.length === 0) return { level: 'strong', label: 'Strong', color: 'bg-emerald-500' }
  if (errors.length <= 2)  return { level: 'medium', label: 'Medium', color: 'bg-yellow-400' }
  return                          { level: 'weak',   label: 'Weak',   color: 'bg-red-500'    }
}
