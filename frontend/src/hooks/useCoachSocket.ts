import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { CoachingAnalysis, Message } from '../types';

interface UseCoachSocketOptions {
  sessionId: string | null;
  onTurnComplete?: (msg: Message, coaching: CoachingAnalysis | null) => void;
}

type SocketState = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export const useCoachSocket = ({ sessionId, onTurnComplete }: UseCoachSocketOptions) => {
  const { token, addMessage, setCurrentCoaching } = useStore();
  const [socketState, setSocketState] = useState<SocketState>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWaitersRef = useRef<Array<(ok: boolean) => void>>([]);
  const turnWaitersRef = useRef<Array<() => void>>([]);
  const hasConnectedOnceRef = useRef(false);
  const renderedMessageIdsRef = useRef<Set<string>>(new Set());

  // Keep callbacks in a ref so `connect` stays stable across re-renders.
  const onTurnCompleteRef = useRef(onTurnComplete);
  onTurnCompleteRef.current = onTurnComplete;

  const resolveOpenWaiters = useCallback((ok: boolean) => {
    const waiters = openWaitersRef.current;
    openWaitersRef.current = [];
    waiters.forEach((resolve) => resolve(ok));
  }, []);

  const addMessageOnce = useCallback((msg: Message) => {
    if (!msg || !msg.id) return;
    if (renderedMessageIdsRef.current.has(msg.id)) return;
    renderedMessageIdsRef.current.add(msg.id);
    addMessage(msg);
  }, [addMessage]);

  const connect = useCallback(() => {
    if (!sessionId || !token) return;

    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

    let wsUrl = '';
    if (apiHost.startsWith('http://') || apiHost.startsWith('https://')) {
      const cleanHost = apiHost.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${cleanHost}/api/v1/chat/ws/${sessionId}?token=${encodeURIComponent(token)}`;
    } else if (apiHost.startsWith('ws://') || apiHost.startsWith('wss://')) {
      wsUrl = `${apiHost}/api/v1/chat/ws/${sessionId}?token=${encodeURIComponent(token)}`;
    } else {
      wsUrl = `${wsProtocol}//${window.location.host}/api/v1/chat/ws/${sessionId}?token=${encodeURIComponent(token)}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        hasConnectedOnceRef.current = true;
        setSocketState('connected');
        resolveOpenWaiters(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === 'customer_message') {
            if (payload.message) {
              addMessageOnce(payload.message);
            }
          } else if (payload.event === 'stage_update') {
            setIsProcessing(true);
            setActiveStage(payload.stage);
            if (payload.accumulated) {
              setCurrentCoaching(payload.accumulated);
            }
          } else if (payload.event === 'coaching_refine') {
            // Background LLM refinement of the provisional result; swap it in
            // without re-locking the conversation or double-adding the message.
            if (payload.coaching) {
              setCurrentCoaching(payload.coaching);
            }
          } else if (payload.event === 'turn_complete' || payload.status === 'success') {
            setIsProcessing(false);
            setActiveStage(null);
            if (payload.message) {
              addMessageOnce(payload.message);
            }
            if (payload.coaching) {
              setCurrentCoaching(payload.coaching);
            }
            if (onTurnCompleteRef.current && payload.message) {
              onTurnCompleteRef.current(payload.message, payload.coaching);
            }
            const waiter = turnWaitersRef.current.shift();
            if (waiter) waiter();
          } else if (payload.status === 'error') {
            setIsProcessing(false);
            setActiveStage(null);
            console.error('[WebSocket] Error from backend:', payload.error);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        setIsProcessing(false);
        setActiveStage(null);
        resolveOpenWaiters(false);
        // Release any pending turn waiters so callers do not hang forever.
        const waiters = turnWaitersRef.current;
        turnWaitersRef.current = [];
        waiters.forEach((resolve) => resolve());

        if (hasConnectedOnceRef.current) {
          setSocketState('reconnecting');
        } else {
          setSocketState('connecting');
        }

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        try {
          ws.close();
        } catch {
          // ignore
        }
      };

      if (hasConnectedOnceRef.current) {
        setSocketState('reconnecting');
      } else {
        setSocketState('connecting');
      }
    } catch (err) {
      console.error('[WebSocket] Connection attempt failed:', err);
      resolveOpenWaiters(false);
      setSocketState('reconnecting');
    }
  }, [sessionId, token, resolveOpenWaiters]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
      resolveOpenWaiters(false);
    };
  }, [connect, resolveOpenWaiters]);

  const sendChatMessage = useCallback((sender: 'customer' | 'agent', content: string, agentDraft: string = '') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    setIsProcessing(true);
    socketRef.current.send(JSON.stringify({
      action: 'send_message',
      sender,
      content,
      agent_draft: agentDraft
    }));
    return true;
  }, []);

  const triggerSimulatorNext = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    setIsProcessing(true);
    socketRef.current.send(JSON.stringify({
      action: 'simulator_next'
    }));
    return true;
  }, []);

  /** Resolves `true` when the socket reaches OPEN state within `timeoutMs`. */
  const ensureSocketOpen = useCallback((timeoutMs: number = 5000): Promise<boolean> => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      const waiter = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };
      const timer = setTimeout(() => {
        openWaitersRef.current = openWaitersRef.current.filter((w) => w !== waiter);
        resolve(false);
      }, timeoutMs);
      openWaitersRef.current.push(waiter);
    });
  }, []);

  /** Resolves on the next `turn_complete` event received from the backend. */
  const waitForTurnComplete = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      turnWaitersRef.current.push(resolve);
    });
  }, []);

  const isConnected = socketState === 'connected';
  const isReconnecting = socketState === 'reconnecting';

  return {
    socketState,
    isConnected,
    isReconnecting,
    isProcessing,
    activeStage,
    sendChatMessage,
    triggerSimulatorNext,
    ensureSocketOpen,
    waitForTurnComplete,
  };
};
