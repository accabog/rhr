"""
Contract URLs.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContractDocumentViewSet, ContractTypeViewSet, ContractViewSet

router = DefaultRouter()
router.register("types", ContractTypeViewSet, basename="contracttype")
router.register("documents", ContractDocumentViewSet, basename="contract-document")
router.register("", ContractViewSet, basename="contract")

urlpatterns = [
    path("", include(router.urls)),
]
