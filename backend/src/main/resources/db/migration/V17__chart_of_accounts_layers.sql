CREATE TABLE a_l1 (
 company_code varchar(40) NOT NULL REFERENCES organizations(code), coa_id bigint NOT NULL REFERENCES a_coa(coa_id),
 l1_code varchar(6) NOT NULL, l1_desc varchar(100), acctype varchar(1), accgroup varchar(1),
 ins_user varchar(50), ins_date timestamptz, upd_user varchar(50), upd_date timestamptz, device_flage varchar(2),
 PRIMARY KEY (company_code, coa_id, l1_code)
);
CREATE TABLE a_l2 (
 company_code varchar(40) NOT NULL, coa_id bigint NOT NULL, l1_code varchar(6) NOT NULL, l2_code varchar(6) NOT NULL,
 l2_desc varchar(100), acctype varchar(1), accgroup varchar(1), category_code varchar(6),
 ins_user varchar(50), ins_date timestamptz, upd_user varchar(50), upd_date timestamptz, device_flage varchar(2),
 PRIMARY KEY (company_code, coa_id, l1_code, l2_code),
 FOREIGN KEY (company_code, coa_id, l1_code) REFERENCES a_l1
);
CREATE TABLE a_l3 (
 company_code varchar(40) NOT NULL, coa_id bigint NOT NULL, l1_code varchar(6) NOT NULL, l2_code varchar(6) NOT NULL, l3_code varchar(10) NOT NULL,
 l3_desc varchar(100), acctype varchar(1), accgroup varchar(1), acc_spl_group varchar(2),
 ins_user varchar(50), ins_date timestamptz, upd_user varchar(50), upd_date timestamptz, device_flage varchar(2),
 PRIMARY KEY (company_code, coa_id, l1_code, l2_code, l3_code),
 FOREIGN KEY (company_code, coa_id, l1_code, l2_code) REFERENCES a_l2
);
CREATE TABLE a_l4 (
 company_code varchar(40) NOT NULL, coa_id bigint NOT NULL, l1_code varchar(6) NOT NULL, l2_code varchar(6) NOT NULL, l3_code varchar(10) NOT NULL, l4_code varchar(10) NOT NULL,
 l4_desc varchar(100), acctype varchar(1), accgroup varchar(1),
 ins_user varchar(50), ins_date timestamptz, upd_user varchar(50), upd_date timestamptz, device_flage varchar(2),
 PRIMARY KEY (company_code, coa_id, l1_code, l2_code, l3_code, l4_code),
 FOREIGN KEY (company_code, coa_id, l1_code, l2_code, l3_code) REFERENCES a_l3
);
CREATE TABLE a_acc_head (
 company_code varchar(40) NOT NULL, coa_id bigint NOT NULL, l1_code varchar(6) NOT NULL, l2_code varchar(6) NOT NULL, l3_code varchar(10) NOT NULL, l4_code varchar(10) NOT NULL, l5_code varchar(10) NOT NULL,
 acchead varchar(100), acctype varchar(1), accgroup varchar(1), bs_is_code varchar(10), creation_dt date,
 retain_earning_flag varchar(1), closing_stock_flag varchar(1), opening_stock_flag varchar(1), party_code varchar(6),
 rp_dr_code varchar(10), rp_cr_code varchar(10), cf_code varchar(10), ratio_indicator varchar(20), cg_opb_code varchar(10), cg_dr_code varchar(10), cg_cr_code varchar(10), cg_code varchar(10), bs_is_code1 varchar(10), cf_dr_code varchar(10), cf_cr_code varchar(10), bv_code varchar(10),
 ins_user varchar(50), upd_user varchar(50), ins_date timestamptz, upd_date timestamptz,
 bs_is_dr_pk_code varchar(12), bs_is_cr_pk_code varchar(12), rp_dr_pk_code varchar(12), rp_cr_pk_code varchar(12), bv_dr_code varchar(10), bv_cr_code varchar(10), br_flag varchar(1),
 PRIMARY KEY (company_code, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code),
 FOREIGN KEY (company_code, coa_id, l1_code, l2_code, l3_code, l4_code) REFERENCES a_l4
);
