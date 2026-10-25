package com.accountbm.common.web;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var problem = problem(HttpStatus.BAD_REQUEST, "Invalid request", "Request validation failed", "validation", request);
        var errors = new LinkedHashMap<String, String>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        problem.setProperty("errors", errors);
        log.debug("Request validation failed: method={} path={} errors={}", request.getMethod(), request.getRequestURI(), errors);
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail handleConstraintValidation(ConstraintViolationException exception, HttpServletRequest request) {
        var problem = problem(HttpStatus.BAD_REQUEST, "Invalid request", "One or more values are invalid", "constraint-validation", request);
        var errors = new LinkedHashMap<String, String>();
        exception.getConstraintViolations().forEach(violation ->
                errors.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        problem.setProperty("errors", errors);
        log.debug("Constraint validation failed: method={} path={} errors={}", request.getMethod(), request.getRequestURI(), errors);
        return problem;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail handleUnreadableBody(HttpMessageNotReadableException exception, HttpServletRequest request) {
        log.debug("Malformed request body: method={} path={}", request.getMethod(), request.getRequestURI(), exception);
        return problem(HttpStatus.BAD_REQUEST, "Invalid request body",
                "The request body is missing or contains invalid JSON", "malformed-json", request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ProblemDetail handleMissingParameter(MissingServletRequestParameterException exception, HttpServletRequest request) {
        log.debug("Missing request parameter: method={} path={} parameter={}",
                request.getMethod(), request.getRequestURI(), exception.getParameterName());
        return problem(HttpStatus.BAD_REQUEST, "Missing request parameter",
                exception.getParameterName() + " is required", "missing-parameter", request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail handleResponseStatus(ResponseStatusException exception, HttpServletRequest request) {
        var status = HttpStatus.resolve(exception.getStatusCode().value());
        var resolvedStatus = status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status;
        if (resolvedStatus.is5xxServerError()) {
            log.error("Application error: method={} path={} status={}",
                    request.getMethod(), request.getRequestURI(), resolvedStatus.value(), exception);
        } else {
            log.warn("Request rejected: method={} path={} status={} reason={}", request.getMethod(),
                    request.getRequestURI(), resolvedStatus.value(), exception.getReason());
        }
        return problem(resolvedStatus, resolvedStatus.getReasonPhrase(),
                exception.getReason() == null ? resolvedStatus.getReasonPhrase() : exception.getReason(),
                "request-rejected", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        log.warn("Access denied: method={} path={} message={}", request.getMethod(), request.getRequestURI(), exception.getMessage());
        return problem(HttpStatus.FORBIDDEN, "Access denied",
                "You do not have permission to perform this action", "access-denied", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataIntegrity(DataIntegrityViolationException exception, HttpServletRequest request) {
        var errorId = UUID.randomUUID().toString();
        log.error("Database integrity error: errorId={} method={} path={} mostSpecificCause={}", errorId,
                request.getMethod(), request.getRequestURI(), exception.getMostSpecificCause().getMessage(), exception);
        var problem = problem(HttpStatus.CONFLICT, "Data conflict",
                "The operation conflicts with existing or related data", "data-integrity", request);
        problem.setProperty("errorId", errorId);
        return problem;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception exception, HttpServletRequest request) {
        var errorId = UUID.randomUUID().toString();
        log.error("Unexpected API error: errorId={} method={} path={}",
                errorId, request.getMethod(), request.getRequestURI(), exception);
        var problem = problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error",
                "The request could not be completed. Use the error ID to locate the server log entry.",
                "internal-error", request);
        problem.setProperty("errorId", errorId);
        return problem;
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail, String type, HttpServletRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create("urn:account-bm:problem:" + type));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", java.time.Instant.now());
        return problem;
    }
}
