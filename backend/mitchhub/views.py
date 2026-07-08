from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import MitchHubUser, MitchHubToken
from .authentication import MitchHubTokenAuthentication
from .serializers import (
    MitchHubLoginSerializer, MitchHubUserSerializer,
    MitchHubUserCreateSerializer, MitchHubUserUpdateSerializer,
)
from .permissions import MitchHubPermission, MitchHubAdminPermission
from accounts.models import Business, ClientRequest
from accounts.serializers import BusinessSerializer
from django.db.models import Count


class MitchHubLoginView(APIView):
    authentication_classes = []
    permission_classes     = [AllowAny]

    def post(self, request):
        serializer = MitchHubLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user  = serializer.validated_data['user']
        token = MitchHubToken.get_or_create(user)
        return Response({
            'token': token.key,
            'user':  MitchHubUserSerializer(user).data,
        })


class MitchHubLogoutView(APIView):
    authentication_classes = [MitchHubTokenAuthentication]
    permission_classes     = [MitchHubPermission]

    def post(self, request):
        MitchHubToken.objects.filter(user=request.user).delete()
        return Response({'detail': 'Logged out.'})


class MitchHubMeView(APIView):
    authentication_classes = [MitchHubTokenAuthentication]
    permission_classes     = [MitchHubPermission]

    def get(self, request):
        return Response(MitchHubUserSerializer(request.user).data)


class MitchHubDashboardView(APIView):
    authentication_classes = [MitchHubTokenAuthentication]
    permission_classes     = [MitchHubPermission]

    def get(self, request):
        businesses = Business.objects.annotate(user_count=Count('users', distinct=True)).order_by('-created_at')
        clients = []
        for b in businesses:
            manager = b.users.filter(role='MANAGER').first()
            clients.append({
                'id':            b.id,
                'name':          b.name,
                'business_type': b.get_business_type_display(),
                'location':      b.location,
                'email':         b.email,
                'phone':         b.phone,
                'is_active':     b.is_active,
                'user_count':    b.user_count,
                'created_at':    b.created_at,
                'manager':       f"{manager.get_full_name() or manager.username} ({manager.email})" if manager else None,
            })

        requests = list(ClientRequest.objects.values(
            'id', 'business_name', 'business_type', 'contact_name',
            'email', 'phone', 'location', 'message', 'status', 'created_at'
        ))

        return Response({
            'total_clients':    businesses.count(),
            'active_clients':   businesses.filter(is_active=True).count(),
            'pending_requests': ClientRequest.objects.filter(status=ClientRequest.Status.PENDING).count(),
            'clients':          clients,
            'requests':         requests,
        })

    def patch(self, request, pk):
        cr = get_object_or_404(ClientRequest, pk=pk)
        new_status = request.data.get('status')
        if new_status not in ClientRequest.Status.values:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        cr.status = new_status
        cr.save(update_fields=['status'])
        return Response({'detail': 'Updated.'})


class MitchHubTeamListView(APIView):
    authentication_classes = [MitchHubTokenAuthentication]
    permission_classes     = [MitchHubAdminPermission]

    def get(self, request):
        users = MitchHubUser.objects.all().order_by('first_name', 'username')
        return Response(MitchHubUserSerializer(users, many=True).data)

    def post(self, request):
        serializer = MitchHubUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(MitchHubUserSerializer(user).data, status=status.HTTP_201_CREATED)


class MitchHubTeamDetailView(APIView):
    authentication_classes = [MitchHubTokenAuthentication]
    permission_classes     = [MitchHubAdminPermission]

    def patch(self, request, pk):
        user = get_object_or_404(MitchHubUser, pk=pk)
        serializer = MitchHubUserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MitchHubUserSerializer(user).data)

    def delete(self, request, pk):
        user = get_object_or_404(MitchHubUser, pk=pk)
        if user == request.user:
            return Response({'detail': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
