from rest_framework import serializers
from .models import ExpenseCategory, ExpenseReport


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'


class ExpenseReportSerializer(serializers.ModelSerializer):
    category_name = serializers.StringRelatedField(source='category', read_only=True)
    created_by_name = serializers.StringRelatedField(source='created_by', read_only=True)

    class Meta:
        model = ExpenseReport
        fields = '__all__'
        read_only_fields = ('business', 'created_by', 'created_at', 'updated_at')
