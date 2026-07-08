from django.utils import timezone
from .models import AuditLog


def get_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log(request, action, module, object_id='', detail=''):
    user = request.user if request.user.is_authenticated else None
    AuditLog.objects.create(
        business=user.business if user else None,
        user=user,
        action=action,
        module=module,
        object_id=str(object_id),
        detail=detail,
        ip_address=get_ip(request),
        timestamp=timezone.now(),
    )
