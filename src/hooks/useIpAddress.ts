import { useState, useEffect } from 'react';

export function useIpAddress() {
  const [ipAddress, setIpAddress] = useState<string>('');

  useEffect(() => {
    const getIpAddress = async () => {
      try {
        // CORS 문제가 없는 서비스들로 변경
        const services = [
          'https://api64.ipify.org?format=json',  // IPv4/IPv6 지원
          'https://api.ipify.org?format=json',    // IPv4 전용
        ];

        for (const service of services) {
          try {
            const response = await fetch(service, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data.ip) {
              setIpAddress(data.ip);
              return;
            }
          } catch {
            continue;
          }
        }
        
        // 모든 서비스가 실패한 경우
        createFallbackId();
      } catch (error) {
        createFallbackId();
      }
    };

    // 임시 식별자 생성 함수
    const createFallbackId = () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const fallbackIp = `anonymous-${timestamp}-${random}`;
      setIpAddress(fallbackIp);
      console.warn('IP 주소를 가져올 수 없어 임시 식별자를 생성했습니다.');
    };

    getIpAddress();
  }, []);

  return ipAddress;
} 