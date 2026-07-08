from rest_framework import serializers
from .models import SalesRecord


class SalesRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.StringRelatedField(source='created_by', read_only=True)

    class Meta:
        model = SalesRecord
        fields = '__all__'
        read_only_fields = ('business', 'avg_transaction_value', 'created_by', 'created_at', 'updated_at')
