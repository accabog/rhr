from django.contrib import admin

from .models import Contract, ContractDocument, ContractType


@admin.register(ContractType)
class ContractTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "code", "is_active"]
    list_filter = ["tenant", "is_active"]
    search_fields = ["name", "code"]


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "tenant",
        "contract_type",
        "title",
        "start_date",
        "end_date",
        "status",
        "salary",
    ]
    list_filter = ["tenant", "contract_type", "status", "start_date"]
    search_fields = ["employee__first_name", "employee__last_name", "title"]
    date_hierarchy = "start_date"


@admin.register(ContractDocument)
class ContractDocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "tenant", "contract", "uploaded_by", "created_at"]
    list_filter = ["tenant"]
    search_fields = ["name", "contract__title"]
