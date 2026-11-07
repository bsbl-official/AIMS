package com.accountbm.journal.controller;

import static com.accountbm.journal.dto.VoucherDtos.*;

import com.accountbm.journal.service.VoucherService;
import jakarta.validation.Valid;
import java.net.URI;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/companies/{companyId}/vouchers/{voucherClass}")
public class VoucherController {
    private final VoucherService service;
    public VoucherController(VoucherService service) { this.service = service; }

    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.read','permission:journal.create')")
    public VoucherOptions options(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @AuthenticationPrincipal Jwt jwt) { return service.options(companyId, voucherClass, actor(jwt)); }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.read','permission:journal.create')")
    public List<VoucherSummary> list(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @RequestParam(required=false) String voucherNumber, @RequestParam(required=false) LocalDate fromDate,
            @RequestParam(required=false) LocalDate toDate, @AuthenticationPrincipal Jwt jwt) {
        return service.list(companyId, voucherClass, voucherNumber, fromDate, toDate, actor(jwt));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.read','permission:journal.create')")
    public VoucherResponse get(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) { return service.get(companyId, voucherClass, id, actor(jwt)); }

    @PostMapping(consumes=MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.create')")
    public ResponseEntity<VoucherResponse> create(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @Valid @RequestBody CreateVoucherRequest request, @AuthenticationPrincipal Jwt jwt) {
        var result=service.create(companyId,voucherClass,request,actor(jwt));
        return ResponseEntity.created(URI.create("/api/companies/"+companyId+"/vouchers/"+voucherClass+"/"+result.id())).body(result);
    }

    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.create')")
    public ResponseEntity<VoucherResponse> createWithPhoto(@PathVariable UUID companyId,@PathVariable String voucherClass,
            @Valid @RequestPart("voucher") CreateVoucherRequest request,
            @RequestPart(value="photo",required=false) MultipartFile photo,@AuthenticationPrincipal Jwt jwt) {
        var result=service.create(companyId,voucherClass,request,validatedPhoto(photo),actor(jwt));
        return ResponseEntity.created(URI.create("/api/companies/"+companyId+"/vouchers/"+voucherClass+"/"+result.id())).body(result);
    }

    @GetMapping("/{id}/photo")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.read','permission:journal.create')")
    public ResponseEntity<byte[]> photo(@PathVariable UUID companyId,@PathVariable String voucherClass,
            @PathVariable UUID id,@AuthenticationPrincipal Jwt jwt) {
        var photo=service.photo(companyId,voucherClass,id,actor(jwt));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\""+photo.name().replace("\"","")+"\"")
                .contentLength(photo.data().length).body(photo.data());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.create')")
    public VoucherResponse update(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @PathVariable UUID id, @Valid @RequestBody UpdateVoucherRequest request,
            @AuthenticationPrincipal Jwt jwt) { return service.update(companyId,voucherClass,id,request,actor(jwt)); }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('permission:*','permission:journal.create')")
    public ResponseEntity<Void> delete(@PathVariable UUID companyId, @PathVariable String voucherClass,
            @PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        service.delete(companyId,voucherClass,id,actor(jwt)); return ResponseEntity.noContent().build();
    }
    private static UUID actor(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }

    private static VoucherService.VoucherPhoto validatedPhoto(MultipartFile file) {
        if(file==null||file.isEmpty()) return null;
        if(file.getSize()>5L*1024*1024) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Voucher photo must not exceed 5 MB");
        String type=file.getContentType();
        if(!List.of("image/jpeg","image/png","image/webp").contains(type)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Voucher photo must be JPEG, PNG, or WebP");
        try {
            byte[] data=file.getBytes();
            if(!matchesSignature(data,type)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Voucher photo content does not match its file type");
            String name=java.util.Optional.ofNullable(file.getOriginalFilename()).orElse("voucher-photo").replace('\\','/');
            name=name.substring(name.lastIndexOf('/')+1); if(name.length()>255) name=name.substring(name.length()-255);
            return new VoucherService.VoucherPhoto(data,name,type);
        } catch(IOException e) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Voucher photo could not be read",e); }
    }

    private static boolean matchesSignature(byte[] b,String type) {
        if("image/jpeg".equals(type)) return b.length>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255;
        if("image/png".equals(type)) return b.length>=8&&(b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71&&b[4]==13&&b[5]==10&&b[6]==26&&b[7]==10;
        return b.length>=12&&b[0]=='R'&&b[1]=='I'&&b[2]=='F'&&b[3]=='F'&&b[8]=='W'&&b[9]=='E'&&b[10]=='B'&&b[11]=='P';
    }
}
