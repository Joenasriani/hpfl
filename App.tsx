import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { analyzeProduct, generateHybridIdeas, generateBlueprint } from './services/geminiService';
import { AppStep, AnalysisResult, HybridIdea, Blueprint, DIYStep } from './types';

// --- UI Components ---

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "bg-black text-white" }) => (
    <div className={`inline-block text-sm font-bold uppercase tracking-widest py-1 px-3 mb-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}>
        {children}
    </div>
);

const ProductInput: React.FC<{ 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder: string; 
    label: string; 
    id: string; 
    disabled?: boolean;
}> = ({ value, onChange, placeholder, label, id, disabled = false }) => (
    <div className="w-full relative">
        <label htmlFor={id} className="block text-xs font-bold text-black uppercase mb-2">
            {label}
        </label>
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-white text-black placeholder-gray-400 p-4 border-4 border-black focus:outline-none focus:shadow-[8px_8px_0px_0px_#FF69B4] transition-all duration-150 font-mono text-sm disabled:bg-gray-200 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            aria-label={label}
            disabled={disabled}
            autoComplete="off"
        />
    </div>
);

const PrimaryButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; color?: string }> = ({ onClick, disabled, children, color = "bg-[#3B82F6]" }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full relative overflow-hidden transition-all duration-150 transform hover:-translate-y-1 hover:-translate-x-1 active:translate-x-0 active:translate-y-0 active:shadow-none border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${color} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
    >
        <span className="relative z-10 block py-4 px-6 text-sm font-bold uppercase tracking-widest text-white flex items-center justify-center gap-2">
            {children}
        </span>
    </button>
);

const SecondaryButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; }> = ({ onClick, disabled, children }) => (
    <button
       onClick={onClick}
       disabled={disabled}
       className="w-full text-sm font-bold uppercase tracking-widest py-4 px-6 transition-all duration-150 bg-white border-4 border-black text-black hover:bg-gray-100 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
   >
       {children}
   </button>
);

const ActionButton: React.FC<{ onClick: () => void; disabled: boolean; label: string }> = ({ onClick, disabled, label }) => (
    <button 
        onClick={onClick} 
        className="h-14 w-14 bg-[#FF6B6B] hover:bg-[#ff5252] border-4 border-black text-black transition-all duration-150 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 active:translate-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={label}
        disabled={disabled}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
        </svg>
    </button>
);

const AddButton: React.FC<{ onClick: () => void; disabled: boolean }> = ({ onClick, disabled }) => (
    <button
        onClick={onClick}
        className="h-14 w-14 bg-[#84CC16] hover:bg-[#65a30d] border-4 border-black text-black transition-all duration-150 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 active:translate-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Add Product"
        disabled={disabled}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
    </button>
);


const Loader: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col justify-center items-center space-y-6 p-8 border-4 border-black bg-white w-full max-w-lg mx-auto shadow-[12px_12px_0px_0px_#000]">
        <div className="flex gap-2">
            <div className="w-6 h-6 bg-[#FF69B4] border-2 border-black animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-6 h-6 bg-[#3B82F6] border-2 border-black animate-bounce" style={{ animationDelay: '100ms' }}></div>
            <div className="w-6 h-6 bg-[#84CC16] border-2 border-black animate-bounce" style={{ animationDelay: '200ms' }}></div>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-black bg-[#FACC15] px-2 py-1 border-2 border-black">{message}</p>
    </div>
);

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div className={`border-2 border-black p-1 bg-white transition-transform duration-150 ${isOpen ? 'rotate-180 bg-black text-white' : 'text-black'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
    </div>
);

const AnalysisSection: React.FC<{ title: string; content: string | string[] }> = ({ title, content }) => {
    const renderContent = () => {
        if (Array.isArray(content) && content.length > 0) {
            return (
                <ul className="list-none space-y-2 mt-3">
                    {content.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-black font-mono leading-snug">
                            <span className="text-black mt-1.5 w-2 h-2 bg-black shrink-0 block" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            );
        }
        if (typeof content === 'string' && content) {
            return <p className="text-sm text-black font-mono leading-snug mt-2 whitespace-pre-wrap">{content}</p>;
        }
        return <p className="text-sm text-gray-500 italic mt-1 border border-black border-dashed p-2">Data unavailable</p>;
    };
    return (
        <div className="pb-4 border-b-2 border-black last:border-0">
            <h4 className="text-xs font-black text-white bg-black inline-block px-2 py-1 uppercase mt-4">{title}</h4>
            {renderContent()}
        </div>
    );
};


const AnalysisCard: React.FC<{ analysis: AnalysisResult; index: number; isOpen: boolean; onToggle: () => void; }> = ({ analysis, index, isOpen, onToggle }) => {
    return (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#000] transition-all duration-150">
            <button onClick={onToggle} className="w-full text-left p-6 flex justify-between items-center group bg-white hover:bg-gray-50">
                <div className="flex flex-col items-start gap-2">
                     <span className="text-xs font-bold bg-[#84CC16] text-black px-2 py-0.5 border-2 border-black uppercase tracking-widest">Vector 0{index + 1}</span>
                     <h3 className="text-xl font-black text-black uppercase tracking-tight">{analysis.productName}</h3>
                </div>
                <ChevronIcon isOpen={isOpen} />
            </button>
            {isOpen && (
                <div className="px-6 pb-8 pt-2 space-y-4 border-t-4 border-black bg-[#F3F4F6]">
                    <div className="grid grid-cols-1 gap-4">
                        <AnalysisSection title="Introduction" content={analysis.introduction} />
                        <AnalysisSection title="Origin" content={analysis.manufacturingOrigin} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <AnalysisSection title="Strengths" content={analysis.strengths} />
                             <AnalysisSection title="Flaws" content={analysis.flaws} />
                        </div>
                        <AnalysisSection title="Human Impact" content={analysis.humanImpact} />
                        <AnalysisSection title="Missed Opportunities" content={analysis.missedOpportunities} />
                        <AnalysisSection title="Enhancement Ideas" content={analysis.enhancementIdeas} />
                        <AnalysisSection title="Unforeseen Flaws" content={analysis.unforeseenFlaws} />
                    </div>
                </div>
            )}
        </div>
    );
};

const IdeaCard: React.FC<{ idea: HybridIdea; index: number; isSelected: boolean; onSelect: () => void; isOpen: boolean; onToggle: () => void; }> = ({ idea, index, isSelected, onSelect, isOpen, onToggle }) => {
    return (
        <div className={`transition-all duration-150 bg-white border-4 border-black ${isSelected ? 'shadow-[12px_12px_0px_0px_#FACC15] -translate-y-2 -translate-x-2' : 'shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#000]'}`}>
            <button onClick={onToggle} className={`w-full text-left p-6 flex justify-between items-center group border-b-4 ${isSelected ? 'bg-[#FEF9C3] border-black' : 'bg-white border-transparent'}`}>
                <div className="flex flex-col items-start gap-2">
                    <span className="text-xs font-bold bg-[#FF69B4] text-white px-2 py-0.5 border-2 border-black uppercase tracking-widest">Concept 0{index + 1}</span>
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">{idea.ideaName}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {isSelected && <span className="text-xs font-black uppercase bg-black text-[#FACC15] px-2 py-1 border-2 border-[#FACC15]">Active</span>}
                    <ChevronIcon isOpen={isOpen} />
                </div>
            </button>
            {isOpen && (
                <div className="px-6 pb-6 pt-6 space-y-6 bg-white">
                    <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] bg-[#F0FDFA]">
                        <h4 className="text-xs font-black bg-black text-white inline-block px-2 uppercase mb-2">The Concept</h4>
                        <p className="text-sm text-black font-mono leading-relaxed">{idea.whatItIs}</p>
                    </div>
                    <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] bg-[#FEF2F2]">
                        <h4 className="text-xs font-black bg-black text-white inline-block px-2 uppercase mb-2">Logic</h4>
                        <p className="text-sm text-black font-mono leading-relaxed">{idea.reasoning}</p>
                    </div>
                     <div className="border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] bg-[#EFF6FF]">
                        <h4 className="text-xs font-black bg-black text-white inline-block px-2 uppercase mb-2">Advantage</h4>
                        <p className="text-sm text-black font-mono leading-relaxed">{idea.whyBetter}</p>
                    </div>
                    <div className="pt-4">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSelect(); }}
                            className={`w-full text-sm font-bold uppercase tracking-widest py-4 border-4 border-black transition-all duration-150 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 active:translate-0 active:shadow-none ${isSelected ? 'bg-black text-[#FACC15]' : 'bg-[#FACC15] text-black'}`}
                        >
                            {isSelected ? 'Deselect Concept' : 'Select Concept'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SecuredCSLLog: React.FC<{ log: string }> = ({ log }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = () => {
        if (passwordInput === '13579') {
            setIsUnlocked(true);
            setError(null);
            setPasswordInput('');
        } else {
            setError('ACCESS DENIED');
            setPasswordInput('');
        }
    };

    if (isUnlocked) {
        const sections = log.split(/\n\n---\n\n/);
        return (
            <div className="bg-black border-4 border-black p-8 space-y-6 font-mono text-sm relative shadow-[12px_12px_0px_0px_#84CC16]">
                <div className="flex justify-between items-center mb-6 border-b-4 border-[#84CC16] pb-4">
                    <h3 className="text-base font-bold text-[#84CC16] uppercase tracking-widest">System_Logs_V2.0</h3>
                    <button onClick={() => setIsUnlocked(false)} className="text-xs text-white bg-red-600 px-2 py-1 border border-white hover:bg-red-500 uppercase">
                        [Terminate]
                    </button>
                </div>
                <div className="space-y-8 h-96 overflow-y-auto pr-4 scrollbar-hide">
                    {sections.map((section, index) => {
                        const lines = section.split('\n');
                        const titleLine = lines.find(line => line.startsWith('##'));
                        const title = titleLine ? titleLine.replace('##', '').trim() : `LOG_ENTRY_${index + 1}`;
                        const content = lines.filter(line => !line.startsWith('##') && line.trim() !== '').join('\n');
                        return (
                            <div key={index} className="mb-8 text-green-400">
                                <div className="bg-[#84CC16] text-black font-bold mb-3 text-xs uppercase inline-block px-2">{`> ${title}`}</div>
                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed pl-4 border-l-4 border-[#84CC16]">{content}</pre>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-black border-4 border-black p-12 flex flex-col items-center justify-center space-y-6 shadow-[12px_12px_0px_0px_#84CC16]">
            <div className="text-lg font-bold font-mono text-[#84CC16] uppercase tracking-widest border-2 border-[#84CC16] p-2">Encrypted Log Stream</div>
            <div className="flex w-full max-w-md">
                <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    className="flex-1 bg-white text-black placeholder-gray-500 p-4 border-4 border-r-0 border-white focus:outline-none font-mono"
                    placeholder="ENTER PASSKEY"
                />
                <button onClick={handleUnlock} className="bg-[#84CC16] text-black border-4 border-white px-6 font-bold uppercase tracking-wider hover:bg-[#65a30d] transition-colors">
                    Unlock
                </button>
            </div>
            {error && <p className="text-red-500 bg-black border border-red-500 px-2 text-xs font-bold uppercase tracking-wider animate-pulse">{error}</p>}
        </div>
    );
};

const BlueprintCard: React.FC<{ blueprint: Blueprint; isOpen: boolean; onToggle: () => void; }> = ({ blueprint, isOpen, onToggle }) => {
    const renderList = (items: string[]) => (
        <ul className="list-decimal list-inside space-y-2 mt-3 bg-white p-4 border-2 border-black">
             {items.map((item, i) => (
                <li key={i} className="text-sm text-black font-mono pl-2">
                    <span className="font-bold">{item}</span>
                </li>
            ))}
        </ul>
    );

    const renderDIY = (steps: DIYStep[]) => (
        <div className="space-y-8">
            {steps.map(step => (
                <div key={step.step} className="relative bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#000]">
                    <div className="absolute -top-4 left-4 bg-black text-white px-3 py-1 text-xs font-bold uppercase border-2 border-white shadow-[2px_2px_0px_0px_#000]">
                        Phase {step.step} // {step.title}
                    </div>
                    <p className="text-sm text-black font-mono mb-4 mt-2 italic border-l-4 border-[#FACC15] pl-3">{step.description}</p>
                    {renderList(step.actionableItems)}
                </div>
            ))}
        </div>
    );

    return (
         <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#000] transition-all duration-150">
            <button onClick={onToggle} className="w-full text-left p-8 flex justify-between items-center group bg-[#3B82F6]">
                <div>
                    <span className="text-xs font-bold bg-black text-white px-2 py-0.5 mb-2 inline-block uppercase tracking-widest">Blueprint Specs</span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{blueprint.title}</h2>
                </div>
                <ChevronIcon isOpen={isOpen} />
            </button>
            {isOpen && (
                <div className="px-8 pb-10 pt-8 space-y-10 bg-white border-t-4 border-black">
                    <section className="bg-[#FEF9C3] p-6 border-2 border-black">
                        <h3 className="text-sm font-black text-black uppercase tracking-widest mb-2 bg-[#FACC15] inline-block px-2 border-2 border-black">Executive Summary</h3>
                        <p className="text-sm text-black font-mono leading-relaxed mt-2">{blueprint.abstract}</p>
                    </section>
                    
                    <section>
                        <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">1.0 // Introduction</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 border-2 border-black"><h4 className="text-xs font-black bg-black text-white inline-block px-2 mb-2">Problem</h4><p className="text-sm font-mono">{blueprint.introduction.problemStatement}</p></div>
                            <div className="bg-gray-50 p-4 border-2 border-black"><h4 className="text-xs font-black bg-black text-white inline-block px-2 mb-2">Solution</h4><p className="text-sm font-mono">{blueprint.introduction.proposedSolution}</p></div>
                            <div className="bg-gray-50 p-4 border-2 border-black"><h4 className="text-xs font-black bg-black text-white inline-block px-2 mb-2">Value</h4><p className="text-sm font-mono">{blueprint.introduction.valueProposition}</p></div>
                        </div>
                    </section>

                     <section>
                        <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">2.0 // Market Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#E0F2FE] p-4 border-2 border-black"><h4 className="text-xs font-black text-black mb-2 uppercase">Audience</h4><p className="text-xs font-mono">{blueprint.marketAnalysis.targetAudience}</p></div>
                            <div className="bg-[#E0F2FE] p-4 border-2 border-black"><h4 className="text-xs font-black text-black mb-2 uppercase">Size</h4><p className="text-xs font-mono">{blueprint.marketAnalysis.marketSize}</p></div>
                            <div className="bg-[#E0F2FE] p-4 border-2 border-black"><h4 className="text-xs font-black text-black mb-2 uppercase">Landscape</h4><p className="text-xs font-mono">{blueprint.marketAnalysis.competitiveLandscape}</p></div>
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">3.0 // Specifications</h3>
                         <div className="space-y-8">
                            <div><h4 className="text-sm font-bold uppercase bg-black text-white inline-block px-2 mb-2">Key Features</h4>{renderList(blueprint.productSpecification.keyFeatures)}</div>
                            <div><h4 className="text-sm font-bold uppercase bg-black text-white inline-block px-2 mb-2">Stack</h4>{renderList(blueprint.productSpecification.techStack)}</div>
                            <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000]">
                                <h4 className="text-sm font-bold text-center uppercase bg-[#FACC15] border-2 border-black p-2 mb-6 inline-block mx-auto block w-max">{blueprint.productSpecification.userJourneyDiagram.title}</h4>
                                <div className="opacity-100 filter-none" dangerouslySetInnerHTML={{ __html: blueprint.productSpecification.userJourneyDiagram.svg }} />
                            </div>
                            <div className="p-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000]">
                                <h4 className="text-sm font-bold text-center uppercase bg-[#FACC15] border-2 border-black p-2 mb-6 inline-block mx-auto block w-max">{blueprint.productSpecification.architectureDiagram.title}</h4>
                                <div className="opacity-100 filter-none" dangerouslySetInnerHTML={{ __html: blueprint.productSpecification.architectureDiagram.svg }} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">4.0 // Strategy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><h4 className="text-sm font-bold uppercase bg-black text-white inline-block px-2 mb-2">Monetization</h4>{renderList(blueprint.businessStrategy.monetizationStrategy)}</div>
                            <div><h4 className="text-sm font-bold uppercase bg-black text-white inline-block px-2 mb-2">Go-To-Market</h4>{renderList(blueprint.businessStrategy.goToMarketPlan)}</div>
                        </div>
                    </section>

                    <section>
                         <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">5.0 // Execution</h3>
                         {renderDIY(blueprint.implementationRoadmap.diyGuide)}
                    </section>
                    
                    <section>
                        <h3 className="text-lg font-black text-black uppercase border-b-4 border-black pb-2 mb-6">6.0 // Synthesis</h3>
                        <div className="bg-black text-white p-6 border-4 border-[#FACC15]">
                            <p className="text-sm font-mono leading-relaxed">{blueprint.conclusion}</p>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
    const [products, setProducts] = useState<string[]>(['', '']);
    const [analyses, setAnalyses] = useState<AnalysisResult[] | null>(null);
    const [allIdeas, setAllIdeas] = useState<HybridIdea[] | null>(null);
    const [aiLog, setAiLog] = useState<string | null>(null);
    const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
    const [blueprints, setBlueprints] = useState<Map<string, Blueprint>>(new Map());
    const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
    const [error, setError] = useState<string | null>(null);
    
    const [openAnalyses, setOpenAnalyses] = useState<Set<number>>(new Set());
    const [openIdeas, setOpenIdeas] = useState<Set<number>>(new Set());
    const [openBlueprints, setOpenBlueprints] = useState<Set<string>>(new Set());

    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('INITIALIZING...');
    const messageIntervalRef = useRef<number | null>(null);

    const loaderRef = useRef<HTMLDivElement>(null);
    const analysesRef = useRef<HTMLDivElement>(null);
    const ideasRef = useRef<HTMLDivElement>(null);
    const blueprintRef = useRef<HTMLDivElement>(null);

    const thinkingMessages = [
        'CRUNCHING DATA...',
        'SMASHING ATOMS...',
        'GENERATING CHAOS...',
        'BREWING CONCEPTS...',
        'FORGING BLUEPRINTS...',
        'IGNITING NEURONS...',
    ];


    const isLoading = useMemo(() => [
        AppStep.ANALYZING,
        AppStep.GENERATING_IDEAS,
        AppStep.GENERATING_BLUEPRINT,
    ].includes(step), [step]);

    useEffect(() => {
        if (isLoading) {
            let i = 0;
            setCurrentLoadingMessage(thinkingMessages[i]);
            messageIntervalRef.current = window.setInterval(() => {
                i = (i + 1) % thinkingMessages.length;
                setCurrentLoadingMessage(thinkingMessages[i]);
            }, 1500);
        } else {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current);
                messageIntervalRef.current = null;
            }
        }
        return () => {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current);
            }
        };
    }, [isLoading]);
    
     useEffect(() => {
        const scrollToElement = (ref: React.RefObject<HTMLElement>, block: ScrollLogicalPosition = 'center') => {
            setTimeout(() => {
                ref.current?.scrollIntoView({ behavior: 'smooth', block });
            }, 100);
        };

        switch (step) {
            case AppStep.ANALYZING:
            case AppStep.GENERATING_IDEAS:
            case AppStep.GENERATING_BLUEPRINT:
                scrollToElement(loaderRef, 'end');
                break;
            case AppStep.ANALYZED:
                scrollToElement(analysesRef, 'start');
                break;
            case AppStep.IDEAS_GENERATED:
                scrollToElement(ideasRef, 'start');
                break;
            case AppStep.BLUEPRINT_GENERATED:
                scrollToElement(blueprintRef, 'start');
                break;
            default:
                break;
        }
    }, [step]);


    const handleAddProduct = () => {
        if (products.length < 5) {
            setProducts([...products, '']);
        }
    };

    const handleRemoveProduct = (index: number) => {
        if (products.length > 2) {
            const newProducts = [...products];
            newProducts.splice(index, 1);
            setProducts(newProducts);
        }
    };
    
    const handleProductChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newProducts = [...products];
        newProducts[index] = e.target.value;
        setProducts(newProducts);
    };

    const handleAnalyzeProducts = useCallback(async () => {
        const validProducts = products.map(p => p.trim()).filter(p => p);
        if (validProducts.length < 2) {
            setError('ENTER 2 PRODUCTS MINIMUM');
            return;
        }
        setError(null);
        setStep(AppStep.ANALYZING);
        try {
            const results = await Promise.all(
                validProducts.map(p => analyzeProduct(p))
            );
            setAnalyses(results);
            const combinedLogs = results.map(r => `## Analysis Log: ${r.productName}\n\n${r.analysisLog}`).join('\n\n---\n\n');
            setAiLog(combinedLogs);
            setOpenAnalyses(new Set()); 
            setStep(AppStep.ANALYZED);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.INITIAL);
        }
    }, [products]);

    const handleGenerateIdeas = useCallback(async () => {
        if (!analyses || analyses.length < 2) return;
        setError(null);
        setStep(AppStep.GENERATING_IDEAS);
        try {
            const { ideas, thinkingProcess } = await generateHybridIdeas(analyses, []);
            setAllIdeas(ideas);
            setAiLog(prevLog => `${prevLog || ''}\n\n---\n\n## Idea Generation Log\n\n${thinkingProcess}`);
            setOpenIdeas(new Set());
            setStep(AppStep.IDEAS_GENERATED);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.ANALYZED);
        }
    }, [analyses]);

    const handleGenerateBlueprint = useCallback(async () => {
        if (selectedIdeas.size === 0 || !analyses || !allIdeas) return;
        setError(null);
        setStep(AppStep.GENERATING_BLUEPRINT);
        try {
            const ideasToProcess = Array.from(selectedIdeas)
                .map(ideaName => allIdeas.find(idea => idea.ideaName === ideaName))
                .filter((idea): idea is HybridIdea => !!idea);
            
            const newBlueprintPromises = ideasToProcess
                .filter(idea => !blueprints.has(idea.ideaName))
                .map(idea => generateBlueprint(analyses, idea).then(bp => ({ ideaName: idea.ideaName, blueprint: bp })));

            if (newBlueprintPromises.length > 0) {
                const newResults = await Promise.all(newBlueprintPromises);
                
                setBlueprints(prev => {
                    const newMap = new Map(prev);
                    newResults.forEach(({ ideaName, blueprint }) => {
                        newMap.set(ideaName, blueprint as Blueprint);
                    });
                    return newMap;
                });

                setOpenBlueprints(prev => {
                    const newSet = new Set(prev);
                    newResults.forEach(({ blueprint }) => {
                        const bp = blueprint as Blueprint;
                        if (bp && bp.title) {
                            newSet.add(bp.title);
                        }
                    });
                    return newSet;
                });
            }

            setStep(AppStep.BLUEPRINT_GENERATED);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.IDEAS_GENERATED);
        }
    }, [selectedIdeas, analyses, allIdeas, blueprints]);
    
    const handleGenerateMoreIdeas = useCallback(async () => {
        if (!analyses || !allIdeas) return;
        setError(null);
        const previousStep = step;
        setStep(AppStep.GENERATING_IDEAS); 
        try {
            const { ideas, thinkingProcess: newThinkingProcessPart } = await generateHybridIdeas(analyses, allIdeas);
            setAllIdeas(prev => [...(prev || []), ...ideas]);
            setAiLog(prevLog => `${prevLog || ''}\n\n---\n\n## Additional Idea Generation Log\n\n${newThinkingProcessPart}`);
            setStep(previousStep);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(previousStep);
        }
    }, [analyses, allIdeas, step]);
    
    const handleSelectIdea = (idea: HybridIdea) => {
        setSelectedIdeas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idea.ideaName)) {
                newSet.delete(idea.ideaName);
            } else {
                newSet.add(idea.ideaName);
            }
            return newSet;
        });

        setBlueprints(prev => {
            const newMap = new Map(prev);
            if (prev.has(idea.ideaName)) {
                const blueprintToRemove = newMap.get(idea.ideaName);
                if (blueprintToRemove) {
                    const titleToRemove = (blueprintToRemove as Blueprint).title;
                    setTimeout(() => {
                        setOpenBlueprints(prevOpen => {
                            const newOpenSet = new Set(prevOpen);
                            newOpenSet.delete(titleToRemove);
                            return newOpenSet;
                        });
                    }, 0);
                }
                newMap.delete(idea.ideaName);
            }
            if (newMap.size === 0 && step === AppStep.BLUEPRINT_GENERATED) {
                 setTimeout(() => setStep(AppStep.IDEAS_GENERATED), 0);
            }
            return newMap;
        });
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
    
     const toggleBlueprint = (title: string) => {
        setOpenBlueprints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(title)) {
                newSet.delete(title);
            } else {
                newSet.add(title);
            }
            return newSet;
        });
    };
    
    const handleStartOver = () => {
        setProducts(['', '']);
        setAnalyses(null);
        setAllIdeas(null);
        setAiLog(null);
        setSelectedIdeas(new Set());
        setBlueprints(new Map());
        setStep(AppStep.INITIAL);
        setError(null);
        setOpenAnalyses(new Set());
        setOpenIdeas(new Set());
        setOpenBlueprints(new Set());
    };

    const handleExportBlueprints = useCallback((blueprintsToExport: Blueprint[]) => {
        if (!blueprintsToExport || blueprintsToExport.length === 0) return;

        const listToHtml = (items: string[]) => `<ul style="margin-top:0; padding-left: 20px;">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        const diyToHtml = (steps: DIYStep[]) => steps.map(step => `
            <div style="margin-bottom: 15px; border: 2px solid black; padding: 15px;">
                <strong style="background: black; color: white; padding: 2px 5px;">Step ${step.step}: ${step.title}</strong>
                <p>${step.description}</p>
                ${listToHtml(step.actionableItems)}
            </div>
        `).join('');

        const styles = `
            <style>
                @media print {
                    @page { margin: 0.8in; }
                }
                body { font-family: 'Courier New', Courier, monospace; line-height: 1.5; color: #000; background: #fff; }
                h1 { font-size: 22pt; font-weight: 900; text-transform: uppercase; border: 4px solid #000; padding: 10px; margin-bottom: 20px; text-align: center; background: #FACC15; }
                h2 { font-size: 14pt; font-weight: 900; text-transform: uppercase; margin-top: 25px; margin-bottom: 10px; background: #000; color: #fff; padding: 5px 10px; display: inline-block; }
                h3 { font-size: 11pt; font-weight: 700; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; border-bottom: 2px solid #000; display: inline-block; }
                p { font-size: 10pt; margin-bottom: 10px; text-align: left; }
                li { font-size: 10pt; margin-bottom: 4px; }
                svg { max-width: 100%; height: auto; border: 2px solid #000; margin: 10px 0; background: #fff; }
                .page-break { page-break-before: always; }
            </style>
        `;
        
        const allBlueprintsHtml = blueprintsToExport.map((blueprint, idx) => `
            <div class="${idx > 0 ? 'page-break' : ''}">
                <h1>${blueprint.title}</h1>
                <p><strong>ABSTRACT:</strong> ${blueprint.abstract}</p>
                
                <h2>1.0 INTRODUCTION</h2><br>
                <h3>PROBLEM</h3><p>${blueprint.introduction.problemStatement}</p>
                <h3>SOLUTION</h3><p>${blueprint.introduction.proposedSolution}</p>
                <h3>VALUE</h3><p>${blueprint.introduction.valueProposition}</p>

                <h2>2.0 MARKET</h2><br>
                <h3>AUDIENCE</h3><p>${blueprint.marketAnalysis.targetAudience}</p>
                <h3>SIZE</h3><p>${blueprint.marketAnalysis.marketSize}</p>
                <h3>LANDSCAPE</h3><p>${blueprint.marketAnalysis.competitiveLandscape}</p>

                <h2>3.0 SPECS</h2><br>
                <h3>FEATURES</h3>${listToHtml(blueprint.productSpecification.keyFeatures)}
                <h3>TECH STACK</h3>${listToHtml(blueprint.productSpecification.techStack)}
                <h3>USER JOURNEY</h3>
                <div>${blueprint.productSpecification.userJourneyDiagram.svg}</div>
                <h3>ARCHITECTURE</h3>
                <div>${blueprint.productSpecification.architectureDiagram.svg}</div>

                <h2>4.0 STRATEGY</h2><br>
                <h3>MONETIZATION</h3>${listToHtml(blueprint.businessStrategy.monetizationStrategy)}
                <h3>GTM</h3>${listToHtml(blueprint.businessStrategy.goToMarketPlan)}

                <h2>5.0 EXECUTION</h2><br>
                ${diyToHtml(blueprint.implementationRoadmap.diyGuide)}

                <h2>6.0 CONCLUSION</h2><br><p style="border: 2px solid black; padding: 10px; font-weight: bold;">${blueprint.conclusion}</p>
            </div>
        `).join('');


        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head><title>Blueprint Export</title>${styles}</head>
                    <body>${allBlueprintsHtml}</body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        }
    }, []);
    
    const getBlueprintButtonText = () => {
        if (selectedIdeas.size === 0) return 'SELECT CONCEPT FIRST';
        if (selectedIdeas.size === 1) {
            return `INITIALIZE BLUEPRINT`;
        }
        return `INITIALIZE ${selectedIdeas.size} BLUEPRINTS`;
    };

    return (
        <div className="min-h-screen bg-[#FAFF00] text-black font-mono selection:bg-black selection:text-[#FAFF00] relative overflow-x-hidden pb-20">
            
            <div className="relative z-20 w-full max-w-5xl mx-auto p-6 sm:p-12 flex flex-col items-center min-h-screen">
                <header className="text-center my-16 w-full">
                     <div className="inline-block bg-black text-white px-4 py-2 border-4 border-white shadow-[4px_4px_0px_0px_#000] transform -rotate-2 mb-8">
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">Neo-Brutalism // Systems</span>
                    </div>
                    <h1 className="flex flex-col items-center font-black text-black leading-none uppercase">
                        <span className="block text-sm md:text-lg border-2 border-black bg-white px-2 mb-4 shadow-[4px_4px_0px_0px_#000]">11-Phase</span>
                        <span className="block text-5xl md:text-8xl bg-white px-6 py-2 border-4 border-black shadow-[12px_12px_0px_0px_#000] mb-4 transform -skew-x-6 hover:skew-x-0 transition-transform">Hybrid Product</span>
                        <span className="block text-xl md:text-3xl bg-[#FF69B4] text-white px-4 py-1 border-4 border-black shadow-[6px_6px_0px_0px_#000] transform rotate-1">Fusion Lab</span>
                    </h1>
                </header>
                
                <main className="w-full space-y-20 relative z-10">
                    {step <= AppStep.ANALYZING && (
                        <section className="space-y-8">
                            <Kicker className="bg-black text-white">Input Vectors</Kicker>
                            <div className="bg-[#F3F4F6] border-4 border-black p-8 shadow-[12px_12px_0px_0px_#000]">
                                <div className="space-y-6">
                                    {products.map((product, index) => (
                                        <div key={index} className="flex items-end gap-4">
                                            <ProductInput 
                                                id={`product${index + 1}`} 
                                                label={`Vector 0${index + 1}`} 
                                                value={product} 
                                                onChange={(e) => handleProductChange(index, e)} 
                                                placeholder={index === 0 ? "E.G. DRONE" : index === 1 ? "E.G. ESPRESSO MACHINE" : "E.G. OBJECT"} 
                                                disabled={isLoading}
                                            />
                                            {products.length > 2 && (
                                                <div className="">
                                                    <ActionButton 
                                                        onClick={() => handleRemoveProduct(index)} 
                                                        disabled={isLoading} 
                                                        label={`Remove`} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {products.length < 5 && (
                                    <div className="flex justify-center mt-8">
                                        <AddButton onClick={handleAddProduct} disabled={isLoading} />
                                    </div>
                                )}
                            </div>
                           
                           <div className="pt-8">
                             <PrimaryButton onClick={handleAnalyzeProducts} disabled={isLoading || products.filter(p => p.trim()).length < 2} color="bg-[#84CC16]">
                                Initialize Analysis Protocol
                            </PrimaryButton>
                           </div>
                           {step === AppStep.ANALYZING && <div className="pt-12" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                        </section>
                    )}
                    
                    {error && (
                        <div className="bg-[#FF6B6B] border-4 border-black text-black px-8 py-6 shadow-[8px_8px_0px_0px_#000] font-bold uppercase text-center">
                            ERROR: {error}
                        </div>
                    )}
                    
                    {step >= AppStep.ANALYZED && analyses && (
                        <section ref={analysesRef} className="space-y-8">
                            <div className="flex items-center justify-between border-b-4 border-black pb-4 bg-white px-4 py-2 shadow-[4px_4px_0px_0px_#000]">
                                <h2 className="text-xl font-black uppercase">Analysis Results</h2>
                                <span className="text-sm font-bold bg-black text-white px-2 py-1">{analyses.length} RECORDS</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {analyses.map((analysis, index) => (
                                    <AnalysisCard 
                                      key={analysis.productName} 
                                      analysis={analysis} 
                                      index={index} 
                                      isOpen={!openAnalyses.has(index)}
                                      onToggle={() => toggleAnalysis(index)} 
                                    />
                                ))}
                            </div>
                            {step === AppStep.ANALYZED && (
                                <div className="pt-12">
                                    <PrimaryButton onClick={handleGenerateIdeas} disabled={isLoading} color="bg-[#FF69B4]">
                                        Synthesize 2 Hybrid Concepts
                                    </PrimaryButton>
                                </div>
                            )}
                        </section>
                    )}

                     {step === AppStep.GENERATING_IDEAS && <div className="pt-16" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}

                    {step >= AppStep.IDEAS_GENERATED && allIdeas && (
                        <section ref={ideasRef} className="space-y-8">
                             <div className="flex items-center justify-between border-b-4 border-black pb-4 bg-white px-4 py-2 shadow-[4px_4px_0px_0px_#000]">
                                <h2 className="text-xl font-black uppercase">Generated Concepts</h2>
                                <span className="text-sm font-bold bg-black text-white px-2 py-1">{allIdeas.length} CONCEPTS</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {allIdeas.map((idea, index) => (
                                    <IdeaCard 
                                        key={index}
                                        idea={idea}
                                        index={index}
                                        isSelected={selectedIdeas.has(idea.ideaName)}
                                        onSelect={() => handleSelectIdea(idea)}
                                        isOpen={!openIdeas.has(index)}
                                        onToggle={() => toggleIdea(index)}
                                    />
                                ))}
                            </div>
                            <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <SecondaryButton onClick={handleGenerateMoreIdeas} disabled={isLoading}>
                                    + Generate 2 Additional
                                </SecondaryButton>
                                <PrimaryButton onClick={handleGenerateBlueprint} disabled={selectedIdeas.size === 0 || isLoading} color="bg-[#3B82F6]">
                                    {getBlueprintButtonText()}
                                </PrimaryButton>
                            </div>
                        </section>
                    )}

                    {step === AppStep.GENERATING_BLUEPRINT && <div className="pt-16" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                    
                    {step === AppStep.BLUEPRINT_GENERATED && blueprints.size > 0 && (
                        <section ref={blueprintRef} className="space-y-8">
                             <div className="flex items-center justify-between border-b-4 border-black pb-4 bg-white px-4 py-2 shadow-[4px_4px_0px_0px_#000]">
                                <h2 className="text-xl font-black uppercase">Final Blueprints</h2>
                                <button onClick={() => handleExportBlueprints(Array.from(blueprints.values()))} className="text-sm font-bold bg-[#FACC15] text-black px-4 py-2 border-2 border-black hover:shadow-[4px_4px_0px_0px_#000] transition-shadow uppercase">
                                    Export PDF
                                </button>
                            </div>

                            <div className="space-y-10">
                                {Array.from(blueprints.values()).map((bp: Blueprint) => (
                                     <BlueprintCard 
                                        key={bp.title} 
                                        blueprint={bp} 
                                        isOpen={openBlueprints.has(bp.title)} 
                                        onToggle={() => toggleBlueprint(bp.title)}
                                    />
                                ))}
                            </div>
                            <div className="pt-16 grid grid-cols-1">
                                <PrimaryButton onClick={handleStartOver} disabled={false} color="bg-black">RESET SYSTEM</PrimaryButton>
                            </div>
                        </section>
                    )}
                    
                    {aiLog && step >= AppStep.ANALYZED && (
                         <section className="pt-16 border-t-4 border-black">
                            <SecuredCSLLog log={aiLog} />
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;