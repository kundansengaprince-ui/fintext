import re
from django.core.exceptions import ValidationError


class StrongPasswordValidator:
    """
    Password must be at least 8 characters and contain:
    uppercase, lowercase, digit, and special character.
    """
    def validate(self, password, user=None):
        errors = []
        if len(password) < 8:
            errors.append('at least 8 characters')
        if not re.search(r'[A-Z]', password):
            errors.append('an uppercase letter')
        if not re.search(r'[a-z]', password):
            errors.append('a lowercase letter')
        if not re.search(r'\d', password):
            errors.append('a number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', password):
            errors.append('a special character (!@#$%^&* etc.)')
        if errors:
            raise ValidationError(f'Password must contain: {", ".join(errors)}.')

    def get_help_text(self):
        return 'Must be 8+ characters with uppercase, lowercase, number and special character.'
