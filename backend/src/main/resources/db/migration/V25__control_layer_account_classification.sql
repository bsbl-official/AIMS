-- Account type and account group are classifications of the Control layer.
-- Normalize descendants before removing the obsolete Root and Group columns.
UPDATE a_l4 child
SET acctype = control.acctype,
    accgroup = control.accgroup
FROM a_l3 control
WHERE child.company_code = control.company_code
  AND child.coa_id = control.coa_id
  AND child.l1_code = control.l1_code
  AND child.l2_code = control.l2_code
  AND child.l3_code = control.l3_code
  AND (child.acctype IS DISTINCT FROM control.acctype
       OR child.accgroup IS DISTINCT FROM control.accgroup);

UPDATE a_acc_head child
SET acctype = control.acctype,
    accgroup = control.accgroup
FROM a_l3 control
WHERE child.company_code = control.company_code
  AND child.coa_id = control.coa_id
  AND child.l1_code = control.l1_code
  AND child.l2_code = control.l2_code
  AND child.l3_code = control.l3_code
  AND (child.acctype IS DISTINCT FROM control.acctype
       OR child.accgroup IS DISTINCT FROM control.accgroup);

ALTER TABLE a_l1 DROP COLUMN acctype, DROP COLUMN accgroup;
ALTER TABLE a_l2 DROP COLUMN acctype, DROP COLUMN accgroup;
