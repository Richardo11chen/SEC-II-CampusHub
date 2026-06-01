import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, IconButton, CircularProgress, Alert,
  Paper, Avatar,
} from '@mui/material';
import { ChatOutlined as SendIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { getMessages, sendMessage } from '@/api/messages';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/format';
import type { ChatMessage } from '@/types';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderId = Number(id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const isNearBottom = useRef(true);
  const totalRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if user is near the bottom of the message list
  const checkIsNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const res = await getMessages(orderId, page + 1, 50);
    if (res.data) {
      const { items, pagination } = res.data;
      setMessages(prev => [...items, ...prev]);
      totalRef.current = pagination.total;
      setHasMore((messages.length + items.length) < pagination.total);
      setPage(page + 1);
    }
    setLoadingMore(false);
  }, [orderId, hasMore, loadingMore, messages.length, page]);

  // Initial load
  useEffect(() => {
    if (!orderId || isNaN(orderId)) return;
    getMessages(orderId, 1, 50)
      .then((res) => {
        if (res.data) {
          const { items, pagination } = res.data;
          setMessages(items);
          totalRef.current = pagination.total;
          setHasMore(items.length < pagination.total);
          setPage(1);
          prevMessageCount.current = items.length;
          setError('');
        } else {
          setError(res.error || '获取消息失败');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Polling every 3 seconds
  useEffect(() => {
    if (loading || error) return;

    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      const currentCount = messages.length;
      getMessages(orderId, 1, currentCount > 0 ? currentCount : 1).then(res => {
        if (res.data) {
          const { items, pagination } = res.data;
          if (pagination.total > currentCount) {
            setMessages(items);
            totalRef.current = pagination.total;
            setHasMore(items.length < pagination.total);
            prevMessageCount.current = items.length;
            if (isNearBottom.current) {
              setTimeout(scrollToBottom, 100);
            }
          }
        }
      });
    }, 3000);

    return () => clearInterval(poll);
  }, [orderId, loading, error, messages.length, scrollToBottom]);

  // Auto scroll on new messages
  useEffect(() => {
    if (isNearBottom.current && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    isNearBottom.current = checkIsNearBottom();
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);

    const res = await sendMessage(orderId, text);
    if (res.data) {
      setMessages(prev => [...prev, res.data!]);
      totalRef.current += 1;
      prevMessageCount.current += 1;
      setTimeout(scrollToBottom, 100);
    } else {
      setInputText(text); // restore on failure
      setError(res.error || '发送失败');
      setTimeout(() => setError(''), 3000);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Partner name for the header
  const partnerName = messages.length > 0
    ? messages.find(m => m.senderId !== user?.id)?.sender.nickname
      ?? messages[0].sender.nickname
    : '聊天';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Paper
        square
        elevation={1}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, zIndex: 1 }}
      >
        <IconButton onClick={() => navigate(`/orders/${orderId}`)} size="small">
          <BackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
          {partnerName}
        </Typography>
      </Paper>

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Message list */}
      <Box
        ref={listRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Load more */}
        {hasMore && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            {loadingMore ? (
              <CircularProgress size={24} />
            ) : (
              <Typography
                variant="caption"
                color="primary"
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={loadMore}
              >
                加载更多
              </Typography>
            )}
          </Box>
        )}

        {messages.length === 0 && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">暂无消息，发送第一条消息吧</Typography>
          </Box>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Avatar + nickname for others */}
              {!isMe && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25, ml: 0.5 }}>
                  <Avatar src={msg.sender.avatar || undefined} sx={{ width: 20, height: 20 }}>
                    {msg.sender.nickname[0]}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {msg.sender.nickname}
                  </Typography>
                </Box>
              )}
              <Paper
                sx={{
                  px: 1.5,
                  py: 0.75,
                  maxWidth: '75%',
                  bgcolor: isMe ? 'primary.main' : 'grey.200',
                  color: isMe ? '#fff' : 'text.primary',
                  borderRadius: 2,
                  wordBreak: 'break-word',
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
              </Paper>
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, mx: 0.5 }}>
                {formatDateTime(msg.createdAt)}
              </Typography>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Paper
        square
        elevation={3}
        sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, px: 2, py: 1.5 }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="输入消息…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!inputText.trim() || sending}
          sx={{ mb: 0.25 }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}
