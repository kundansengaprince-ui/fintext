from rest_framework import serializers
from .models import InventoryItem, InventoryRecord


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'
        read_only_fields = ('business',)


class InventoryRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.StringRelatedField(source='item', read_only=True)
    created_by_name = serializers.StringRelatedField(source='created_by', read_only=True)

    class Meta:
        model = InventoryRecord
        fields = '__all__'
        read_only_fields = ('business', 'closing_quantity', 'created_by', 'created_at', 'updated_at')
