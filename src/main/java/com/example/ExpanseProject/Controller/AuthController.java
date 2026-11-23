package com.example.ExpanseProject.Controller;

import com.example.ExpanseProject.Service.AppUserService;
import com.example.ExpanseProject.Service.EmailAlreadyRegisteredException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final AppUserService appUserService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AppUserService appUserService,
                          AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository) {
        this.appUserService = appUserService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @GetMapping("/me")
    public Map<String, String> currentUser(Authentication authentication) {
        return Map.of("email", authentication.getName());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Credentials credentials,
                                      HttpServletRequest request,
                                      HttpServletResponse response) {
        String invalidReason = validate(credentials);
        if (invalidReason != null) {
            return ResponseEntity.badRequest().body(Map.of("error", invalidReason));
        }

        try {
            appUserService.register(credentials.email(), credentials.password());
        } catch (EmailAlreadyRegisteredException | DataIntegrityViolationException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "An account with this email already exists."));
        }
        return authenticate(credentials, request, response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Credentials credentials,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        if (credentials == null || credentials.email() == null || credentials.password() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }
        if (credentials.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must not exceed 72 UTF-8 bytes."));
        }
        return authenticate(credentials, request, response);
    }

    private ResponseEntity<?> authenticate(Credentials credentials,
                                           HttpServletRequest request,
                                           HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            AppUserService.normalizeEmail(credentials.email()), credentials.password()));
            request.getSession(true);
            request.changeSessionId();
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            return ResponseEntity.ok(Map.of("email", authentication.getName()));
        } catch (BadCredentialsException exception) {
            SecurityContextHolder.clearContext();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Email or password is incorrect."));
        }
    }

    private String validate(Credentials credentials) {
        if (credentials == null || credentials.email() == null || credentials.password() == null) {
            return "Email and password are required.";
        }
        String email = credentials.email().trim();
        if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
            return "Enter a valid email address.";
        }
        if (credentials.password().length() < 8
                || credentials.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            return "Password must be at least 8 characters and no more than 72 UTF-8 bytes.";
        }
        return null;
    }

    public record Credentials(String email, String password) {
    }
}
