package com.accountbm.identity.security;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SecurityVersionFilter extends OncePerRequestFilter {
    private final JdbcTemplate jdbc;
    public SecurityVersionFilter(JdbcTemplate jdbc) { this.jdbc=jdbc; }

    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication!=null&&authentication.isAuthenticated()&&authentication.getPrincipal() instanceof Jwt jwt){
            var claimed=jwt.getClaimAsString("security_version");
            var sessionId=jwt.getClaimAsString("sid");
            var rows=jdbc.query("SELECT security_version FROM user_profiles WHERE id=? AND status='ACTIVE'",
                    (rs,n)->rs.getLong(1),UUID.fromString(jwt.getSubject()));
            var activeSession=sessionId!=null&&Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM refresh_tokens
                    WHERE family_id=? AND user_id=? AND revoked_at IS NULL AND expires_at>clock_timestamp())
                    """,Boolean.class,UUID.fromString(sessionId),UUID.fromString(jwt.getSubject())));
            if(rows.isEmpty()||claimed==null||Long.parseLong(claimed)!=rows.getFirst()||!activeSession){
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/problem+json");
                response.getWriter().write("{\"type\":\"urn:account-bm:problem:session-revoked\",\"title\":\"Session revoked\",\"status\":401,\"detail\":\"This session is no longer valid\"}");
                return;
            }
        }
        chain.doFilter(request,response);
    }
}

