ALTER TABLE user_profiles
    ADD COLUMN assigned_organization_id uuid REFERENCES organizations(id);

UPDATE user_profiles user_profile
SET assigned_organization_id = assignment.organization_id
FROM (
    SELECT DISTINCT ON (user_id) user_id, organization_id
    FROM organization_memberships
    WHERE status = 'ACTIVE'
    ORDER BY user_id, joined_at NULLS LAST, created_at, id
) assignment
WHERE assignment.user_id = user_profile.id;

CREATE INDEX ix_user_profiles_assigned_organization
    ON user_profiles (assigned_organization_id)
    WHERE assigned_organization_id IS NOT NULL;

CREATE TABLE membership_branches (
    organization_id uuid NOT NULL,
    membership_id   uuid NOT NULL,
    branch_id       uuid NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (membership_id, branch_id),
    FOREIGN KEY (organization_id, membership_id)
        REFERENCES organization_memberships(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, branch_id)
        REFERENCES branches(organization_id, id)
);

INSERT INTO membership_branches (organization_id, membership_id, branch_id)
SELECT membership.organization_id, membership.id, branch.id
FROM organization_memberships membership
JOIN branches branch ON branch.organization_id = membership.organization_id
WHERE membership.status = 'ACTIVE'
  AND branch.branch_type = 'HEAD_OFFICE'
  AND branch.status = 'ACTIVE'
ON CONFLICT DO NOTHING;

CREATE INDEX ix_membership_branches_branch
    ON membership_branches (organization_id, branch_id);

COMMENT ON COLUMN user_profiles.assigned_organization_id IS
    'Immutable login company for ordinary users. Only a super administrator may reassign it.';
COMMENT ON TABLE membership_branches IS
    'Branches a user may access within the company fixed by their active membership.';
