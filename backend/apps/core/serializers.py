"""
Core serializers including dashboard statistics.
"""

from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from .models import Document


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


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for document uploads and listings."""

    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True)
    download_url = serializers.SerializerMethodField()
    content_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "name",
            "original_filename",
            "file_size",
            "mime_type",
            "description",
            "content_type",
            "content_type_name",
            "object_id",
            "uploaded_by",
            "uploaded_by_name",
            "download_url",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "original_filename",
            "file_size",
            "mime_type",
            "uploaded_by",
            "created_at",
        ]

    def get_download_url(self, obj: Document) -> str:
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return ""

    def get_content_type_name(self, obj: Document) -> str:
        return obj.content_type.model


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading new documents."""

    file = serializers.FileField(write_only=True)
    content_type_model = serializers.CharField(write_only=True)

    class Meta:
        model = Document
        fields = [
            "file",
            "name",
            "description",
            "content_type_model",
            "object_id",
        ]

    def validate_content_type_model(self, value: str) -> ContentType:
        """Convert model name to ContentType instance."""
        try:
            return ContentType.objects.get(model=value.lower())
        except ContentType.DoesNotExist as e:
            raise serializers.ValidationError(f"Invalid content type: {value}") from e

    def create(self, validated_data: dict) -> Document:
        file = validated_data.pop("file")
        content_type = validated_data.pop("content_type_model")

        document = Document(
            **validated_data,
            content_type=content_type,
            file=file,
            original_filename=file.name,
            file_size=file.size,
            mime_type=file.content_type or "application/octet-stream",
        )
        document.save()
        return document
