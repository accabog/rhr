"""
Core serializers including dashboard statistics.
"""

from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics."""

    total_employees = serializers.IntegerField()
    active_employees = serializers.IntegerField()
    on_leave_employees = serializers.IntegerField()
    departments_count = serializers.IntegerField()
    positions_count = serializers.IntegerField()
    pending_leave_requests = serializers.IntegerField()
    expiring_contracts = serializers.IntegerField()
    recent_hires = serializers.IntegerField()
