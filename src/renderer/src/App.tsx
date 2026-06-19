import { useState, useRef, useEffect } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [activeModel, setActiveModel] = useState('chatgpt') // Track selected model
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = async () => {
    if (!prompt.trim() || isThinking) return;

    const userMessage = prompt;
    setPrompt(''); 
    
    // 1. Save the visible message to the UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);

    try {
      // 2. The Context Compiler: Grab the last 4 messages to build short-term memory
      const recentHistory = messages.slice(-4); 
      let contextualPrompt = userMessage;

      if (recentHistory.length > 0) {
        contextualPrompt = "Here is the recent context of our conversation:\n\n" +
          recentHistory.map(m => `${m.role === 'user' ? 'Me' : 'You'}: ${m.content}`).join("\n\n") +
          "\n\nBased on the above context, please answer this new prompt:\n" + userMessage;
      }

      // 3. Send the massive contextual prompt to the engine invisibly
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
    <div className="flex h-screen w-full bg-ai-dark text-gray-100">
      
      {/* Sidebar - Now with Model Selection */}
      <div className="w-64 bg-[#181825] p-4 flex flex-col border-r border-gray-800 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-6 tracking-wide">
            Omni<span className="text-ai-primary">AI</span>
          </h1>
          <div className="text-sm text-gray-400 font-semibold mb-3">SELECT ENGINE</div>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveModel('chatgpt')}
              className={`p-3 rounded-md text-left transition-colors border ${activeModel === 'chatgpt' ? 'bg-ai-surface border-green-500 text-white shadow-sm' : 'border-transparent text-gray-400 hover:bg-[#2b2b40]'}`}
            >
              <span className={activeModel === 'chatgpt' ? "text-green-400" : "text-gray-500"}>●</span> ChatGPT
            </button>
            <button 
              onClick={() => setActiveModel('claude')}
              className={`p-3 rounded-md text-left transition-colors border ${activeModel === 'claude' ? 'bg-ai-surface border-orange-500 text-white shadow-sm' : 'border-transparent text-gray-400 hover:bg-[#2b2b40]'}`}
            >
              <span className={activeModel === 'claude' ? "text-orange-400" : "text-gray-500"}>●</span> Claude
            </button>
            <button 
              onClick={() => setActiveModel('gemini')}
              className={`p-3 rounded-md text-left transition-colors border ${activeModel === 'gemini' ? 'bg-ai-surface border-blue-500 text-white shadow-sm' : 'border-transparent text-gray-400 hover:bg-[#2b2b40]'}`}
            >
              <span className={activeModel === 'gemini' ? "text-blue-400" : "text-gray-500"}>●</span> Gemini
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setMessages([])}
          className="text-sm text-gray-400 hover:text-white transition-colors p-2 text-left"
        >
          🗑️ Clear Screen
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto w-full text-center text-gray-500 mt-20">
              <h2 className="text-2xl font-semibold text-gray-300 mb-2">Ready to orchestrate.</h2>
              <p>Select your engine from the sidebar.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`max-w-3xl mx-auto w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[80%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-ai-primary text-white' : 'bg-ai-surface text-gray-200 shadow-md border border-gray-700'}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {isThinking && (
            <div className="max-w-3xl mx-auto w-full flex justify-start">
              <div className="p-4 rounded-2xl bg-ai-surface text-gray-400 animate-pulse border border-gray-700">
                Routing prompt to {activeModel}...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-ai-dark border-t border-gray-800">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask ${activeModel}...`}
              disabled={isThinking}
              className="w-full bg-[#181825] border border-gray-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-ai-primary transition-colors shadow-lg disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={isThinking}
              className="absolute right-3 bg-ai-primary hover:bg-violet-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App