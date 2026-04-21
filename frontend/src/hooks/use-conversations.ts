import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAdminSocket } from '@/hooks/use-admin-socket';
import { apiClient } from '@/lib/api-client';
import type { Conversation, UploadedFile, DashboardStats, LiveSession } from '@/types';

export function useConversations() {
  const { user, hasPermission } = useAuthStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0, totalMessages: 0, totalUploads: 0, avgMessagesPerConversation: 0,
  });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [adminChatSessionId, setAdminChatSessionId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSendingAdmin, setIsSendingAdmin] = useState(false);
  const [isSendingAdminFile, setIsSendingAdminFile] = useState(false);
  const [humanRequests, setHumanRequests] = useState<Array<{ sessionId: string; userName: string | null; timestamp: string }>>([]);
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);

  const liveSessionIds = new Set(liveSessions.map((s) => s.sessionId));

  // Cargar datos iniciales
  useEffect(() => {
    if (user) {
      loadData();
      if (hasPermission('sessions:live')) {
        apiClient.get('/sessions/live/list')
          .then((res) => setLiveSessions(Array.isArray(res.data) ? res.data : []))
          .catch(() => {});
      }
    }
  }, [user]);

  // Socket handlers
  const handleConversationUpserted = useCallback((incoming: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.sessionId === incoming.sessionId);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? { ...c, ...incoming } : c))
        : [incoming, ...prev];

      const totalMessages = next.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0);
      setStats((s) => ({
        ...s,
        totalConversations: next.length,
        totalMessages,
        avgMessagesPerConversation: next.length > 0 ? totalMessages / next.length : 0,
      }));
      return next;
    });

    setSelectedConversation((prev) =>
      prev && prev.sessionId === incoming.sessionId ? { ...prev, ...incoming } : prev
    );
  }, []);

  const handleLiveSessions = useCallback((sessions: LiveSession[]) => {
    setLiveSessions(sessions);
  }, []);

  const handleHumanRequested = useCallback((data: { sessionId: string; userName: string | null; timestamp: string }) => {
    setHumanRequests((prev) => {
      if (prev.some((r) => r.sessionId === data.sessionId)) return prev;
      return [data, ...prev];
    });
  }, []);

  const dismissHumanRequest = useCallback((sessionId: string) => {
    setHumanRequests((prev) => prev.filter((r) => r.sessionId !== sessionId));
  }, []);

  useAdminSocket({
    onConversationUpserted: handleConversationUpserted,
    onLiveSessions: handleLiveSessions,
    onHumanRequested: handleHumanRequested,
  });

  // Auto-scroll mensajes admin
  useEffect(() => {
    adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Data loading
  const loadData = async () => {
    setIsLoading(true);
    try {
      if (hasPermission('conversations:read')) {
        const statsRes = await apiClient.get('/conversations/stats');
        const allConversations: Conversation[] = statsRes.data.conversations || [];
        setConversations(allConversations);

        const totalMessages = allConversations.reduce(
          (acc: number, conv: Conversation) => acc + (conv.messages?.length || 0), 0
        );
        setStats((prev) => ({
          ...prev,
          totalConversations: allConversations.length,
          totalMessages,
          avgMessagesPerConversation: allConversations.length > 0 ? totalMessages / allConversations.length : 0,
        }));
      }

      if (hasPermission('conversations:read')) {
        const uploadsRes = await apiClient.get('/conversations/attachments');
        const uploadsArray: UploadedFile[] = Array.isArray(uploadsRes.data) ? uploadsRes.data : [];
        setUploads(uploadsArray);
        setStats((prev) => ({ ...prev, totalUploads: uploadsArray.length }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin takeover
  const joinChat = async (sessionId: string) => {
    try {
      await apiClient.post('/conversations/admin-takeover', { sessionId, active: true });
      setAdminChatSessionId(sessionId);
      const conv = conversations.find((c) => c.sessionId === sessionId);
      if (conv) setSelectedConversation(conv);
    } catch (err) {
      console.error('Error al entrar al chat:', err);
    }
  };

  const leaveChat = async () => {
    if (!adminChatSessionId) return;
    try {
      await apiClient.post('/conversations/admin-takeover', { sessionId: adminChatSessionId, active: false });
    } catch (err) {
      console.error('Error al abandonar:', err);
    }
    setAdminChatSessionId(null);
  };

  const sendAdminMessage = async () => {
    if (!adminChatSessionId || !adminMessage.trim() || isSendingAdmin) return;
    setIsSendingAdmin(true);
    try {
      await apiClient.post('/conversations/admin-message', {
        sessionId: adminChatSessionId, content: adminMessage.trim(),
      });
      setAdminMessage('');
    } catch (err) {
      console.error('Error al enviar:', err);
    } finally {
      setIsSendingAdmin(false);
    }
  };

  const sendAdminAttachment = async (file: File, caption?: string) => {
    if (!adminChatSessionId || isSendingAdminFile) return;
    setIsSendingAdminFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', adminChatSessionId);
      if (caption?.trim()) formData.append('caption', caption.trim());
      await apiClient.post('/conversations/admin-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      console.error('Error al enviar archivo:', err);
    } finally {
      setIsSendingAdminFile(false);
    }
  };

  return {
    conversations, uploads, stats, isLoading, liveSessions, liveSessionIds,
    selectedConversation, setSelectedConversation,
    adminChatSessionId, adminMessage, setAdminMessage,
    isSendingAdmin, isSendingAdminFile, adminMessagesEndRef,
    humanRequests, dismissHumanRequest,
    joinChat, leaveChat, sendAdminMessage, sendAdminAttachment, loadData,
  };
}
