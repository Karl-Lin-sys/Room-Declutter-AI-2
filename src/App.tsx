import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Send, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalysisResult(null);
    setChatMessages([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Extract just the base64 data part
      const base64Data = base64String.split(',')[1];
      setBase64Image(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const analyzeRoom = async () => {
    if (!base64Image || !imageFile) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: imageFile.type,
              },
            },
            {
              text: "Analyze this room. Provide specific, actionable organization and decluttering suggestions. Break it down into: 1. Quick Wins (takes < 15 mins), 2. Weekend Projects, 3. Storage Solutions, and 4. General Observations. Format as Markdown.",
            },
          ],
        },
        config: {
          systemInstruction: "You are an expert home organizer and interior designer. Help the user declutter and organize their space. Be encouraging, practical, and specific.",
        }
      });

      const resultText = response.text || "Could not generate analysis.";
      setAnalysisResult(resultText);
      setChatMessages([{ role: 'model', text: resultText }]);
    } catch (error) {
      console.error("Error analyzing room:", error);
      setAnalysisResult("An error occurred while analyzing the room. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    const newMessages: Message[] = [...chatMessages, { role: 'user', text: userMessage }];
    setChatMessages(newMessages);
    setIsChatting(true);

    try {
      const formattedHistory = newMessages.map(msg => `${msg.role === 'user' ? 'User' : 'Organizer'}: ${msg.text}`).join('\n\n');
      const fullPrompt = `Previous conversation:\n${formattedHistory}\n\nOrganizer:`;

      const parts: any[] = [];
      if (base64Image && imageFile) {
        parts.push({
          inlineData: {
            data: base64Image,
            mimeType: imageFile.type,
          },
        });
      }
      parts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          systemInstruction: "You are an expert home organizer and interior designer. Help the user declutter and organize their space. Be encouraging, practical, and specific. Respond directly to the user's latest message, continuing the conversation.",
        }
      });

      setChatMessages([...newMessages, { role: 'model', text: response.text || "I'm sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error("Error chatting:", error);
      setChatMessages([...newMessages, { role: 'model', text: "Sorry, an error occurred while trying to respond." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const resetApp = () => {
    setImageFile(null);
    setImagePreview(null);
    setBase64Image(null);
    setAnalysisResult(null);
    setChatMessages([]);
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-semibold tracking-tight">Room Declutter AI</h1>
          </div>
          {imageFile && (
            <button
              onClick={resetApp}
              className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!imageFile ? (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl mb-4">
                Transform your space with AI
              </h2>
              <p className="text-lg text-stone-600">
                Upload a photo of any messy room, and get instant, actionable advice on how to organize and declutter it.
              </p>
            </div>

            <div 
              className="mt-8 flex justify-center rounded-2xl border-2 border-dashed border-stone-300 px-6 py-24 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer bg-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                  <Upload className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="mt-4 flex text-sm leading-6 text-stone-600 justify-center">
                  <span className="relative cursor-pointer rounded-md bg-transparent font-semibold text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 hover:text-emerald-500">
                    <span>Upload a file</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-stone-500 mt-2">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:h-[calc(100vh-8rem)]">
            {/* Left Column: Image Preview */}
            <div className="flex flex-col gap-4 h-[50vh] lg:h-full">
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex-1 relative flex flex-col">
                <div className="p-4 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50">
                  <ImageIcon className="w-5 h-5 text-stone-500" />
                  <h3 className="font-medium text-stone-700">Room Photo</h3>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center bg-stone-100/50">
                  <img 
                    src={imagePreview!} 
                    alt="Room preview" 
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {!analysisResult && !isAnalyzing && (
                  <div className="p-4 bg-white border-t border-stone-100">
                    <button
                      onClick={analyzeRoom}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      <Sparkles className="w-5 h-5" />
                      Analyze Room
                    </button>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="p-4 bg-white border-t border-stone-100">
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl font-medium cursor-not-allowed"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing space...
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Analysis & Chat */}
            <div className="flex flex-col h-[60vh] lg:h-full bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50 shrink-0">
                <MessageSquare className="w-5 h-5 text-stone-500" />
                <h3 className="font-medium text-stone-700">AI Organizer</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/30">
                {!analysisResult && !isAnalyzing && (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                    <Sparkles className="w-12 h-12 opacity-20" />
                    <p>Click "Analyze Room" to get started</p>
                  </div>
                )}
                
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-stone-200 text-stone-800 shadow-sm rounded-tl-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="markdown-body prose prose-stone prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-emerald-600 hover:prose-a:text-emerald-500">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span className="text-sm text-stone-500">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-stone-100 shrink-0">
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={analysisResult ? "Ask a follow-up question..." : "Wait for analysis to finish..."}
                    disabled={!analysisResult || isChatting}
                    className="w-full bg-stone-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl pl-4 pr-12 py-3 text-stone-900 placeholder:text-stone-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || !analysisResult || isChatting}
                    className="absolute right-2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
