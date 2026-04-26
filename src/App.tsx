import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ActivityGraph } from '@/components/ActivityGraph';
import { CFSubmission, CFProblem, getUserSubmissions, getAllProblems } from '@/services/api';
import { Search, Shuffle, Languages, CheckCircle2, ChevronRight, Loader2, Sparkles, FileText } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  const [handle, setHandle] = useState<string>('');
  const [activeHandle, setActiveHandle] = useState<string>('');
  const [submissions, setSubmissions] = useState<CFSubmission[]>([]);
  const [problems, setProblems] = useState<CFProblem[]>([]);
  const [loadingBaseData, setLoadingBaseData] = useState(false);
  const [loadingHandle, setLoadingHandle] = useState(false);
  const [error, setError] = useState<string>('');

  const [minRating, setMinRating] = useState<number | string>(800);
  const [maxRating, setMaxRating] = useState<number | string>(1500);

  const [suggestedProblem, setSuggestedProblem] = useState<CFProblem | null>(null);
  const [showTags, setShowTags] = useState(false);
  
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFetchingStatement, setIsFetchingStatement] = useState(false);
  const [translatedStatement, setTranslatedStatement] = useState<ProblemStatement | null>(null);
  const [originalStatement, setOriginalStatement] = useState<ProblemStatement | null>(null);
  const [language, setLanguage] = useState<'en' | 'vi'>('en');

  // Fetch problems on mount
  useEffect(() => {
    setLoadingBaseData(true);
    getAllProblems()
      .then(setProblems)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingBaseData(false));
  }, []);

  const handleSearch = async () => {
    if (!handle) return;
    setLoadingHandle(true);
    setError('');
    try {
      const subs = await getUserSubmissions(handle);
      setSubmissions(subs);
      setActiveHandle(handle);
      localStorage.setItem('cf_handle', handle);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingHandle(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('cf_handle');
    if (saved) {
      setHandle(saved);
      // Wait for next tick so effect bounds correctly if we want auto login
    }
  }, []);

  // Compute solved problem keys set
  const solvedProblemKeys = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach(s => {
      if (s.verdict === 'OK') {
        set.add(`${s.problem.contestId}-${s.problem.index}`);
      }
    });
    return set;
  }, [submissions]);

  const suggestProblem = () => {
    setSuggestedProblem(null);
    setTranslatedStatement(null);
    setOriginalStatement(null);
    setLanguage('en');
    setShowTags(false);

    const currentMin = minRating === '' ? 0 : Number(minRating);
    const currentMax = maxRating === '' ? 4000 : Number(maxRating);

    const candidates = problems.filter(p => {
      if (!p.rating) return false;
      if (p.rating < currentMin || p.rating > currentMax) return false;
      const key = `${p.contestId}-${p.index}`;
      if (solvedProblemKeys.has(key)) return false;
      return true;
    });

    if (candidates.length === 0) {
      setError('Không tìm thấy bài nào phù hợp trong khoảng rating này mà bạn chưa giải.');
      return;
    }

    const rnd = Math.floor(Math.random() * candidates.length);
    setSuggestedProblem(candidates[rnd]);
  };

  const handleViewStatement = async () => {
    if (!suggestedProblem) return;
    setIsFetchingStatement(true);
    setError('');
    const url = `https://codeforces.com/contest/${suggestedProblem.contestId}/problem/${suggestedProblem.index}`;
    try {
      const res = await fetch('/api/problem/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, skipTranslation: true })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOriginalStatement(data.original);
      setLanguage('en');
    } catch (e: any) {
      setError('Lỗi khi tải đề: ' + e.message);
    } finally {
      setIsFetchingStatement(false);
    }
  };

  const handleTranslateToVietnamese = async () => {
    if (!suggestedProblem) return;
    setIsTranslating(true);
    setLanguage('vi');
    setError('');
    const url = `https://codeforces.com/contest/${suggestedProblem.contestId}/problem/${suggestedProblem.index}`;
    try {
      const res = await fetch('/api/problem/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOriginalStatement(data.original);
      if (data.translated) {
        setTranslatedStatement(data.translated);
      } else {
        setError('Không thể dịch tự động do thiếu thiết lập API Key hoặc lỗi dịch thuật. Vui lòng kiểm tra lại API Key trong cửa sổ Settings.');
        setLanguage('en');
      }
    } catch (e: any) {
      setError('Lỗi khi dịch: ' + e.message);
      setLanguage('en');
    } finally {
      setIsTranslating(false);
    }
  };

  // Effect to typeset mathjax
  useEffect(() => {
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      (window as any).MathJax.typesetPromise().catch((err: any) => console.warn('MathJax:', err));
    }
  }, [originalStatement, translatedStatement, language, suggestedProblem]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans flex flex-col">
      {/* Header Navigation similarly to design markup */}
      <nav className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-[#161b22] sticky top-0 z-10 w-full">
        <div className="flex items-center gap-8">
          <div className="text-xl font-bold tracking-tight text-blue-400 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-mono">CF</div>
            <span>SUGGEST <span className="text-slate-500 font-light italic">VN</span></span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#" className="text-blue-400 border-b-2 border-blue-400 pb-[18px] mt-[18px]">Gợi ý bài</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            CF API: {activeHandle ? `Connected (${activeHandle})` : 'Ready'}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[1400px] w-full mx-auto">
        {/* Sidebar / Options */}
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0d1117] p-5 flex flex-col gap-6 overflow-y-auto">
            {activeHandle && (
              <section className="border-b border-slate-800 pb-6 mb-2">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Tiến trình (AC)</span>
                  <span className="text-blue-400 font-bold">{solvedProblemKeys.size} <span className="text-slate-600 font-normal">/ {problems.length || 0}</span></span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full">
                  <div 
                    className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, solvedProblemKeys.size / (problems.length || 1) * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-bold">
                  <span>User: <span className="text-slate-300 normal-case">{activeHandle}</span></span>
                  <span>{submissions.length} Subs</span>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Bộ lọc độ khó (Rating)
              </h3>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1">Từ</label>
                  <input 
                    type="number" 
                    value={minRating}
                    onChange={e => setMinRating(e.target.value === '' ? '' : Number(e.target.value))} 
                    min={0} max={3500} step={100}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1">Đến</label>
                  <input 
                    type="number" 
                    value={maxRating}
                    onChange={e => setMaxRating(e.target.value === '' ? '' : Number(e.target.value))} 
                    min={0} max={4000} step={100}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <button 
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm transition-colors flex items-center justify-center disabled:opacity-50"
                onClick={suggestProblem}
                disabled={loadingBaseData || problems.length === 0}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                {loadingBaseData ? "Đang tải dữ liệu..." : "Gợi ý bài mới"}
              </button>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Dữ liệu hệ thống
              </h3>
              <div className="bg-[#161b22] border border-slate-800 p-4 rounded text-xs text-slate-400 space-y-3 leading-relaxed">
                <p>1. Nhập Handle để hệ thống bỏ qua các bài đã làm.</p>
                <p>2. Chọn độ khó để luyện tập.</p>
                <p>3. Dùng nút <strong className="text-slate-300">Dịch Đề</strong> để nhờ AI dịch bài sang tiếng Việt (giữ nguyên công thức toán).</p>
              </div>
            </section>
          </aside>

          {/* Main Content Area */}
          <section className="flex-1 p-5 md:p-6 flex flex-col gap-6 bg-[#0d1117] overflow-y-auto">
            {/* Header Search inline */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161b22] p-5 rounded-lg border border-slate-800 shrink-0">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Kết nối tài khoản</p>
                <h1 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  Tra cứu thông tin Codeforces
                </h1>
              </div>
              <div className="flex items-center gap-3 w-full md:w-[350px]">
                <Input 
                  placeholder="Nhập Codeforces Handle..." 
                  value={handle} 
                  className="bg-[#0d1117] border-slate-700"
                  onChange={e => setHandle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loadingHandle} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 tracking-wide h-9">
                  {loadingHandle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 ml-1 mr-1" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-500 p-4 rounded-lg border border-red-500/20 text-sm font-medium">
                {error}
              </div>
            )}
            
            {activeHandle && (
              <Card className="bg-[#161b22] border border-slate-800 p-1">
                <CardContent className="p-4 pt-5">
                  <ActivityGraph submissions={submissions} />
                </CardContent>
              </Card>
            )}

            {suggestedProblem && (
              <div className="bg-[#161b22] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-5 md:p-6 relative">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded border border-yellow-500/20 uppercase tracking-widest">RATING {suggestedProblem.rating || 'N/A'}</span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-3 max-w-[85%] pr-8">
                    {suggestedProblem.contestId}{suggestedProblem.index}. {suggestedProblem.name}
                  </h2>
                <div className="flex flex-wrap gap-2 mb-6 items-center">
                  {showTags ? (
                    suggestedProblem.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider rounded">
                        {t}
                      </span>
                    ))
                  ) : (
                    <button 
                      onClick={() => setShowTags(true)}
                      className="px-3 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-[10px] uppercase font-bold tracking-wider rounded border border-slate-700 border-dashed transition-colors"
                    >
                      Nhấn để xem Tags
                    </button>
                  )}
                </div>

                  <div className="flex flex-wrap gap-3">
                    <a 
                      href={`https://codeforces.com/contest/${suggestedProblem.contestId}/problem/${suggestedProblem.index}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center justify-center px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500 transition-all uppercase tracking-wider h-10 whitespace-nowrap whitespace-pre"
                    >
                      Làm bài trên CF <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                    </a>
                    <Button variant="outline" onClick={handleViewStatement} disabled={isFetchingStatement || !!originalStatement} className="px-5 py-2 border border-slate-700 text-slate-300 text-xs font-bold bg-transparent rounded hover:bg-slate-800 transition-all uppercase tracking-wider h-10">
                      {isFetchingStatement ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                      {originalStatement ? "Đã tải đề" : "Xem Đề"}
                    </Button>
                  </div>
                </div>

                {originalStatement && (
                  <div className="border-t border-slate-800 bg-[#0d1117]">
                    
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#161b22] gap-3">
                       <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                          <span>⏱️ {originalStatement.timeLimit}</span>
                          <span>💾 {originalStatement.memoryLimit}</span>
                       </div>
                       <div className="flex p-0.5 bg-[#0d1117] rounded border border-slate-800 shrink-0">
                        <button 
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${language === 'vi' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          onClick={() => {
                            if (!translatedStatement) {
                              handleTranslateToVietnamese();
                            } else {
                              setLanguage('vi');
                            }
                          }}
                          disabled={isTranslating}
                        >
                          {isTranslating ? 'Đang dịch...' : 'Tiếng Việt (AI)'}
                        </button>
                        <button 
                          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${language === 'en' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                          onClick={() => setLanguage('en')}
                        >
                          Tiếng Anh
                        </button>
                      </div>
                    </div>

                    {/* Statement Content */}
                    <div className="p-5 md:p-8 space-y-8 mathjax-support cf-statement text-[15px] text-slate-300 leading-relaxed">
                      {language === 'vi' && isTranslating ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                          <p className="font-bold text-lg text-slate-200">Đang dịch sang Tiếng Việt...</p>
                          <p className="text-sm mt-2 text-slate-500">Vui lòng chờ trong giây lát (có thể mất vài giây tùy độ dài đề bài).</p>
                        </div>
                      ) : (
                        <>
                          {/* Body */}
                          <div dangerouslySetInnerHTML={{ __html: (language === 'vi' && translatedStatement ? translatedStatement.body : originalStatement.body) || '' }} />
                          
                          {/* Input */}
                          {((language === 'vi' && translatedStatement ? translatedStatement.inputSpec : originalStatement.inputSpec) || '') !== '' && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Dữ liệu vào / Input</h3>
                              <div dangerouslySetInnerHTML={{ __html: (language === 'vi' && translatedStatement ? translatedStatement.inputSpec : originalStatement.inputSpec) || '' }} />
                            </div>
                          )}

                          {/* Output */}
                          {((language === 'vi' && translatedStatement ? translatedStatement.outputSpec : originalStatement.outputSpec) || '') !== '' && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Dữ liệu ra / Output</h3>
                              <div dangerouslySetInnerHTML={{ __html: (language === 'vi' && translatedStatement ? translatedStatement.outputSpec : originalStatement.outputSpec) || '' }} />
                            </div>
                          )}

                          {/* Samples - Always Original (never translated to break format) */}
                          {originalStatement.samples.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Ví dụ / Example</h3>
                              <div className="space-y-4">
                                {originalStatement.samples.map((sample, idx) => (
                                  <div key={idx} className="flex flex-col md:flex-row border border-slate-800 rounded-lg overflow-hidden font-mono text-[13px]">
                                    <div className="flex-1 w-full md:w-1/2">
                                      <div className="bg-[#161b22] px-4 py-2 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Input</div>
                                      <div className="p-4 bg-[#0d1117] text-slate-300 overflow-x-auto whitespace-pre font-mono" dangerouslySetInnerHTML={{ __html: sample.input }} />
                                    </div>
                                    <div className="w-full h-px md:w-px md:h-auto bg-slate-800"></div>
                                    <div className="flex-1 w-full md:w-1/2 md:border-t-0">
                                      <div className="bg-[#161b22] px-4 py-2 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Output</div>
                                      <div className="p-4 bg-[#0d1117] text-slate-300 overflow-x-auto whitespace-pre font-mono" dangerouslySetInnerHTML={{ __html: sample.output }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Note */}
                          {(language === 'vi' && translatedStatement ? translatedStatement.note : originalStatement.note) && (
                            <div>
                              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">Giải thích / Note</h3>
                              <div dangerouslySetInnerHTML={{ __html: (language === 'vi' && translatedStatement ? translatedStatement.note : originalStatement.note) || '' }} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </section>
      </main>
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
