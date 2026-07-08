from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE  = 'CREATE',  'Created'
        UPDATE  = 'UPDATE',  'Updated'
        DELETE  = 'DELETE',  'Deleted'
        LOGIN   = 'LOGIN',   'Logged In'
        LOGOUT  = 'LOGOUT',  'Logged Out'
        COMPUTE = 'COMPUTE', 'Computed Score'

    business   = models.ForeignKey(
        'accounts.Business', on_delete=models.CASCADE,
        null=True, blank=True, related_name='audit_logs'
    )
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, related_name='audit_logs')
    action     = models.CharField(max_length=10, choices=Action.choices)
    module     = models.CharField(max_length=50)
    object_id  = models.CharField(max_length=50, blank=True)
    detail     = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp  = models.DateTimeField(auto_now_add=False, default=None, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f'{self.timestamp:%Y-%m-%d %H:%M}  {self.user}  {self.action}  {self.module}'
