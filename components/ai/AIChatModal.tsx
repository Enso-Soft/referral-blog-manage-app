'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  AlertCircle,
  User,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useBackButtonClose } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat'

interface AIChatContentProps {
  postId: string
  isOpen: boolean
}

interface AIChatModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

// SlidePanel 내부에서 사용하는 채팅 콘텐츠 컴포넌트
export function AIChatContent({ postId, isOpen }: AIChatContentProps) {
  const {
    messages,
    input,
    setInput,
    isLoading,
    loadingMessages,
    messagesEndRef,
    inputRef,
    handleSend,
    handleRetry,
    handleKeyDown,
    findPreviousUserMessage,
  } = useAIChat({ postId, isOpen })

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={() => handleRetry(msg.id, findPreviousUserMessage(idx))}
              isLoading={isLoading && msg.status === 'pending'}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  )
}

// 기존 AIChatModal (하위 호환)
export function AIChatModal({ postId, isOpen, onClose }: AIChatModalProps) {
  const {
    messages,
    input,
    setInput,
    isLoading,
    loadingMessages,
    messagesEndRef,
    inputRef,
    handleSend,
    handleRetry,
    handleKeyDown,
    findPreviousUserMessage,
  } = useAIChat({ postId, isOpen })

  // 안드로이드 백버튼으로 모달 닫기
  useBackButtonClose(isOpen, (open) => { if (!open) onClose() })

  // ESC 키 핸들링
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                AI 글 수정 도우미
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRetry={() => handleRetry(msg.id, findPreviousUserMessage(idx))}
                  isLoading={isLoading && msg.status === 'pending'}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            inputRef={inputRef}
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 빈 상태 컴포넌트
function EmptyState() {
  return (
    <div className="text-center py-8 text-gray-400 text-sm">
      <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
      <p>AI에게 글 수정을 요청해보세요</p>
      <p className="text-xs mt-1 text-gray-500">
        예: &ldquo;소개 부분을 좀 더 흥미롭게 수정해줘&rdquo;
      </p>
    </div>
  )
}

// 채팅 입력 컴포넌트
function ChatInput({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  isLoading,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSend: () => void
  isLoading: boolean
}) {
  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지 입력..."
          disabled={isLoading}
          rows={1}
          className="flex-1 rounded-xl resize-none max-h-24 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />
        <Button
          onClick={onSend}
          disabled={isLoading || !value.trim()}
          size="icon"
          className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      {isLoading && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI가 응답 중입니다...
        </p>
      )}
    </div>
  )
}

// 메시지 버블 컴포넌트
function MessageBubble({
  message,
  onRetry,
  isLoading,
}: {
  message: ChatMessage
  onRetry: () => void
  isLoading: boolean
}) {
  const isUser = message.role === 'user'
  const isFailed = message.status === 'failed'
  const isPending = message.status === 'pending'

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-gray-200 dark:bg-gray-700'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-violet-500 text-white rounded-tr-none'
            : isFailed
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-tl-none border border-red-200 dark:border-red-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'
        )}
      >
        {isPending && !message.content ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Failed indicator */}
        {isFailed && !isUser && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <Button
              variant="link"
              onClick={onRetry}
              disabled={isLoading}
              className="h-auto p-0 text-xs font-medium text-inherit"
            >
              <RotateCcw className="w-3 h-3" />
              재시도
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
