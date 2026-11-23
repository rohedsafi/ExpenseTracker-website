package com.example.ExpanseProject.Service;

import com.example.ExpanseProject.Model.AppUser;
import com.example.ExpanseProject.Repository.AppUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AppUserService implements UserDetailsService {
    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AppUserService(AppUserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public AppUser register(String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (repository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyRegisteredException();
        }
        return repository.save(new AppUser(normalizedEmail, passwordEncoder.encode(password)));
    }

    public AppUser findByEmail(String email) {
        return repository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Account not found"));
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        AppUser appUser = findByEmail(email);
        return User
                .withUsername(appUser.getEmail())
                .password(appUser.getPasswordHash())
                .roles("USER")
                .build();
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
