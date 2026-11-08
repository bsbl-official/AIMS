package com.accountbm.identity.service;

import static com.accountbm.identity.dto.IdentityDtos.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationService authenticationService;

    public ProfileService(JdbcTemplate jdbc,PasswordEncoder passwordEncoder,AuthenticationService authenticationService){
        this.jdbc=jdbc;this.passwordEncoder=passwordEncoder;this.authenticationService=authenticationService;
    }

    @Transactional(readOnly=true)
    public ProfileResponse profile(UUID userId){
        var rows=jdbc.query("""
                SELECT id,email,display_name,status,super_admin,date_of_birth,gender,phone,address,
                       profile_photo_data IS NOT NULL photo_available,profile_photo_version,version
                FROM user_profiles WHERE id=?
                """,(rs,n)->new ProfileCore(rs.getObject("id",UUID.class),rs.getString("email"),rs.getString("display_name"),
                rs.getString("status"),rs.getBoolean("super_admin"),rs.getDate("date_of_birth")==null?null:rs.getDate("date_of_birth").toLocalDate(),
                rs.getString("gender"),rs.getString("phone"),rs.getString("address"),rs.getBoolean("photo_available"),
                rs.getLong("profile_photo_version"),rs.getLong("version")),userId);
        if(rows.isEmpty())throw notFound();var profile=rows.getFirst();
        var accessScope=profile.superAdmin()?"GLOBAL":"ASSIGNED";
        var organizations=profile.superAdmin()?globalOrganizations():authenticationService.currentUser(userId).organizations();
        return new ProfileResponse(profile.id(),profile.email(),profile.displayName(),profile.status(),profile.dateOfBirth(),profile.gender(),profile.phone(),profile.address(),profile.photoAvailable(),profile.photoVersion(),accessScope,organizations,profile.version());
    }

    @Transactional
    public ProfileResponse update(UUID userId,UpdateProfileRequest request,ProfilePhoto replacement){
        validate(request);
        String name=request.displayName().strip(),phone=clean(request.phone()),address=clean(request.address());
        String gender=request.gender().strip().toUpperCase(Locale.ROOT);
        boolean photoChanged=replacement!=null||request.removePhoto();
        int changed;
        if(replacement!=null){
            changed=jdbc.update("""
                    UPDATE user_profiles SET display_name=?,date_of_birth=?,gender=?,phone=?,address=?,
                        profile_photo_data=?,profile_photo_name=?,profile_photo_content_type=?,profile_photo_size=?,
                        profile_photo_version=profile_photo_version+1,updated_at=clock_timestamp(),version=version+1
                    WHERE id=? AND version=?
                    """,name,request.dateOfBirth(),gender,phone,address,replacement.data(),replacement.name(),replacement.contentType(),replacement.data().length,userId,request.version());
        }else if(request.removePhoto()){
            changed=jdbc.update("""
                    UPDATE user_profiles SET display_name=?,date_of_birth=?,gender=?,phone=?,address=?,
                        profile_photo_data=NULL,profile_photo_name=NULL,profile_photo_content_type=NULL,profile_photo_size=NULL,
                        profile_photo_version=profile_photo_version+1,updated_at=clock_timestamp(),version=version+1
                    WHERE id=? AND version=?
                    """,name,request.dateOfBirth(),gender,phone,address,userId,request.version());
        }else{
            changed=jdbc.update("""
                    UPDATE user_profiles SET display_name=?,date_of_birth=?,gender=?,phone=?,address=?,
                        updated_at=clock_timestamp(),version=version+1 WHERE id=? AND version=?
                    """,name,request.dateOfBirth(),gender,phone,address,userId,request.version());
        }
        if(changed==0){
            Boolean exists=jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id=?)",Boolean.class,userId);
            if(!Boolean.TRUE.equals(exists))throw notFound();
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Profile was changed in another session; reload and try again");
        }
        audit(userId,photoChanged?"PROFILE_AND_PHOTO_UPDATED":"PROFILE_UPDATED");
        return profile(userId);
    }

    @Transactional(readOnly=true)
    public ProfilePhoto photo(UUID userId){
        var rows=jdbc.query("SELECT profile_photo_data,profile_photo_name,profile_photo_content_type FROM user_profiles WHERE id=? AND profile_photo_data IS NOT NULL",
                (rs,n)->new ProfilePhoto(rs.getBytes(1),rs.getString(2),rs.getString(3)),userId);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Profile image was not found");return rows.getFirst();
    }

    @Transactional
    public void changePassword(UUID userId,ChangePasswordRequest request){
        var rows=jdbc.queryForList("SELECT password_hash FROM user_profiles WHERE id=? AND status='ACTIVE'",String.class,userId);
        if(rows.isEmpty())throw notFound();
        String hash=rows.getFirst();
        if(hash==null||!passwordEncoder.matches(request.currentPassword(),hash))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Current password is incorrect");
        if(passwordEncoder.matches(request.newPassword(),hash))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"New password must be different from the current password");
        jdbc.update("UPDATE user_profiles SET password_hash=?,password_changed_at=clock_timestamp(),failed_login_attempts=0,locked_until=NULL,updated_at=clock_timestamp(),version=version+1 WHERE id=?",passwordEncoder.encode(request.newPassword()),userId);
        jdbc.update("UPDATE refresh_tokens SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE user_id=?",userId);
        audit(userId,"PASSWORD_CHANGED");
    }

    private static void validate(UpdateProfileRequest request){
        if(request.dateOfBirth()!=null&&request.dateOfBirth().isAfter(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Date of birth cannot be in the future");
        String gender=request.gender().strip().toUpperCase(Locale.ROOT);
        if(!Set.of("MALE","FEMALE","PREFER_NOT_TO_SAY").contains(gender))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Select a valid gender");
        String phone=clean(request.phone());
        if(phone!=null&&!phone.matches("^[+0-9() .-]{7,25}$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a valid phone number");
    }
    private List<OrganizationAccess> globalOrganizations(){
        var organizations=new LinkedHashMap<UUID,GlobalAccessBuilder>();
        jdbc.query("""
                SELECT id,code,legal_name
                FROM organizations
                WHERE status='ACTIVE'
                ORDER BY legal_name
                """,(org.springframework.jdbc.core.RowCallbackHandler)rs->{
            var id=rs.getObject("id",UUID.class);
            organizations.put(id,new GlobalAccessBuilder(id,rs.getString("code"),rs.getString("legal_name")));
        });
        jdbc.query("""
                SELECT branch.id,branch.organization_id,branch.code,branch.name,branch.branch_type
                FROM branches branch
                JOIN organizations organization ON organization.id=branch.organization_id
                WHERE organization.status='ACTIVE' AND branch.status='ACTIVE'
                ORDER BY organization.legal_name,branch.name
                """,(org.springframework.jdbc.core.RowCallbackHandler)rs->{
            var organization=organizations.get(rs.getObject("organization_id",UUID.class));
            if(organization!=null)organization.branches.add(new BranchSummary(rs.getObject("id",UUID.class),rs.getString("code"),rs.getString("name"),rs.getString("branch_type")));
        });
        return organizations.values().stream().map(GlobalAccessBuilder::build).toList();
    }
    private void audit(UUID userId,String action){jdbc.update("INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id) VALUES(?,?, 'USER_PROFILE',?)",userId,action,userId.toString());}
    private static String clean(String value){return value==null||value.isBlank()?null:value.strip();}
    private static ResponseStatusException notFound(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"User profile was not found");}
    private record ProfileCore(UUID id,String email,String displayName,String status,boolean superAdmin,LocalDate dateOfBirth,String gender,String phone,String address,boolean photoAvailable,long photoVersion,long version){}
    private static final class GlobalAccessBuilder{
        private final UUID id;
        private final String code;
        private final String name;
        private final List<BranchSummary> branches=new ArrayList<>();
        private GlobalAccessBuilder(UUID id,String code,String name){this.id=id;this.code=code;this.name=name;}
        private OrganizationAccess build(){return new OrganizationAccess(id,code,name,List.of(),List.copyOf(branches));}
    }
    public record ProfilePhoto(byte[] data,String name,String contentType){}
}
