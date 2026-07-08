from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import MitchHubUser


class MitchHubLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            request=self.context.get('request'),
            username=data['username'],
            password=data['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        # Must be a MitchHubUser — reject regular CustomUsers
        if not isinstance(user, MitchHubUser):
            raise serializers.ValidationError('Access denied.')
        data['user'] = user
        return data


class MitchHubUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MitchHubUser
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'role', 'phone', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class MitchHubUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = MitchHubUser
        fields = ('username', 'first_name', 'last_name', 'email', 'role', 'phone', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = MitchHubUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class MitchHubUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model  = MitchHubUser
        fields = ('first_name', 'last_name', 'email', 'role', 'phone', 'is_active', 'password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
