"""
Core views - health checks and system endpoints.
"""

from datetime import date, timedelta

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsTenantMember
from .serializers import DashboardStatsSerializer


class HealthCheckView(APIView):
    """Health check endpoint for load balancers and monitoring."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {"status": "healthy", "service": "rhr-backend"},
            status=status.HTTP_200_OK,
        )


class DashboardStatsView(APIView):
    """Dashboard statistics endpoint."""

    permission_classes = [IsAuthenticated, IsTenantMember]

    def get(self, request):
        from apps.employees.models import Department, Employee, Position
        from apps.leave.models import LeaveRequest
        from apps.contracts.models import Contract

        tenant = request.tenant
        if not tenant:
            return Response(
                {"detail": "No tenant context"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get date ranges
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_future = today + timedelta(days=30)

        # Employee stats
        employees = Employee.objects.filter(tenant=tenant)
        total_employees = employees.count()
        active_employees = employees.filter(status="active").count()
        on_leave_employees = employees.filter(status="on_leave").count()

        # Organization stats
        departments_count = Department.objects.filter(tenant=tenant, is_active=True).count()
        positions_count = Position.objects.filter(tenant=tenant, is_active=True).count()

        # Leave stats
        pending_leave_requests = LeaveRequest.objects.filter(
            tenant=tenant, status="pending"
        ).count()

        # Contract stats - expiring in next 30 days
        expiring_contracts = Contract.objects.filter(
            tenant=tenant,
            status="active",
            end_date__lte=thirty_days_future,
            end_date__gte=today,
        ).count()

        # Recent hires (last 30 days)
        recent_hires = employees.filter(hire_date__gte=thirty_days_ago).count()

        data = {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "on_leave_employees": on_leave_employees,
            "departments_count": departments_count,
            "positions_count": positions_count,
            "pending_leave_requests": pending_leave_requests,
            "expiring_contracts": expiring_contracts,
            "recent_hires": recent_hires,
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)
