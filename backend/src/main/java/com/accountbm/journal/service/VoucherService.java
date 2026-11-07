package com.accountbm.journal.service;

import static com.accountbm.journal.dto.VoucherDtos.*;

import com.accountbm.organization.service.OrganizationAccessService;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VoucherService {
    private static final Map<String,Config> CONFIGS=Map.of(
            "debit",new Config("DEBIT","a_dr","a_drchild"),
            "credit",new Config("CREDIT","a_cr","a_crchild"),
            "journal",new Config("JOURNAL","a_jv","a_jvchild"));
    private static final DateTimeFormatter NUMBER_DATE=DateTimeFormatter.BASIC_ISO_DATE;
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;
    public VoucherService(JdbcTemplate jdbc,OrganizationAccessService access){this.jdbc=jdbc;this.access=access;}

    @Transactional(readOnly=true)
    public VoucherOptions options(UUID companyId,String voucherClass,UUID actor){
        var config=config(voucherClass); require(companyId,actor,false);
        var setups=jdbc.query("""
                SELECT v.id,v.branch_id,b.code branch_code,b.name branch_name,v.project_code_id,p.name project_name,
                       v.finance_code_id,f.name finance_name,v.component_code_id,c.name component_name,
                       v.coa_id,coa.coa_desc,v.voucher_type,v.document_type,v.voucher_description,v.auto_voucher
                FROM a_vr_type v JOIN branches b ON b.id=v.branch_id AND b.organization_id=v.organization_id
                JOIN project_codes p ON p.id=v.project_code_id AND p.organization_id=v.organization_id
                JOIN finance_codes f ON f.id=v.finance_code_id AND f.project_code_id=v.project_code_id AND f.organization_id=v.organization_id
                JOIN component_codes c ON c.id=v.component_code_id AND c.organization_id=v.organization_id
                JOIN a_coa coa ON coa.coa_id=v.coa_id
                WHERE v.organization_id=? AND v.voucher_class=? ORDER BY b.code,p.id,f.id,c.id,v.voucher_type
                """,(rs,n)->new VoucherSetupOption(rs.getObject("id",UUID.class),rs.getObject("branch_id",UUID.class),
                rs.getString("branch_code"),rs.getString("branch_name"),rs.getInt("project_code_id"),rs.getString("project_name"),
                rs.getInt("finance_code_id"),rs.getString("finance_name"),rs.getInt("component_code_id"),rs.getString("component_name"),
                rs.getLong("coa_id"),rs.getString("coa_desc"),rs.getString("voucher_type"),rs.getString("document_type"),
                rs.getString("voucher_description"),rs.getBoolean("auto_voucher")),companyId,config.voucherClass());
        String company=companyCode(companyId);
        var heads=jdbc.query("""
                SELECT DISTINCT coa_id,l1_code,l2_code,l3_code,l4_code,l5_code,acchead FROM a_acc_head
                WHERE company_code=? ORDER BY coa_id,l1_code,l2_code,l3_code,l4_code,l5_code
                """,(rs,n)->new AccountHeadOption(rs.getLong("coa_id"),rs.getString("l1_code"),rs.getString("l2_code"),
                rs.getString("l3_code"),rs.getString("l4_code"),rs.getString("l5_code"),rs.getString("acchead")),company);
        return new VoucherOptions(setups,heads);
    }

    @Transactional(readOnly=true)
    public List<VoucherSummary> list(UUID companyId,String voucherClass,String number,LocalDate from,LocalDate to,UUID actor){
        var c=config(voucherClass); require(companyId,actor,false);
        return jdbc.query("SELECT id,voucher_number,voucher_date,voucher_type,document_type,particulars,total_debit,status,version FROM "+c.master()+" WHERE organization_id=? AND (? IS NULL OR lower(voucher_number) LIKE lower(?)) AND (? IS NULL OR voucher_date>=?) AND (? IS NULL OR voucher_date<=?) ORDER BY voucher_date DESC,voucher_number DESC",
                (rs,n)->new VoucherSummary(rs.getObject("id",UUID.class),rs.getString("voucher_number"),rs.getDate("voucher_date").toLocalDate(),
                        rs.getString("voucher_type"),rs.getString("document_type"),rs.getString("particulars"),rs.getBigDecimal("total_debit"),rs.getString("status"),rs.getLong("version")),
                companyId,blank(number),blank(number)==null?null:"%"+number.strip()+"%",from,from,to,to);
    }

    @Transactional(readOnly=true)
    public VoucherResponse get(UUID companyId,String voucherClass,UUID id,UUID actor){
        var c=config(voucherClass); require(companyId,actor,false); return find(c,companyId,id);
    }

    @Transactional
    public VoucherResponse create(UUID companyId,String voucherClass,CreateVoucherRequest request,UUID actor){
        return create(companyId,voucherClass,request,null,actor);
    }

    @Transactional
    public VoucherResponse create(UUID companyId,String voucherClass,CreateVoucherRequest request,VoucherPhoto photo,UUID actor){
        var c=config(voucherClass); require(companyId,actor,true);
        var setup=setup(companyId,request.voucherSetupId(),c.voucherClass(),true);
        var totals=validateLines(companyId,setup,request.lines());
        String number=setup.autoVoucher()?allocateNumber(setup,request.voucherDate()):required(request.voucherNumber(),"Voucher number",20);
        UUID id=UUID.randomUUID();
        try{
            jdbc.update("INSERT INTO "+c.master()+" (id,organization_id,voucher_setup_id,branch_id,project_code_id,finance_code_id,component_code_id,coa_id,company_code,company_branch_code,project_code,finance_code,component_code,voucher_number,voucher_date,voucher_class,voucher_type,document_type,particulars,party_code,paid_to,cheque_number,cheque_date,bank_code,bank_branch_code,reference_bill_number,reference_bill_date,month_year,total_debit,total_credit,ins_user) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    id,companyId,setup.id(),setup.branchId(),setup.projectId(),setup.financeId(),setup.componentId(),setup.coaId(),setup.companyCode(),setup.branchCode(),
                    setup.projectId().toString(),setup.financeId().toString(),setup.componentId().toString(),number,request.voucherDate(),c.voucherClass(),setup.voucherType(),setup.documentType(),
                    clean(request.particulars()),clean(request.partyCode()),clean(request.paidTo()),clean(request.chequeNumber()),request.chequeDate(),clean(request.bankCode()),clean(request.bankBranchCode()),
                    clean(request.referenceBillNumber()),request.referenceBillDate(),monthYear(request.voucherDate()),totals.debit(),totals.credit(),actor.toString());
            insertLines(c,companyId,id,setup,request.lines(),actor);
            if(photo!=null) jdbc.update("UPDATE "+c.master()+" SET photo_data=?,photo_name=?,photo_content_type=?,photo_size=? WHERE organization_id=? AND id=?",
                    photo.data(),photo.name(),photo.contentType(),photo.data().length,companyId,id);
        }catch(DataIntegrityViolationException e){throw conflict("Voucher number already exists or an accounting reference is invalid");}
        audit(companyId,actor,"VOUCHER_CREATED",c.voucherClass(),id); return find(c,companyId,id);
    }

    @Transactional
    public VoucherResponse update(UUID companyId,String voucherClass,UUID id,UpdateVoucherRequest request,UUID actor){
        var c=config(voucherClass); require(companyId,actor,true);
        var existing=find(c,companyId,id); if(!"DRAFT".equals(existing.status())) throw conflict("Only draft vouchers can be edited");
        var setup=setup(companyId,existing.voucherSetupId(),c.voucherClass(),false);
        var totals=validateLines(companyId,setup,request.lines());
        int changed=jdbc.update("UPDATE "+c.master()+" SET particulars=?,party_code=?,paid_to=?,cheque_number=?,cheque_date=?,bank_code=?,bank_branch_code=?,reference_bill_number=?,reference_bill_date=?,total_debit=?,total_credit=?,upd_user=?,upd_date=clock_timestamp(),version=version+1 WHERE organization_id=? AND id=? AND status='DRAFT' AND version=?",
                clean(request.particulars()),clean(request.partyCode()),clean(request.paidTo()),clean(request.chequeNumber()),request.chequeDate(),clean(request.bankCode()),clean(request.bankBranchCode()),
                clean(request.referenceBillNumber()),request.referenceBillDate(),totals.debit(),totals.credit(),actor.toString(),companyId,id,request.version());
        if(changed==0) throw conflict("Voucher was changed by another user; reload and try again");
        jdbc.update("DELETE FROM "+c.child()+" WHERE organization_id=? AND voucher_id=?",companyId,id);
        insertLines(c,companyId,id,setup,request.lines(),actor);
        audit(companyId,actor,"VOUCHER_UPDATED",c.voucherClass(),id); return find(c,companyId,id);
    }

    @Transactional
    public void delete(UUID companyId,String voucherClass,UUID id,UUID actor){
        var c=config(voucherClass); require(companyId,actor,true);
        if(jdbc.update("DELETE FROM "+c.master()+" WHERE organization_id=? AND id=? AND status='DRAFT'",companyId,id)==0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Draft voucher was not found");
        audit(companyId,actor,"VOUCHER_DELETED",c.voucherClass(),id);
    }

    @Transactional(readOnly=true)
    public VoucherPhoto photo(UUID companyId,String voucherClass,UUID id,UUID actor){
        var c=config(voucherClass); require(companyId,actor,false);
        var rows=jdbc.query("SELECT photo_data,photo_name,photo_content_type FROM "+c.master()+" WHERE organization_id=? AND id=? AND photo_data IS NOT NULL",
                (rs,n)->new VoucherPhoto(rs.getBytes("photo_data"),rs.getString("photo_name"),rs.getString("photo_content_type")),companyId,id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Voucher photo was not found");
        return rows.getFirst();
    }

    private Totals validateLines(UUID companyId,Setup setup,List<VoucherLineRequest> lines){
        BigDecimal debit=BigDecimal.ZERO,credit=BigDecimal.ZERO; int d=0,c=0;
        for(var line:lines){
            String side=required(line.side(),"Entry side",1).toUpperCase(Locale.ROOT);
            if(!side.equals("D")&&!side.equals("C")) throw bad("Entry side must be D or C");
            Boolean exists=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM a_acc_head WHERE company_code=? AND coa_id=? AND l1_code=? AND l2_code=? AND l3_code=? AND l4_code=? AND l5_code=?)",Boolean.class,
                    setup.companyCode(),setup.coaId(),line.l1Code(),line.l2Code(),line.l3Code(),line.l4Code(),line.l5Code());
            if(!Boolean.TRUE.equals(exists)) throw bad("Select an existing account head from the voucher Initial COA");
            if(side.equals("D")){debit=debit.add(line.amount());d++;}else{credit=credit.add(line.amount());c++;}
        }
        debit=debit.setScale(2);credit=credit.setScale(2);
        if(d==0||c==0) throw bad("Add at least one debit and one credit entry");
        if(debit.compareTo(credit)!=0) throw bad("Total debit and total credit must be equal");
        return new Totals(debit,credit);
    }

    private void insertLines(Config c,UUID companyId,UUID voucherId,Setup setup,List<VoucherLineRequest> lines,UUID actor){
        for(int i=0;i<lines.size();i++){var line=lines.get(i);
            jdbc.update("INSERT INTO "+c.child()+" (organization_id,voucher_id,line_number,entry_side,company_code,coa_id,l1_code,l2_code,l3_code,l4_code,l5_code,particulars,amount,auto_voucher_flag,bank_code,bank_branch_code,cheque_number,cheque_date,ins_user) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    companyId,voucherId,i+1,line.side().strip().toUpperCase(Locale.ROOT),setup.companyCode(),setup.coaId(),line.l1Code().strip(),line.l2Code().strip(),line.l3Code().strip(),line.l4Code().strip(),line.l5Code().strip(),clean(line.particulars()),line.amount().setScale(2),setup.autoVoucher()?"Y":"N",clean(line.bankCode()),clean(line.bankBranchCode()),clean(line.chequeNumber()),line.chequeDate(),actor.toString());
        }
    }

    private String allocateNumber(Setup setup,LocalDate date){
        Long next=jdbc.queryForObject("INSERT INTO a_voucher_daily_sequence(voucher_setup_id,voucher_date,last_number) VALUES (?,?,1) ON CONFLICT(voucher_setup_id,voucher_date) DO UPDATE SET last_number=a_voucher_daily_sequence.last_number+1 RETURNING last_number",Long.class,setup.id(),date);
        jdbc.update("UPDATE a_vr_type SET voucher_last_no=?,voucher_last_date=?,upd_date=clock_timestamp() WHERE id=?",next,date,setup.id());
        return NUMBER_DATE.format(date)+"/"+String.format(Locale.ROOT,"%02d",next);
    }

    private Setup setup(UUID companyId,UUID id,String voucherClass,boolean lock){
        var rows=jdbc.query("SELECT id,branch_id,project_code_id,finance_code_id,component_code_id,coa_id,company_code,company_branch_code,voucher_type,document_type,auto_voucher FROM a_vr_type WHERE organization_id=? AND id=? AND voucher_class=?"+(lock?" FOR UPDATE":""),
                (rs,n)->new Setup(rs.getObject("id",UUID.class),rs.getObject("branch_id",UUID.class),rs.getInt("project_code_id"),rs.getInt("finance_code_id"),rs.getInt("component_code_id"),rs.getLong("coa_id"),rs.getString("company_code"),rs.getString("company_branch_code"),rs.getString("voucher_type"),rs.getString("document_type"),rs.getBoolean("auto_voucher")),companyId,id,voucherClass);
        if(rows.isEmpty()) throw bad("Select a Voucher Control Setup matching this voucher class and company"); return rows.getFirst();
    }

    private VoucherResponse find(Config c,UUID companyId,UUID id){
        var rows=jdbc.query("SELECT v.*,b.code branch_display_code,b.name branch_name,p.name project_name,f.name finance_name,cc.name component_name,coa.coa_desc FROM "+c.master()+" v JOIN branches b ON b.id=v.branch_id AND b.organization_id=v.organization_id JOIN project_codes p ON p.id=v.project_code_id AND p.organization_id=v.organization_id JOIN finance_codes f ON f.id=v.finance_code_id AND f.project_code_id=v.project_code_id AND f.organization_id=v.organization_id JOIN component_codes cc ON cc.id=v.component_code_id AND cc.organization_id=v.organization_id JOIN a_coa coa ON coa.coa_id=v.coa_id WHERE v.organization_id=? AND v.id=?",
                (rs,n)->mapVoucher(c,rs),companyId,id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Voucher was not found"); return rows.getFirst();
    }

    private VoucherResponse mapVoucher(Config c,ResultSet rs)throws SQLException{
        UUID id=rs.getObject("id",UUID.class);UUID org=rs.getObject("organization_id",UUID.class);
        var lines=jdbc.query("SELECT l.*,h.acchead FROM "+c.child()+" l JOIN a_acc_head h ON h.company_code=l.company_code AND h.coa_id=l.coa_id AND h.l1_code=l.l1_code AND h.l2_code=l.l2_code AND h.l3_code=l.l3_code AND h.l4_code=l.l4_code AND h.l5_code=l.l5_code WHERE l.organization_id=? AND l.voucher_id=? ORDER BY l.line_number",
                (lr,n)->new VoucherLineResponse(lr.getObject("id",UUID.class),lr.getInt("line_number"),lr.getString("entry_side"),lr.getString("l1_code"),lr.getString("l2_code"),lr.getString("l3_code"),lr.getString("l4_code"),lr.getString("l5_code"),lr.getString("acchead"),lr.getString("particulars"),lr.getBigDecimal("amount"),lr.getString("bank_code"),lr.getString("bank_branch_code"),lr.getString("cheque_number"),date(lr,"cheque_date")),org,id);
        var photo=rs.getBytes("photo_data")==null?null:new VoucherPhotoMetadata(rs.getString("photo_name"),rs.getString("photo_content_type"),rs.getInt("photo_size"));
        return new VoucherResponse(id,org,rs.getObject("voucher_setup_id",UUID.class),rs.getObject("branch_id",UUID.class),rs.getString("branch_display_code"),rs.getString("branch_name"),rs.getInt("project_code_id"),rs.getString("project_name"),rs.getInt("finance_code_id"),rs.getString("finance_name"),rs.getInt("component_code_id"),rs.getString("component_name"),rs.getLong("coa_id"),rs.getString("coa_desc"),rs.getString("voucher_number"),date(rs,"voucher_date"),rs.getString("voucher_class"),rs.getString("voucher_type"),rs.getString("document_type"),rs.getString("particulars"),rs.getString("party_code"),rs.getString("paid_to"),rs.getString("cheque_number"),date(rs,"cheque_date"),rs.getString("bank_code"),rs.getString("bank_branch_code"),rs.getString("reference_bill_number"),date(rs,"reference_bill_date"),rs.getString("status"),rs.getBigDecimal("total_debit"),rs.getBigDecimal("total_credit"),lines,photo,rs.getString("ins_user"),instant(rs.getTimestamp("ins_date")),rs.getString("upd_user"),instant(rs.getTimestamp("upd_date")),rs.getLong("version"));
    }

    private void require(UUID company,UUID actor,boolean write){access.requireCompanyPermission(actor,company,write?new String[]{"journal.create"}:new String[]{"journal.read","journal.create"});}
    private String companyCode(UUID company){var rows=jdbc.queryForList("SELECT code FROM organizations WHERE id=?",String.class,company);if(rows.isEmpty())throw bad("Company not found");return rows.getFirst();}
    private void audit(UUID company,UUID actor,String action,String type,UUID id){jdbc.update("INSERT INTO audit_events(organization_id,actor_user_id,action,entity_type,entity_id) VALUES (?,?,?,?,?)",company,actor,action,type+"_VOUCHER",id.toString());}
    private static Config config(String value){var c=CONFIGS.get(value.toLowerCase(Locale.ROOT));if(c==null)throw bad("Voucher class must be debit, credit, or journal");return c;}
    private static String required(String value,String label,int max){String v=clean(value);if(v==null)throw bad(label+" is required");if(v.length()>max)throw bad(label+" is too long");return v;}
    private static String clean(String v){return v==null||v.isBlank()?null:v.strip();}
    private static String blank(String v){return clean(v);}
    private static String monthYear(LocalDate d){return "%02d/%04d".formatted(d.getMonthValue(),d.getYear());}
    private static LocalDate date(ResultSet rs,String name)throws SQLException{java.sql.Date d=rs.getDate(name);return d==null?null:d.toLocalDate();}
    private static java.time.Instant instant(Timestamp t){return t==null?null:t.toInstant();}
    private static ResponseStatusException bad(String m){return new ResponseStatusException(HttpStatus.BAD_REQUEST,m);}
    private static ResponseStatusException conflict(String m){return new ResponseStatusException(HttpStatus.CONFLICT,m);}
    private record Config(String voucherClass,String master,String child){}
    private record Setup(UUID id,UUID branchId,Integer projectId,Integer financeId,Integer componentId,Long coaId,String companyCode,String branchCode,String voucherType,String documentType,boolean autoVoucher){}
    private record Totals(BigDecimal debit,BigDecimal credit){}
    public record VoucherPhoto(byte[] data,String name,String contentType){}
}
