from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'user_display', 'action', 'action_display',
                  'module', 'object_id', 'detail', 'ip_address', 'timestamp')

    def get_user_display(self, obj):
        if not obj.user:
            return 'System'
        name = obj.user.get_full_name()
        return f'{name} (@{obj.user.username})' if name else f'@{obj.user.username}'
