DELETE FROM role_permissions role_permission
USING permissions permission
WHERE role_permission.permission_id = permission.id
  AND permission.organization_id IS NULL
  AND permission.code = 'tenants.manage';

DELETE FROM permission_capabilities permission_capability
USING permissions permission
WHERE permission_capability.permission_id = permission.id
  AND permission.organization_id IS NULL
  AND permission.code = 'tenants.manage';

DELETE FROM permissions
WHERE organization_id IS NULL
  AND code = 'tenants.manage';

DELETE FROM application_capabilities
WHERE code = 'tenants.manage';

DROP TABLE provisioning_jobs;

ALTER TABLE organizations
    DROP COLUMN tenant_key,
    DROP COLUMN database_name,
    DROP COLUMN database_status,
    DROP COLUMN tenant_schema_version,
    DROP COLUMN provisioned_at,
    DROP COLUMN provisioning_error;
