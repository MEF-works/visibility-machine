import React, { useState } from 'react';
import { AngleAnalysis, AICoProducerMessage, Platform, PLATFORMS } from '../types';
import { api, copyToClipboard } from '../lib/api';
import {
  BrainCircuit, Sparkles, Send, RefreshCw, Copy, Check,
  ThumbsUp, ThumbsDown, MessageSquare, BarChart, AlertCircle,
} from 'lucide-react';

export function AngleFinderView() {
  const [draftContent, setDraftContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['tiktok', 'twitter', 'linkedin']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AngleAnalysis | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<AICoProducerMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "I'm your Visibility Machine strategist. Paste a draft above for scoring, or ask me how to turn a build log into proof that drives leads and cash. Direct answers only — no influencer fluff.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [userQuery, setUserQuery] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleRunAssessment = async () => {
    if (!draftContent.trim()) {
      setError('Paste draft content to analyze.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    try {
      const data = await api.analyzeAngle(draftContent, selectedPlatforms);
      setAnalysisResult(data.analysis);
      setOffline(!!data.offline);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendQuery = async () => {
    if (!userQuery.trim()) return;
    const queryText = userQuery;
    setUserQuery('');
    const newUserMsg: AICoProducerMessage = {
      id: `chat-${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    setIsSendingChat(true);
    try {
      const data = await api.chat(updatedMessages.map(m => ({ role: m.role, text: m.text })));
      setChatMessages(prev => [...prev, {
        id: `chat-reply-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date().toISOString(),
      }]);
    } catch (e) {
      setChatMessages(prev => [...prev, {
        id: `chat-err-${Date.now()}`,
        role: 'model',
        text: e instanceof Error ? e.message : 'Chat failed.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    setIsCopied(ok);
    setTimeout(() => setIsCopied(false), 2000);
    if (!ok) setError('Copy to clipboard failed.');
  };

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 stroke-emerald-400';
    if (score >= 55) return 'text-brand-cyan stroke-brand-cyan';
    if (score >= 40) return 'text-amber-400 stroke-amber-400';
    return 'text-red-400 stroke-red-400';
  };

  const SCORE_DIMS: { key: keyof AngleAnalysis; label: string }[] = [
    { key: 'proofStrength', label: 'Proof' },
    { key: 'specificityScore', label: 'Specificity' },
    { key: 'moneyConnection', label: 'Money' },
    { key: 'ctaStrength', label: 'CTA' },
    { key: 'platformFit', label: 'Platform Fit' },
  ];

  return (
    <div id="angle-finder-view" className="space-y-6">
      <div className="border-b border-slate-800/50 pb-5">
        <h2 className="text-3xl font-display font-black text-slate-100 tracking-tight flex items-center gap-2.5">
          <BrainCircuit className="w-8 h-8 text-brand-amber" />
          Angle Finder
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Score drafts for proof, specificity, money connection, CTA strength, and platform fit — not vanity virality.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="tactical-panel rounded-2xl p-6 space-y-5">
            <h3 className="text-slate-100 font-display font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-amber" /> Draft Scorecard
            </h3>

            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border uppercase ${selectedPlatforms.includes(p) ? 'bg-brand-amber/15 border-brand-amber text-white' : 'bg-slate-950 border-slate-850 text-slate-500'}`}>
                  {p}
                </button>
              ))}
            </div>

            <textarea rows={5} value={draftContent} onChange={e => setDraftContent(e.target.value)}
              placeholder="Paste caption, thread, or script draft..."
              className="w-full bg-slate-950 border border-slate-850 focus:border-brand-amber/50 rounded-xl p-4 text-slate-200 text-sm font-mono resize-none focus:outline-none" />

            <button onClick={handleRunAssessment} disabled={isAnalyzing || !draftContent.trim()}
              className="w-full bg-brand-amber hover:bg-brand-amber/90 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2">
              {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Angle'}
            </button>
          </div>

          {analysisResult && (
            <div className="tactical-panel rounded-2xl p-6 space-y-5">
              {offline && (
                <p className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                  Offline mode — connect GEMINI_API_KEY for full analysis.
                </p>
              )}

              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-slate-900 fill-transparent" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40"
                      className={`fill-transparent ${scoreColor(analysisResult.overallScore).split(' ')[1]}`}
                      strokeWidth="8" strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * analysisResult.overallScore) / 100}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{analysisResult.overallScore}</span>
                    <span className="text-[8px] text-slate-500 uppercase font-mono">Overall</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
                  {SCORE_DIMS.map(d => (
                    <div key={d.key} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-center">
                      <div className={`text-lg font-black ${scoreColor(analysisResult[d.key] as number).split(' ')[0]}`}>
                        {analysisResult[d.key] as number}
                      </div>
                      <div className="text-[8px] font-mono text-slate-500 uppercase">{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {analysisResult.isWeak && analysisResult.fixList.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
                  <div className="text-red-400 font-mono text-[10px] font-bold uppercase">Fix before posting</div>
                  {analysisResult.fixList.map((fix, i) => (
                    <p key={i} className="text-red-200/90 text-xs font-mono">→ {fix}</p>
                  ))}
                </div>
              )}

              <p className="text-slate-400 text-xs font-mono">{analysisResult.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] mb-2"><ThumbsUp className="w-3 h-3" /> Strengths</div>
                  {analysisResult.strengths.map((s, i) => <p key={i} className="text-slate-400 font-mono text-[11px]">• {s}</p>)}
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-1 text-red-400 font-mono text-[10px] mb-2"><ThumbsDown className="w-3 h-3" /> Weaknesses</div>
                  {analysisResult.weaknesses.map((s, i) => <p key={i} className="text-slate-400 font-mono text-[11px]">• {s}</p>)}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Improved hook</span>
                    <p className="text-slate-300 text-xs font-mono mt-1">{analysisResult.improvedHook}</p>
                  </div>
                  <button onClick={() => handleCopy(analysisResult.improvedHook)}
                    className="text-[9px] font-mono text-slate-400 flex items-center gap-1 shrink-0 ml-2">
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                  </button>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Improved CTA</span>
                  <p className="text-slate-300 text-xs font-mono mt-1">{analysisResult.improvedCta}</p>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">{analysisResult.platformNotes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-2xl flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-900 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-brand-cyan" />
            <div>
              <h3 className="text-slate-100 font-display font-bold text-sm">Strategist Chat</h3>
              <p className="text-slate-500 text-[9px] font-mono">Visibility Machine advisor</p>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-3">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-xs font-mono ${msg.role === 'model' ? 'bg-slate-900 text-slate-300 border border-slate-850 rounded-tl-none' : 'bg-brand-amber/20 text-slate-100 border border-brand-amber/30 rounded-tr-none'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isSendingChat && (
              <div className="text-[10px] text-slate-500 font-mono animate-pulse">Thinking...</div>
            )}
          </div>
          <div className="p-4 border-t border-slate-900">
            <div className="flex gap-2 bg-slate-900 border border-slate-850 rounded-xl p-2">
              <input value={userQuery} onChange={e => setUserQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendQuery(); }}
                placeholder="Ask about hooks, proof, offers..."
                className="flex-grow bg-transparent text-slate-200 text-xs font-mono px-2 focus:outline-none" />
              <button onClick={handleSendQuery} disabled={isSendingChat || !userQuery.trim()}
                className="bg-brand-amber text-slate-950 p-2 rounded-lg disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
