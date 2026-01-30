// User types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar?: string;
  is_active: boolean;
  tenants: TenantMembership[];
  created_at: string;
  updated_at: string;
}

// Tenant types
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain?: string;
  is_active: boolean;
  logo?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  max_employees: number;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: number;
  tenant: Tenant;
  role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  is_default: boolean;
  created_at: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  tenant_name?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
  tenants: TenantMembership[];
}

// Employee types
export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  parent?: number;
  manager?: number;
  is_active: boolean;
  children_count: number;
  employees_count: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  title: string;
  code: string;
  description: string;
  department?: number;
  department_name?: string;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar?: string;
  department?: number;
  department_name?: string;
  position?: number;
  position_title?: string;
  manager?: number;
  manager_name?: string;
  hire_date: string;
  termination_date?: string;
  status: 'active' | 'on_leave' | 'terminated' | 'suspended';
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  user?: number;
  created_at: string;
  updated_at: string;
}

// API response types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  [key: string]: unknown;
}
