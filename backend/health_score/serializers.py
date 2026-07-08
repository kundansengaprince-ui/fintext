from rest_framework import serializers
from .models import BusinessHealthScore, MLModelLog


class BusinessHealthScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessHealthScore
        fields = '__all__'


class MLModelLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModelLog
        fields = '__all__'
