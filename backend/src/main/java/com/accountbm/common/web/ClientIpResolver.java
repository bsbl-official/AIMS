package com.accountbm.common.web;

import java.net.InetAddress;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {
    private final List<Cidr> trusted;
    public ClientIpResolver(@Value("${app.security.trusted-proxy-cidrs}") List<String> cidrs){
        trusted=cidrs.stream().map(String::strip).filter(value->!value.isEmpty()).map(Cidr::parse).toList();
    }
    public String resolve(HttpServletRequest request){
        var remote=request.getRemoteAddr();
        if(trusted.stream().noneMatch(cidr->cidr.contains(remote)))return remote;
        var forwarded=request.getHeader("X-Forwarded-For");
        if(forwarded==null||forwarded.isBlank())return remote;
        var candidate=forwarded.split(",")[0].strip();
        try{return InetAddress.getByName(candidate).getHostAddress();}catch(Exception ignored){return remote;}
    }
    private record Cidr(byte[] network,int bits){
        static Cidr parse(String value){
            try{
                var parts=value.split("/",2);var address=InetAddress.getByName(parts[0]).getAddress();
                int bits=parts.length==2?Integer.parseInt(parts[1]):address.length*8;
                if(bits<0||bits>address.length*8)throw new IllegalArgumentException("Invalid trusted proxy CIDR");
                return new Cidr(address,bits);
            }catch(Exception exception){throw new IllegalArgumentException("Invalid trusted proxy CIDR: "+value,exception);}
        }
        boolean contains(String value){
            try{
                var address=InetAddress.getByName(value).getAddress();if(address.length!=network.length)return false;
                int full=bits/8,remaining=bits%8;
                for(int i=0;i<full;i++)if(address[i]!=network[i])return false;
                if(remaining==0)return true;int mask=(0xff<<(8-remaining))&0xff;
                return (address[full]&mask)==(network[full]&mask);
            }catch(Exception ignored){return false;}
        }
    }
}

