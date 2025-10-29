

import React, { useState, useCallback, useMemo } from 'react';
import { analyzeProduct, generateTrioHybridIdeas, generateBlueprint, generateMoreIdeas } from './services/geminiService';
import { AppStep, AnalysisResult, TrioIdea, Blueprint } from './types';

const loadingMessages = [
    "Performing deep analysis on products...",
    "Consulting with digital muses...",
    "Analyzing market vectors...",
    "Synthesizing innovation...",
    "Crafting the next hybrid ideas...",
    "Unleashing creative potential...",
    "Synthesizing all concepts for new angles...",
    "Drafting the blueprint...",
    "Structuring the business model...",
    "Finalizing the launch plan...",
];

const ProductInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; label: string; id: string; }> = ({ value, onChange, placeholder, label, id }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-slate-900/70 text-gray-100 placeholder-gray-500 p-3 rounded-lg border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition duration-300 shadow-sm focus:shadow-md focus:shadow-cyan-500/20"
            aria-label={label}
        />
    </div>
);

const PrimaryButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; }> = ({ onClick, disabled, children }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-lg font-bold py-8 px-4 rounded-lg transition-all duration-300 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none transform hover:scale-[1.02] active:scale-100 disabled:transform-none"
    >
        {children}
    </button>
);

const SecondaryButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; }> = ({ onClick, disabled, children }) => (
    <button
       onClick={onClick}
       disabled={disabled}
       className="w-full text-lg font-bold py-3 px-4 rounded-lg transition-all duration-300 bg-transparent border-2 border-slate-600 hover:bg-slate-800/50 hover:border-slate-500 disabled:border-slate-700 disabled:text-gray-600 disabled:cursor-not-allowed shadow-lg hover:shadow-slate-500/20 disabled:shadow-none"
   >
       {children}
   </button>
);


const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col justify-center items-center space-y-4 p-6 bg-slate-900/70 backdrop-blur-xl rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
         <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium text-gray-300 text-center animate-pulse">{message}</p>
    </div>
);

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);


const App: React.FC = () => {
    const [product1, setProduct1] = useState('');
    const [product2, setProduct2] = useState('');
    const [product3, setProduct3] = useState('');
    const [analyses, setAnalyses] = useState<AnalysisResult[] | null>(null);
    const [allIdeas, setAllIdeas] = useState<TrioIdea[] | null>(null);
    const [thinkingProcess, setThinkingProcess] = useState<string | null>(null);
    const [selectedIdea, setSelectedIdea] = useState<TrioIdea | null>(null);
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
    const [error, setError] = useState<string | null>(null);
    
    const [openAnalyses, setOpenAnalyses] = useState<Set<number>>(new Set());
    const [openIdeas, setOpenIdeas] = useState<Set<number>>(new Set());
    const [isBlueprintOpen, setIsBlueprintOpen] = useState(true);

    const isLoading = useMemo(() => [
        AppStep.ANALYZING,
        AppStep.GENERATING_IDEAS,
        AppStep.GENERATING_BLUEPRINT,
    ].includes(step), [step]);

    const loadingMessage = useMemo(() => {
        switch (step) {
            case AppStep.ANALYZING: return loadingMessages[Math.floor(Math.random() * 4)];
            case AppStep.GENERATING_IDEAS: return loadingMessages[4 + Math.floor(Math.random() * 3)];
            case AppStep.GENERATING_BLUEPRINT: return loadingMessages[7 + Math.floor(Math.random() * 3)];
            default: return "";
        }
    }, [step]);

    const handleAnalyzeProducts = useCallback(async () => {
        if (!product1 || !product2 || !product3) {
            setError('Please enter all three product names.');
            return;
        }
        setError(null);
        setStep(AppStep.ANALYZING);
        try {
            const [res1, res2, res3] = await Promise.all([
                analyzeProduct(product1),
                analyzeProduct(product2),
                analyzeProduct(product3),
            ]);
            setAnalyses([res1, res2, res3]);
            setOpenAnalyses(new Set()); // Start with all analysis cards closed
            setStep(AppStep.ANALYZED);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
            setStep(AppStep.INITIAL);
        }
    }, [product1, product2, product3]);

    const handleGenerateIdeas = useCallback(async () => {
        if (!analyses || analyses.length < 3) return;
        setError(null);
        setStep(AppStep.GENERATING_IDEAS);
        try {
            const { ideas, thinkingProcess } = await generateTrioHybridIdeas(analyses[0], analyses[1], analyses[2]);
            setAllIdeas(ideas);
            setThinkingProcess(thinkingProcess);
            setStep(AppStep.IDEAS_GENERATED);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating ideas.');
            setStep(AppStep.ANALYZED);
        }
    }, [analyses]);

    const handleGenerateBlueprint = useCallback(async () => {
        if (!selectedIdea) return;
        setError(null);
        setStep(AppStep.GENERATING_BLUEPRINT);
        try {
            const newBlueprint = await generateBlueprint(selectedIdea);
            setBlueprint(newBlueprint);
            setIsBlueprintOpen(true);
            setStep(AppStep.BLUEPRINT_GENERATED);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the blueprint.');
            setStep(AppStep.IDEAS_GENERATED);
        }
    }, [selectedIdea]);
    
    const handleGenerateMoreIdeas = useCallback(async () => {
        if (!analyses || !allIdeas) return;
        setError(null);
        const previousStep = step;
        setStep(AppStep.GENERATING_IDEAS); // Reuse for loading state
        try {
            const { ideas, thinkingProcess } = await generateMoreIdeas(analyses, allIdeas);
            setAllIdeas(prev => [...(prev || []), ...ideas]);
            setThinkingProcess(thinkingProcess);
            setStep(previousStep);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating more ideas.');
            setStep(previousStep);
        }
    }, [analyses, allIdeas, step]);
    
    const handleSelectIdea = (idea: TrioIdea) => {
        setSelectedIdea(idea);
        if (blueprint) {
            setBlueprint(null);
            setStep(AppStep.IDEAS_GENERATED);
        }
    };

    const toggleAnalysis = (index: number) => {
        setOpenAnalyses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleIdea = (index: number) => {
         setOpenIdeas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };
    
    const handleStartOver = () => {
        setProduct1('');
        setProduct2('');
        setProduct3('');
        setAnalyses(null);
        setAllIdeas(null);
        setThinkingProcess(null);
        setSelectedIdea(null);
        setBlueprint(null);
        setStep(AppStep.INITIAL);
        setError(null);
        setOpenAnalyses(new Set());
        setOpenIdeas(new Set());
        setIsBlueprintOpen(true);
    };

    const handleShare = useCallback(async () => {
        if (!selectedIdea || !blueprint || !navigator.share) {
            if (typeof navigator.share === 'undefined') {
                 alert("Sharing is not supported on this browser.");
            }
            return;
        }

        const shareText = `
🚀 **Product Idea: ${selectedIdea.ideaName}**

***What It Is:***
${selectedIdea.whatItIs}

***Creative Reasoning:***
${selectedIdea.reasoning}

***Why It's Better:***
${selectedIdea.whyBetter}

---

**📋 Blueprint 📋**

***Key Features (MVP):***
• ${blueprint.keyFeatures.join('\n• ')}

***Target Audience:***
${blueprint.targetAudience}

***Monetization Strategy:***
• ${blueprint.monetizationStrategy.join('\n• ')}
        `.trim().replace(/^\s+/gm, '');

        try {
            await navigator.share({
                title: `Product Idea & Blueprint: ${selectedIdea.ideaName}`,
                text: shareText,
            });
        } catch (err) {
            console.error('Error sharing idea:', err);
        }
    }, [selectedIdea, blueprint]);


    return (
        <div className="min-h-screen text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-['Inter',_sans-serif]">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center my-8 md:my-12">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        Hybrid Product Fusion Lab
                    </h1>
                     <p className="mt-3 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">Hybridize products to spark innovation and create your next big idea.</p>
                </header>
                
                <main className="space-y-12">
                    {step === AppStep.INITIAL && (
                        <section className="bg-slate-900/70 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl space-y-20 animate-fade-in border border-slate-700">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ProductInput id="product1" label="Product 1" value={product1} onChange={(e) => setProduct1(e.target.value)} placeholder="e.g., Drone" />
                                <ProductInput id="product2" label="Product 2" value={product2} onChange={(e) => setProduct2(e.target.value)} placeholder="e.g., Robotic Vacuum" />
                                <ProductInput id="product3" label="Product 3" value={product3} onChange={(e) => setProduct3(e.target.value)} placeholder="e.g., Smart Speaker" />
                            </div>
                           <PrimaryButton onClick={handleAnalyzeProducts} disabled={isLoading || !product1 || !product2 || !product3}>
                                Analyze Products
                            </PrimaryButton>
                        </section>
                    )}

                    {isLoading && <Loader message={loadingMessage} />}
                    
                    {error && <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative animate-fade-in flex items-center gap-3" role="alert">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium">{error}</span>
                    </div>}
                    
                    {step >= AppStep.ANALYZED && analyses && (
                        <section className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {analyses.map((analysis, index) => (
                                    <AnalysisCard 
                                      key={analysis.productName} 
                                      analysis={analysis} 
                                      index={index} 
                                      isOpen={openAnalyses.has(index)}
                                      onToggle={() => toggleAnalysis(index)}
                                    />
                                ))}
                            </div>
                            {step === AppStep.ANALYZED && (
                                <div className="animate-fade-in">
                                     <PrimaryButton onClick={handleGenerateIdeas} disabled={isLoading}>
                                        Generate 3 Hybrid Ideas
                                    </PrimaryButton>
                                </div>
                            )}
                        </section>
                    )}

                    {step >= AppStep.IDEAS_GENERATED && allIdeas && (
                        <section className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Hybrid Ideas</h2>
                                <p className="text-gray-400 mt-2">Select an idea to generate its blueprint.</p>
                            </div>

                            {thinkingProcess && <ThinkingMonitorCard thinkingProcess={thinkingProcess} />}
                            
                            <div className="space-y-8">
                                {allIdeas.map((idea, index) => (
                                     <TrioIdeaCard 
                                        key={index} 
                                        idea={idea} 
                                        index={index}
                                        isSelected={selectedIdea?.ideaName === idea.ideaName}
                                        onSelect={() => handleSelectIdea(idea)}
                                        isOpen={openIdeas.has(index)}
                                        onToggle={() => toggleIdea(index)}
                                    />
                                ))}
                            </div>
                            {step === AppStep.IDEAS_GENERATED && (
                                <footer className="pt-8 animate-fade-in">
                                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedIdea ? (
                                         <PrimaryButton onClick={handleGenerateBlueprint} disabled={isLoading}>
                                            Generate Blueprint for "{selectedIdea.ideaName}"
                                        </PrimaryButton>
                                    ) : (
                                        <div className="bg-slate-800/50 text-slate-400 flex items-center justify-center text-lg font-bold py-3 px-4 rounded-lg">Select an idea first</div>
                                    )}
                                    <PrimaryButton onClick={handleGenerateMoreIdeas} disabled={isLoading}>
                                        Generate More Ideas
                                    </PrimaryButton>
                                    </div>
                                    <div className="mt-6">
                                        <SecondaryButton onClick={handleStartOver} disabled={isLoading}>Start Over</SecondaryButton>
                                    </div>
                                </footer>
                            )}
                        </section>
                    )}

                    {step >= AppStep.BLUEPRINT_GENERATED && blueprint && selectedIdea && (
                        <React.Fragment>
                            <BlueprintCard 
                                blueprint={blueprint} 
                                ideaName={selectedIdea.ideaName}
                                isOpen={isBlueprintOpen}
                                onToggle={() => setIsBlueprintOpen(prev => !prev)}
                            />

                            <footer className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                                <PrimaryButton onClick={handleShare} disabled={isLoading || typeof navigator.share === 'undefined'}>
                                    Share Idea & Blueprint
                                </PrimaryButton>
                                <PrimaryButton onClick={handleGenerateMoreIdeas} disabled={isLoading}>
                                    Generate More Ideas
                                </PrimaryButton>
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <SecondaryButton onClick={handleStartOver} disabled={isLoading}>
                                        Start Over
                                    </SecondaryButton>
                                </div>
                            </footer>
                        </React.Fragment>
                    )}

                </main>
            </div>
        </div>
    );
};

const ThinkingMonitorCard: React.FC<{ thinkingProcess: string }> = ({ thinkingProcess }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-slate-950/80 backdrop-blur-xl rounded-2xl shadow-lg border border-yellow-500/50 animate-fade-in">
            <button
                className="w-full p-6 text-left flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    <h2 className="text-2xl font-bold text-yellow-400">AI Creative Strategy Log</h2>
                </div>
                <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
                <div className="px-6 pb-6 pt-2 border-t border-yellow-500/50">
                    <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {thinkingProcess}
                    </pre>
                </div>
            </div>
        </div>
    );
};

const TrioIdeaCard: React.FC<{ idea: TrioIdea, index: number, isSelected: boolean, onSelect: () => void, isOpen: boolean, onToggle: () => void }> = ({ idea, index, isSelected, onSelect, isOpen, onToggle }) => {
    const baseClasses = "bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-lg border-2 transition-all duration-300 group animate-slide-in";
    const selectedClasses = isSelected 
        ? 'border-purple-500 ring-4 ring-purple-500/40 scale-[1.03] shadow-2xl shadow-purple-500/20' 
        : 'border-slate-700 hover:border-purple-500 hover:-translate-y-1.5';

    const handleHeaderClick = () => {
        onSelect();
        onToggle();
    };

    return (
        <div
            className={`${baseClasses} ${selectedClasses}`}
            style={{ animationDelay: `${index * 150}ms`}}
        >
            <button
                className="w-full p-6 sm:p-8 text-left flex justify-between items-center"
                onClick={handleHeaderClick}
                aria-pressed={isSelected}
                aria-expanded={isOpen}
            >
                <div>
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 transition-all group-hover:from-cyan-300 group-hover:to-purple-300">{idea.ideaName}</h3>
                    <div className="mt-2">
                        <span className="bg-purple-500/20 text-purple-300 text-sm font-bold px-3 py-1 rounded-full">Idea #{index + 1}</span>
                    </div>
                </div>
                <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`collapsible-content ${isOpen ? 'open' : ''} ${isOpen ? 'border-t border-slate-700' : ''}`}>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-8 space-y-6">
                    <IdeaDetail title="What It Is" content={idea.whatItIs} />
                    <IdeaDetail title="Creative Reasoning" content={idea.reasoning} />
                    <IdeaDetail title="Why It's Better" content={idea.whyBetter} />
                </div>
            </div>
        </div>
    );
};


const IdeaDetail: React.FC<{ title: string; content: string }> = ({ title, content }) => (
    <div>
        <h4 className="text-xl font-semibold text-cyan-300 mb-2">{title}</h4>
        <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{content}</p>
    </div>
);


const AnalysisDetail: React.FC<{title: React.ReactNode; items: string[] | string;}> = ({ title, items }) => (
    <div>
        <h3 className="text-lg font-semibold mb-3 border-b-2 border-slate-700 pb-2 flex items-center gap-2">
            {title}
        </h3>
        {Array.isArray(items) ? (
             <ul className="list-disc list-inside space-y-1.5 text-gray-300 pl-1">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        ) : (
            <p className="text-gray-300">{items}</p>
        )}
    </div>
);


const AnalysisCard: React.FC<{ analysis: AnalysisResult, index: number, isOpen: boolean, onToggle: () => void }> = ({ analysis, index, isOpen, onToggle }) => (
    <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-700 animate-slide-in transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cyan-500/20" style={{ animationDelay: `${index * 100}ms`}}>
        <button onClick={onToggle} className="w-full p-6 text-left" aria-expanded={isOpen}>
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-cyan-400">{analysis.productName}</h2>
                <ChevronIcon isOpen={isOpen} />
            </div>
        </button>
        <div className={`collapsible-content ${isOpen ? 'open' : ''} ${isOpen ? 'border-t border-slate-700' : ''}`}>
            <div className="px-6 pb-6 pt-8 space-y-6">
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> <span className="text-green-400">Strengths</span></>} items={analysis.strengths} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> <span className="text-red-400">Flaws</span></>} items={analysis.flaws} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> <span className="text-cyan-400">Human Impact</span></>} items={analysis.humanImpact} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> <span className="text-cyan-400">Missed Opportunities</span></>} items={analysis.missedOpportunities} />
                
                 {analysis.sources.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-500 mb-2">Sources:</h4>
                        <div className="flex flex-wrap gap-2">
                            {analysis.sources.slice(0, 3).map((source, i) => (
                                <a href={source.uri} key={i} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-700/50 hover:bg-slate-700 text-cyan-400 px-2.5 py-1 rounded-full transition duration-300 truncate" title={source.title}>
                                   {new URL(source.uri).hostname}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const BlueprintDetail: React.FC<{title: React.ReactNode; items: string[] | string;}> = ({ title, items }) => (
    <div>
        <h3 className="text-xl font-semibold mb-3 border-b-2 border-slate-700 pb-3 flex items-center gap-3">
            {title}
        </h3>
        {Array.isArray(items) ? (
             <ul className="list-disc list-inside space-y-2 text-gray-300 pl-1 text-lg">
                {items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        ) : (
            <p className="text-gray-300 text-lg leading-relaxed">{items}</p>
        )}
    </div>
);


const BlueprintCard: React.FC<{ blueprint: Blueprint, ideaName: string, isOpen: boolean, onToggle: () => void }> = ({ blueprint, ideaName, isOpen, onToggle }) => (
    <section className="space-y-8 animate-fade-in">
        <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-green-500/50 shadow-green-500/20">
            <button onClick={onToggle} className="w-full p-6 sm:p-8 text-left flex justify-between items-center" aria-expanded={isOpen}>
                 <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">Blueprint: {ideaName}</h2>
                 <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`collapsible-content ${isOpen ? 'open' : ''} ${isOpen ? 'border-t border-slate-700' : ''}`}>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-8 space-y-8">
                    <BlueprintDetail 
                        title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V4m0 16v-2M8 12a4 4 0 118 0 4 4 0 01-8 0z" /></svg><span className="text-green-400">Key Features (MVP)</span></>} 
                        items={blueprint.keyFeatures} 
                    />
                    <BlueprintDetail 
                        title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg><span className="text-green-400">Target Audience</span></>} 
                        items={blueprint.targetAudience} 
                    />
                    <BlueprintDetail 
                        title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 2.01M12 18v-1m0-1v-1m0-1V4.01M12 6.01V4m0 14V12m0 0v6m0-6H6m6 0h6" /></svg><span className="text-green-400">Monetization Strategy</span></>} 
                        items={blueprint.monetizationStrategy} 
                    />
                </div>
            </div>
        </div>
    </section>
);


const style = document.createElement('style');
style.innerHTML = `
body {
    background: linear-gradient(-45deg, #020617, #0f172a, #111827, #1e293b);
    background-size: 400% 400%;
    animation: gradientBG 25s ease infinite;
}
@keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}
@keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes slide-in {
    from { opacity: 0; transform: translateY(20px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
}
.animate-slide-in {
    animation: slide-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
.collapsible-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.4s ease-in-out;
}
.collapsible-content.open {
    grid-template-rows: 1fr;
}
.collapsible-content > div {
    overflow: hidden;
}
`;
document.head.appendChild(style);

export default App;