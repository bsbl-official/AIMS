-- Remove only untouched Head Office branches that were generated automatically by company creation.
-- Branches already used by vouchers or voucher sequences are retained to preserve accounting integrity.
DELETE FROM membership_branches membership_branch
USING branches branch, organizations organization
WHERE membership_branch.organization_id = branch.organization_id
  AND membership_branch.branch_id = branch.id
  AND organization.id = branch.organization_id
  AND branch.code = 'HO'
  AND branch.branch_type = 'HEAD_OFFICE'
  AND branch.name = organization.legal_name || ' Head Office'
  AND NOT EXISTS (SELECT 1 FROM journals journal WHERE journal.branch_id = branch.id)
  AND NOT EXISTS (SELECT 1 FROM journal_sequences sequence WHERE sequence.branch_id = branch.id);

DELETE FROM branches branch
USING organizations organization
WHERE organization.id = branch.organization_id
  AND branch.code = 'HO'
  AND branch.branch_type = 'HEAD_OFFICE'
  AND branch.name = organization.legal_name || ' Head Office'
  AND NOT EXISTS (SELECT 1 FROM journals journal WHERE journal.branch_id = branch.id)
  AND NOT EXISTS (SELECT 1 FROM journal_sequences sequence WHERE sequence.branch_id = branch.id);
