package com.accountbm.identity.web;

import static com.accountbm.identity.dto.IdentityDtos.*;
import static com.accountbm.identity.web.AuthenticationController.ACCESS_TOKEN_COOKIE;
import static com.accountbm.identity.web.AuthenticationController.REFRESH_TOKEN_COOKIE;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import com.accountbm.identity.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final ProfileService service;
    private final boolean secureCookies;
    private final String sameSite;
    public ProfileController(ProfileService service,@Value("${app.auth-cookie.secure}") boolean secureCookies,@Value("${app.auth-cookie.same-site}") String sameSite){
        this.service=service;this.secureCookies=secureCookies;this.sameSite=sameSite;
    }

    @GetMapping
    public ProfileResponse profile(@AuthenticationPrincipal Jwt jwt){return service.profile(actor(jwt));}

    @PatchMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileResponse update(@Valid @RequestPart("profile") UpdateProfileRequest request,
            @RequestPart(value="photo",required=false) MultipartFile photo,@AuthenticationPrincipal Jwt jwt){
        return service.update(actor(jwt),request,validatedPhoto(photo));
    }

    @GetMapping("/photo")
    public ResponseEntity<byte[]> photo(@AuthenticationPrincipal Jwt jwt){
        var photo=service.photo(actor(jwt));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\""+photo.name().replace("\"","")+"\"")
                .contentLength(photo.data().length).body(photo.data());
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,@AuthenticationPrincipal Jwt jwt){
        service.changePassword(actor(jwt),request);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE,clearCookie(ACCESS_TOKEN_COOKIE,"/api").toString())
                .header(HttpHeaders.SET_COOKIE,clearCookie(REFRESH_TOKEN_COOKIE,"/api/auth").toString()).build();
    }

    private ProfileService.ProfilePhoto validatedPhoto(MultipartFile file){
        if(file==null||file.isEmpty())return null;
        if(file.getSize()>2L*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Profile image must not exceed 2 MB");
        String type=file.getContentType();
        if(!List.of("image/jpeg","image/png","image/webp").contains(type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Profile image must be JPEG, PNG, or WebP");
        try{
            byte[] data=file.getBytes();
            if(!matchesSignature(data,type))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Profile image content does not match its file type");
            String name=java.util.Optional.ofNullable(file.getOriginalFilename()).orElse("profile-image").replace('\\','/');
            name=name.substring(name.lastIndexOf('/')+1);if(name.length()>255)name=name.substring(name.length()-255);
            return new ProfileService.ProfilePhoto(data,name,type);
        }catch(IOException exception){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Profile image could not be read",exception);}
    }
    private static boolean matchesSignature(byte[] b,String type){
        if("image/jpeg".equals(type))return b.length>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255;
        if("image/png".equals(type))return b.length>=8&&(b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71&&b[4]==13&&b[5]==10&&b[6]==26&&b[7]==10;
        return b.length>=12&&b[0]=='R'&&b[1]=='I'&&b[2]=='F'&&b[3]=='F'&&b[8]=='W'&&b[9]=='E'&&b[10]=='B'&&b[11]=='P';
    }
    private ResponseCookie clearCookie(String name,String path){return ResponseCookie.from(name,"").httpOnly(true).secure(secureCookies).sameSite(sameSite).path(path).maxAge(0).build();}
    private static UUID actor(Jwt jwt){return UUID.fromString(jwt.getSubject());}
}
