package com.accountbm.identity.service;

import static com.accountbm.identity.dto.MfaDtos.*;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MfaService {
    private static final String BASE32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random=new SecureRandom();
    private final byte[] encryptionKey;
    private final String issuer;

    public MfaService(JdbcTemplate jdbc,PasswordEncoder passwordEncoder,
            @Value("${app.mfa.encryption-key}") String encryptionKey,
            @Value("${app.jwt.issuer}") String issuer){
        this.jdbc=jdbc;this.passwordEncoder=passwordEncoder;this.issuer=issuer;
        this.encryptionKey=sha256(encryptionKey.getBytes(StandardCharsets.UTF_8));
    }

    @Transactional
    public EnrollmentStart begin(UUID userId){
        var rows=jdbc.query("SELECT email,mfa_enabled_at IS NOT NULL enabled FROM user_profiles WHERE id=? AND status='ACTIVE'",
                (rs,n)->new UserMfa(rs.getString("email"),rs.getBoolean("enabled"),null),userId);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"User was not found");
        if(rows.getFirst().enabled())throw new ResponseStatusException(HttpStatus.CONFLICT,"Multi-factor authentication is already enabled");
        byte[] secret=new byte[20];random.nextBytes(secret);
        jdbc.update("UPDATE user_profiles SET totp_secret_ciphertext=?,updated_at=clock_timestamp() WHERE id=?",encrypt(secret),userId);
        String encoded=base32(secret);
        String label=encode(issuer+":"+rows.getFirst().email());
        return new EnrollmentStart(encoded,"otpauth://totp/"+label+"?secret="+encoded+"&issuer="+encode(issuer)+"&algorithm=SHA1&digits=6&period=30");
    }

    @Transactional
    public EnrollmentComplete confirm(UUID userId,String code){
        var secret=secret(userId,false);
        if(!validTotp(secret,code,Instant.now()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The verification code is invalid");
        jdbc.update("UPDATE user_profiles SET mfa_enabled_at=clock_timestamp(),security_version=security_version+1,updated_at=clock_timestamp() WHERE id=?",userId);
        jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=?",userId);
        var recovery=new ArrayList<String>();
        for(int i=0;i<10;i++){
            byte[] value=new byte[8];random.nextBytes(value);String raw=HexFormat.of().formatHex(value).toUpperCase(Locale.ROOT);
            String displayed=raw.substring(0,4)+"-"+raw.substring(4,8)+"-"+raw.substring(8,12)+"-"+raw.substring(12);
            recovery.add(displayed);
            jdbc.update("INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES(?,?)",userId,hashRecovery(displayed));
        }
        jdbc.update("INSERT INTO security_events(user_id,event_type) VALUES(?,'MFA_ENABLED')",userId);
        return new EnrollmentComplete(List.copyOf(recovery));
    }

    @Transactional(noRollbackFor=ResponseStatusException.class)
    public boolean verifyForLogin(UUID userId,String code){
        var rows=jdbc.query("SELECT totp_secret_ciphertext,mfa_enabled_at IS NOT NULL enabled FROM user_profiles WHERE id=?",
                (rs,n)->new UserMfa(null,rs.getBoolean("enabled"),rs.getBytes("totp_secret_ciphertext")),userId);
        if(rows.isEmpty()||!rows.getFirst().enabled())return false;
        if(code==null||code.isBlank())throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,"MFA_REQUIRED");
        var item=rows.getFirst();
        if(validTotp(decrypt(item.ciphertext()),code,Instant.now()))return true;
        int used=jdbc.update("""
                UPDATE mfa_recovery_codes SET used_at=clock_timestamp()
                WHERE user_id=? AND code_hash=? AND used_at IS NULL
                """,userId,hashRecovery(code));
        if(used==1){
            jdbc.update("INSERT INTO security_events(user_id,event_type) VALUES(?,'MFA_RECOVERY_CODE_USED')",userId);
            return true;
        }
        jdbc.update("INSERT INTO security_events(user_id,event_type) VALUES(?,'MFA_FAILURE')",userId);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email, password, or verification code");
    }

    @Transactional
    public void disable(UUID userId,String password,String code){
        var hashes=jdbc.queryForList("SELECT password_hash FROM user_profiles WHERE id=? AND status='ACTIVE'",String.class,userId);
        if(hashes.isEmpty()||!passwordEncoder.matches(password,hashes.getFirst()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Current password is incorrect");
        verifyForLogin(userId,code);
        jdbc.update("UPDATE user_profiles SET mfa_enabled_at=NULL,totp_secret_ciphertext=NULL,security_version=security_version+1,updated_at=clock_timestamp() WHERE id=?",userId);
        jdbc.update("DELETE FROM mfa_recovery_codes WHERE user_id=?",userId);
        jdbc.update("UPDATE refresh_tokens SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE user_id=?",userId);
        jdbc.update("INSERT INTO security_events(user_id,event_type) VALUES(?,'MFA_DISABLED')",userId);
    }

    private byte[] secret(UUID userId,boolean requireEnabled){
        var rows=jdbc.query("SELECT totp_secret_ciphertext,mfa_enabled_at IS NOT NULL enabled FROM user_profiles WHERE id=?",
                (rs,n)->new UserMfa(null,rs.getBoolean("enabled"),rs.getBytes("totp_secret_ciphertext")),userId);
        if(rows.isEmpty()||rows.getFirst().ciphertext()==null||requireEnabled&&!rows.getFirst().enabled())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Begin MFA enrollment first");
        return decrypt(rows.getFirst().ciphertext());
    }

    static boolean validTotp(byte[] secret,String value,Instant now){
        String normalized=value==null?"":value.replaceAll("[^0-9]","");if(normalized.length()!=6)return false;
        long expected=Long.parseLong(normalized);long counter=now.getEpochSecond()/30;
        for(long offset=-1;offset<=1;offset++)if(totp(secret,counter+offset)==expected)return true;
        return false;
    }
    private static int totp(byte[] secret,long counter){
        try{var mac=Mac.getInstance("HmacSHA1");mac.init(new SecretKeySpec(secret,"HmacSHA1"));
            byte[] hash=mac.doFinal(ByteBuffer.allocate(8).putLong(counter).array());int offset=hash[hash.length-1]&15;
            int binary=((hash[offset]&127)<<24)|((hash[offset+1]&255)<<16)|((hash[offset+2]&255)<<8)|(hash[offset+3]&255);
            return binary%1_000_000;}catch(Exception exception){throw new IllegalStateException(exception);}
    }
    private byte[] encrypt(byte[] clear){
        try{byte[] iv=new byte[12];random.nextBytes(iv);var cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,iv));
            byte[] encrypted=cipher.doFinal(clear);return ByteBuffer.allocate(iv.length+encrypted.length).put(iv).put(encrypted).array();
        }catch(Exception exception){throw new IllegalStateException(exception);}
    }
    private byte[] decrypt(byte[] value){
        try{byte[] iv=java.util.Arrays.copyOfRange(value,0,12),encrypted=java.util.Arrays.copyOfRange(value,12,value.length);
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,iv));
            return cipher.doFinal(encrypted);}catch(Exception exception){throw new IllegalStateException("MFA secret cannot be decrypted",exception);}
    }
    private static String base32(byte[] data){
        var result=new StringBuilder();int buffer=0,bits=0;
        for(byte b:data){buffer=(buffer<<8)|(b&255);bits+=8;while(bits>=5){result.append(BASE32.charAt((buffer>>(bits-5))&31));bits-=5;}}
        if(bits>0)result.append(BASE32.charAt((buffer<<(5-bits))&31));return result.toString();
    }
    private static String hashRecovery(String value){return HexFormat.of().formatHex(sha256(value.replace("-","").strip().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)));}
    private static byte[] sha256(byte[] value){try{return MessageDigest.getInstance("SHA-256").digest(value);}catch(Exception exception){throw new IllegalStateException(exception);}}
    private static String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8).replace("+","%20");}
    private record UserMfa(String email,boolean enabled,byte[] ciphertext){}
}

