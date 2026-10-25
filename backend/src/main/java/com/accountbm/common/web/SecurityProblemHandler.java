package com.accountbm.common.web;

import java.io.IOException;
import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class SecurityProblemHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
    private static final Logger log = LoggerFactory.getLogger(SecurityProblemHandler.class);

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        log.warn("Authentication required: method={} path={} reason={}",
                request.getMethod(), request.getRequestURI(), exception.getMessage());
        write(response, request, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required",
                "A valid access token is required", "authentication-required");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException exception) throws IOException {
        log.warn("Access denied by security filter: method={} path={} reason={}",
                request.getMethod(), request.getRequestURI(), exception.getMessage());
        write(response, request, HttpServletResponse.SC_FORBIDDEN, "Access denied",
                "You do not have permission to perform this action", "access-denied");
    }

    private static void write(HttpServletResponse response, HttpServletRequest request, int status,
                              String title, String detail, String type) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.getWriter().write("""
                {"type":"urn:account-bm:problem:%s","title":"%s","status":%d,"detail":"%s","instance":"%s","timestamp":"%s"}
                """.formatted(type, escape(title), status, escape(detail), escape(request.getRequestURI()), Instant.now()));
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
