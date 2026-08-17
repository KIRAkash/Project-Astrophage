import { useEffect, useState } from 'react';
import { KBStatus, KBEvent } from '@/types/kb';

export function useKBStatus(kbId: string) {
  const [status, setStatus] = useState<KBStatus | null>(null);
  const [events, setEvents] = useState<KBEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!kbId) return;
    
    let eventSource: EventSource;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      eventSource = new EventSource(`/api/kb/${kbId}/stream`);
      
      eventSource.onopen = () => {
        setIsConnected(true);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) setStatus(data.status);
          if (data.event) {
            setEvents(prev => [...prev, data.event]);
          }
        } catch (e) {
          console.error("Failed to parse SSE data", e);
        }
      };
      
      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };
    
    connect();
    
    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [kbId]);

  return { status, events, isConnected };
}
