package com.accountbm.identity.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginRateLimitService {
    private static final int MAX_ATTEMPTS=10;
    private final JdbcTemplate jdbc;
    public LoginRateLimitService(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public void check(String email,String ip){
        checkKey(key("email",email));
        checkKey(key("ip",ip));
    }
    public void failure(String email,String ip){
        increment(key("email",email));
        increment(key("ip",ip));
    }
    public void success(String email){jdbc.update("DELETE FROM login_rate_limits WHERE limit_key=?",key("email",email));}

    private void checkKey(String key){
        Boolean blocked=jdbc.queryForObject("SELECT coalesce((SELECT blocked_until>clock_timestamp() FROM login_rate_limits WHERE limit_key=?),false)",Boolean.class,key);
        if(Boolean.TRUE.equals(blocked))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many sign-in attempts; try again later");
    }
    private void increment(String key){
        jdbc.update("""
                INSERT INTO login_rate_limits(limit_key,window_started,attempts,blocked_until)
                VALUES(?,clock_timestamp(),1,NULL)
                ON CONFLICT(limit_key) DO UPDATE SET
                  attempts=CASE WHEN login_rate_limits.window_started<clock_timestamp()-interval '15 minutes' THEN 1 ELSE login_rate_limits.attempts+1 END,
                  window_started=CASE WHEN login_rate_limits.window_started<clock_timestamp()-interval '15 minutes' THEN clock_timestamp() ELSE login_rate_limits.window_started END,
                  blocked_until=CASE WHEN (CASE WHEN login_rate_limits.window_started<clock_timestamp()-interval '15 minutes' THEN 1 ELSE login_rate_limits.attempts+1 END)>=?
                    THEN clock_timestamp()+interval '15 minutes' ELSE login_rate_limits.blocked_until END,
                  updated_at=clock_timestamp()
                """,key,MAX_ATTEMPTS);
    }
    private static String key(String type,String value){
        try{
            var bytes=MessageDigest.getInstance("SHA-256").digest((type+":"+(value==null?"":value)).getBytes(StandardCharsets.UTF_8));
            return type+":"+HexFormat.of().formatHex(bytes);
        }catch(Exception exception){throw new IllegalStateException(exception);}
    }
}

