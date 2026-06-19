import { useState, useRef, useEffect } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [activeModel, setActiveModel] = useState('chatgpt') 
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = async () => {
    if (!prompt.trim() || isThinking) return;

    const userMessage = prompt;
    setPrompt(''); 
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);

    try {
      const recentHistory = messages.slice(-4); 
      let contextualPrompt = userMessage;

      if (recentHistory.length > 0) {
        contextualPrompt = "Here is the recent context of our conversation:\n\n" +
          recentHistory.map(m => `${m.role === 'user' ? 'Me' : 'You'}: ${m.content}`).join("\n\n") +
          "\n\nBased on the above context, please answer this new prompt:\n" + userMessage;
      }

      const payload = { promptText: contextualPrompt, model: activeModel };
      
      // @ts-ignore
      const response = await window.electron.ipcRenderer.invoke('send-prompt', payload);
      
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "System Error: Could not reach the engine." }]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    // Base layout relies on a completely transparent background so Electron Acrylic can display behind it
    <div className="flex flex-col h-screen w-full bg-transparent text-gray-200 font-sans antialiased selection:bg-blue-500/30">
      
      {/* 1. NATIVE WINDOW HEADER BAR (Draggable region) */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
        className="h-12 w-full flex-shrink-0 flex items-center border-b border-white/[0.06] bg-black/10 backdrop-blur-md select-none px-4 relative"
      >
        {/* macOS Traffic Light Buttons - Now with Native Hover Icons */}
        <div className="flex gap-2 absolute left-4 items-center group" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          
          {/* Close (Red) */}
          <button 
            onClick={() => {
              // @ts-ignore
              window.electron.ipcRenderer.send('window-close')
            }}
            className="w-3 h-3 flex items-center justify-center rounded-full bg-[#ff5f56] border border-black/10 transition-colors"
          >
            <svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black/60 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>

          {/* Minimize (Yellow) */}
          <button 
            onClick={() => {
              // @ts-ignore
              window.electron.ipcRenderer.send('window-minimize')
            }}
            className="w-3 h-3 flex items-center justify-center rounded-full bg-[#ffbd2e] border border-black/10 transition-colors"
          >
            <svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black/60 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
            </svg>
          </button>

          {/* Maximize (Green) */}
          <button 
            onClick={() => {
              // @ts-ignore
              window.electron.ipcRenderer.send('window-maximize')
            }}
            className="w-3 h-3 flex items-center justify-center rounded-full bg-[#27c93f] border border-black/10 transition-colors"
          >
            <svg className="w-[8px] h-[8px] opacity-0 group-hover:opacity-100 text-black/60 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
            </svg>
          </button>
          
        </div>

        {/* Centered Title */}
        <div className="w-full flex justify-center">
          <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">
            Omni<span className="text-blue-400">AI</span>
          </span>
        </div>
      </div>

      {/* MAIN LAYOUT SPLIT (Non-draggable) */}
      <div 
        className="flex flex-1 overflow-hidden" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 2. MACOS TRANSLUCENT SIDEBAR */}
        <div className="w-60 bg-black/20 backdrop-blur-3xl p-3 flex flex-col border-r border-white/[0.06] justify-between select-none">
          <div>
            <div className="text-[10px] text-gray-500 font-bold mb-3 tracking-wider uppercase px-3">
              Engines
            </div>
            
            <div className="flex flex-col gap-[2px]">
              <button 
                onClick={() => setActiveModel('chatgpt')}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150 flex items-center justify-between ${
                  activeModel === 'chatgpt' 
                    ? 'bg-white/[0.12] text-white shadow-sm font-semibold' 
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${activeModel === 'chatgpt' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-600'}`}></div>
                  ChatGPT
                </div>
                {activeModel === 'chatgpt' && <span className="text-[10px] text-emerald-400 font-mono opacity-80">Active</span>}
              </button>

              <button 
                onClick={() => setActiveModel('claude')}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150 flex items-center justify-between ${
                  activeModel === 'claude' 
                    ? 'bg-white/[0.12] text-white shadow-sm font-semibold' 
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${activeModel === 'claude' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 'bg-gray-600'}`}></div>
                  Claude
                </div>
                {activeModel === 'claude' && <span className="text-[10px] text-orange-400 font-mono opacity-80">Active</span>}
              </button>

              <button 
                onClick={() => setActiveModel('gemini')}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all duration-150 flex items-center justify-between ${
                  activeModel === 'gemini' 
                    ? 'bg-white/[0.12] text-white shadow-sm font-semibold' 
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${activeModel === 'gemini' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-gray-600'}`}></div>
                  Gemini
                </div>
                {activeModel === 'gemini' && <span className="text-[10px] text-blue-400 font-mono opacity-80">Active</span>}
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => setMessages([])}
            className="text-xs text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all py-2 rounded-lg text-center font-medium border border-white/[0.04]"
          >
            Clear Conversation
          </button>
        </div>

        {/* 3. CHAT CONTENT MODULE */}
        <div className="flex-1 flex flex-col relative bg-transparent">
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto w-full text-center text-gray-400 mt-28 select-none">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <span className="text-xl">✨</span>
                </div>
                <h2 className="text-xl font-medium text-white mb-1.5 tracking-tight">Ready to orchestrate.</h2>
                <p className="text-xs text-gray-500">Select an automation engine to route requests.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`max-w-2xl mx-auto w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-3 text-[14px] leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-2xl rounded-tr-sm shadow-sm font-normal' 
                      : 'bg-white/[0.06] border border-white/[0.06] text-gray-100 shadow-sm rounded-2xl rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            
            {/* Native OS Style Processing Indicator */}
            {isThinking && (
              <div className="max-w-2xl mx-auto w-full flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06] text-gray-400 flex items-center gap-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs font-medium text-gray-400">Routing to {activeModel}...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 4. FLOATING PILL ACTION ROW */}
          <div className="p-6 bg-gradient-to-t from-black/20 to-transparent">
            <div className="max-w-2xl mx-auto relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${activeModel === 'chatgpt' ? 'ChatGPT' : activeModel === 'claude' ? 'Claude' : 'Gemini'}...`}
                disabled={isThinking}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-full pl-5 pr-20 py-3 text-white focus:outline-none focus:border-white/[0.18] focus:bg-white/[0.09] transition-all shadow-xl disabled:opacity-40 placeholder-gray-500 text-[14px]"
              />
              <button 
                onClick={handleSend}
                disabled={isThinking || !prompt.trim()}
                className="absolute right-1.5 bg-white text-black hover:bg-gray-200 disabled:hover:bg-white px-4 py-1.5 rounded-full font-semibold transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-sm text-xs"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App