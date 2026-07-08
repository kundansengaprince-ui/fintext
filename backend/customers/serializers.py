from rest_framework import serializers
from .models import CustomerRetentionRecord


class CustomerRetentionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by', read_only=True)

    class Meta:
        model = CustomerRetentionRecord
        fields = '__all__'
        read_only_fields = ('business', 'total_customers', 'retention_rate', 'created_by', 'created_at', 'updated_at')
