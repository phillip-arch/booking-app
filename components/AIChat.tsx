
import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const AIChat: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message with translation
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'model', text: t('chat.welcome') }]);
    }
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // If Gemini service is offline or fails, we return a translated error message handled inside service, 
    // but here we just get text.
    // Ideally service should be language aware or we handle errors here.
    // For now, let's assume service returns English, but we can catch basic connection errors.
    
    let responseText = '';
    try {
        responseText = await sendMessageToGemini(userMsg.text);
    } catch {
        responseText = t('chat.error');
    }
    
    // Simple fallback if service returns hardcoded offline msg
    if (responseText.includes("offline")) responseText = t('chat.offline');
    if (responseText.includes("trouble")) responseText = t('chat.error');

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setLoading(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl hover:bg-primary-700 transition-all z-50 flex items-center justify-center text-2xl"
      >
        {isOpen ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-robot"></i>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-fade-in-up" style={{height: '500px', maxHeight: '80vh'}}>
          <div className="bg-primary-600 p-4 text-white flex items-center gap-3">
             <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
               <i className="fa-solid fa-robot text-sm"></i>
             </div>
             <div>
               <h3 className="font-bold text-sm">{t('chat.title')}</h3>
               <p className="text-xs text-primary-100">{t('chat.subtitle')}</p>
             </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="flex-1 px-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="w-10 h-10 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
