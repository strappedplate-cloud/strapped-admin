'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ChatMessage } from '@/lib/types';

interface UserInfo {
  id: string;
  username: string;
  name: string;
}

interface ChatWindowProps {
  peer: UserInfo;
  myId: string;
  myName: string;
  onClose: () => void;
  isOnline: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return `Kemarin ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function ChatWindow({ peer, myId, myName, onClose, isOnline }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?with=${peer.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, [peer.id]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_user_id: peer.id,
        to_username: peer.username,
        content: input.trim(),
      }),
    });
    if (res.ok) {
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setInput('');
    }
    setSending(false);
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <div className="chat-avatar">{peer.name.charAt(0).toUpperCase()}</div>
            <div className={`chat-online-dot ${isOnline ? 'online' : 'offline'}`} />
          </div>
          <div>
            <div className="chat-peer-name">{peer.name}</div>
            <div className="chat-peer-status">{isOnline ? '🟢 Online' : '⚫ Offline'}</div>
          </div>
        </div>
        <button className="chat-close-btn" onClick={onClose}>×</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div>Mulai percakapan dengan {peer.name}</div>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.from_user_id === myId;
          return (
            <div key={msg.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && (
                <div className="chat-bubble-avatar">{msg.from_name.charAt(0).toUpperCase()}</div>
              )}
              <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                <div className="chat-bubble-text">{msg.content}</div>
                <div className="chat-bubble-time">
                  {formatTime(msg.created_at)}
                  {isMine && (
                    <span style={{ marginLeft: '4px', opacity: msg.read ? 1 : 0.5 }}>
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-row" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Pesan ke ${peer.name}...`}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!input.trim() || sending}
        >
          ➤
        </button>
      </form>
    </div>
  );
}

export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activePeer, setActivePeer] = useState<UserInfo | null>(null);

  const me = session?.user as { id?: string; name?: string; username?: string } | undefined;
  const myId = me?.id || '';
  const myName = me?.name || 'Me';

  // Heartbeat - send presence every 15s
  useEffect(() => {
    if (!myId) return;
    const sendHeartbeat = () => fetch('/api/presence', { method: 'POST' });
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [myId]);

  // Poll online users every 10s
  useEffect(() => {
    if (!myId) return;
    const fetchOnline = async () => {
      const res = await fetch('/api/presence');
      if (res.ok) setOnlineIds(await res.json());
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => clearInterval(interval);
  }, [myId]);

  // Poll unread counts every 5s
  useEffect(() => {
    if (!myId) return;
    const fetchUnread = async () => {
      const res = await fetch('/api/messages/unread');
      if (res.ok) setUnread(await res.json());
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [myId]);

  // Fetch other users
  useEffect(() => {
    if (!myId) return;
    fetch('/api/users')
      .then(r => r.json())
      .then((data: { id: string; username: string; name: string }[]) => {
        setUsers(data.filter((u) => u.id !== myId));
      });
  }, [myId]);

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0);

  if (!myId) return null;

  return (
    <>
      {/* Chat Panel */}
      {isOpen && !activePeer && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>💬 Team Chat</span>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="chat-user-list">
            {users.length === 0 && (
              <div className="chat-empty" style={{ padding: '24px' }}>
                <div>Belum ada anggota lain</div>
              </div>
            )}
            {users.map(u => {
              const online = onlineIds.includes(u.id);
              const unreadCount = unread[u.id] || 0;
              return (
                <button
                  key={u.id}
                  className="chat-user-item"
                  onClick={() => setActivePeer(u)}
                >
                  <div style={{ position: 'relative' }}>
                    <div className="chat-avatar">{u.name.charAt(0).toUpperCase()}</div>
                    <div className={`chat-online-dot ${online ? 'online' : 'offline'}`} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div className="chat-user-name">{u.name}</div>
                    <div className="chat-user-status">
                      {online ? (
                        <span style={{ color: '#10b981' }}>● Online</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>○ Offline</span>
                      )}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="chat-unread-badge">{unreadCount}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Chat Window */}
      {activePeer && (
        <ChatWindow
          peer={activePeer}
          myId={myId}
          myName={myName}
          isOnline={onlineIds.includes(activePeer.id)}
          onClose={() => {
            setActivePeer(null);
            setIsOpen(true);
          }}
        />
      )}

      {/* Floating Chat Button */}
      <button
        className="chat-fab"
        onClick={() => {
          if (activePeer) {
            setActivePeer(null);
            setIsOpen(true);
          } else {
            setIsOpen(prev => !prev);
          }
        }}
        title="Team Chat"
      >
        <span style={{ fontSize: '20px' }}>💬</span>
        {totalUnread > 0 && !isOpen && !activePeer && (
          <div className="chat-fab-badge">{totalUnread > 9 ? '9+' : totalUnread}</div>
        )}
      </button>
    </>
  );
}
