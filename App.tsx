
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { analyzeProduct, generateHybridIdeas, generateBlueprint } from './services/geminiService';
import { AppStep, AnalysisResult, HybridIdea, Blueprint, DIYStep } from './types';

const thinkingMessages = [
    'Crafting the next hybrid ideas…',
    'Analyzing the thinking process…',
    'Gathering background information…',
    'Researching pros and cons…',
    'Getting insights from user reviews…',
    'Synthesizing creative strategies…',
    'Exploring innovative possibilities…',
    'Validating concepts with data…'
];


const ProductInput: React.FC<{ 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    placeholder: string; 
    label: string; 
    id: string; 
    disabled?: boolean;
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}> = ({ value, onChange, placeholder, label, id, disabled = false, onFocus, onBlur }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            className="w-full bg-slate-900/70 text-gray-100 placeholder-gray-500 p-3 rounded-lg border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50 transition duration-300 shadow-sm focus:shadow-md focus:shadow-cyan-500/20 disabled:bg-slate-800 disabled:cursor-not-allowed"
            aria-label={label}
            disabled={disabled}
        />
    </div>
);

const PrimaryButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; }> = ({ onClick, disabled, children }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-lg font-bold py-8 px-4 rounded-lg transition-all duration-300 bg-gradient-to-r from-sky-500 to-fuchsia-600 hover:from-sky-400 hover:to-fuchsia-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg hover:shadow-sky-500/30 disabled:shadow-none transform hover:scale-[1.02] active:scale-100 disabled:transform-none"
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
        <p className="text-lg font-medium text-gray-300 text-center">{message}</p>
    </div>
);

const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const AnalysisSection: React.FC<{ title: string; content: string | string[] }> = ({ title, content }) => {
    const renderContent = () => {
        if (Array.isArray(content) && content.length > 0) {
            return (
                <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {content.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            );
        }
        if (typeof content === 'string' && content) {
            return <p className="text-gray-300">{content}</p>;
        }
        return <p className="text-gray-500">N/A</p>;
    };
    return (
        <div>
            <h4 className="text-md font-bold text-cyan-400 mb-2">{title}</h4>
            {renderContent()}
        </div>
    );
};


const AnalysisCard: React.FC<{ analysis: AnalysisResult; index: number; isOpen: boolean; onToggle: () => void; }> = ({ analysis, index, isOpen, onToggle }) => {
    return (
        <div className="bg-slate-800/60 backdrop-blur-lg rounded-xl border border-slate-700 shadow-lg overflow-hidden">
            <button onClick={onToggle} className="w-full text-left p-4 flex justify-between items-center bg-slate-900/50 hover:bg-slate-800/70 transition-colors duration-200">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">{analysis.productName}</h3>
                <ChevronIcon isOpen={isOpen} />
            </button>
            {isOpen && (
                <div className="p-6 space-y-6 animate-fade-in-down border-t border-slate-700">
                    <AnalysisSection title="Introduction" content={analysis.introduction} />
                    <AnalysisSection title="Manufacturing & Origin" content={analysis.manufacturingOrigin} />
                    <AnalysisSection title="Strengths" content={analysis.strengths} />
                    <AnalysisSection title="Flaws" content={analysis.flaws} />
                    <AnalysisSection title="Human Impact" content={analysis.humanImpact} />
                    <AnalysisSection title="Missed Opportunities" content={analysis.missedOpportunities} />
                    <AnalysisSection title="Enhancement Ideas" content={analysis.enhancementIdeas} />
                    <AnalysisSection title="Unforeseen Flaws" content={analysis.unforeseenFlaws} />
                </div>
            )}
        </div>
    );
};

const IdeaCard: React.FC<{ idea: HybridIdea; index: number; isSelected: boolean; onSelect: () => void; isOpen: boolean; onToggle: () => void; }> = ({ idea, index, isSelected, onSelect, isOpen, onToggle }) => {
    return (
        <div className={`rounded-xl border shadow-lg transition-all duration-300 ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/50 bg-slate-800' : 'border-slate-700 bg-slate-800/60 backdrop-blur-lg'}`}>
            <button onClick={onToggle} className="w-full text-left p-4 flex justify-between items-center bg-slate-900/50 hover:bg-slate-800/70 transition-colors duration-200 rounded-t-xl">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">{idea.ideaName}</h3>
                <ChevronIcon isOpen={isOpen} />
            </button>
            {isOpen && (
                <div className="p-6 space-y-4 border-t border-slate-700 animate-fade-in-down">
                    <div>
                        <h4 className="font-bold text-cyan-400 mb-1">What It Is</h4>
                        <p className="text-gray-300">{idea.whatItIs}</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-cyan-400 mb-1">Reasoning</h4>
                        <p className="text-gray-300">{idea.reasoning}</p>
                    </div>
                     <div>
                        <h4 className="font-bold text-cyan-400 mb-1">Why It's Better</h4>
                        <p className="text-gray-300">{idea.whyBetter}</p>
                    </div>
                    <div className="pt-4">
                        <button 
                            onClick={onSelect}
                            className={`w-full font-bold py-2 px-4 rounded-lg transition-colors duration-300 ${isSelected ? 'bg-purple-600 text-white cursor-default' : 'bg-slate-700 hover:bg-purple-600'}`}
                        >
                            {isSelected ? 'Selected' : 'Select Idea'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const FormattedCSL: React.FC<{ log: string }> = ({ log }) => {
    const sections = log.split(/\n\n---\n\n/);
    return (
        <div className="bg-slate-900/70 backdrop-blur-lg rounded-xl border border-slate-700 shadow-lg p-6 space-y-4">
            <h3 className="text-2xl font-bold text-center text-gray-300 mb-4">AI Creative Strategy Log</h3>
            {sections.map((section, index) => {
                const lines = section.split('\n');
                const titleLine = lines.find(line => line.startsWith('##'));
                const title = titleLine ? titleLine.replace('##', '').trim() : `Log Entry ${index + 1}`;
                const content = lines.filter(line => !line.startsWith('##') && line.trim() !== '').join('\n');
                return (
                    <details key={index} className="bg-slate-800/50 rounded-lg p-4" open={index === sections.length - 1}>
                        <summary className="font-bold text-lg text-cyan-400 cursor-pointer">{title}</summary>
                        <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm mt-2 p-2 bg-slate-900/50 rounded">{content}</pre>
                    </details>
                );
            })}
        </div>
    );
};

const BlueprintCard: React.FC<{ blueprint: Blueprint; isOpen: boolean; onToggle: () => void }> = ({ blueprint, isOpen, onToggle }) => {
    const renderList = (items: string[]) => (
        <ul className="list-disc list-inside space-y-1 text-gray-300">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    );

    const renderDIY = (steps: DIYStep[]) => (
        <div className="space-y-4">
            {steps.map(step => (
                <div key={step.step}>
                    <h4 className="font-bold text-fuchsia-400">Step {step.step}: {step.title}</h4>
                    <p className="text-gray-400 text-sm mb-2">{step.description}</p>
                    {renderList(step.actionableItems)}
                </div>
            ))}
        </div>
    );

    return (
         <div className="bg-slate-800/60 backdrop-blur-lg rounded-xl border border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10 overflow-hidden">
            <button onClick={onToggle} className="w-full text-left p-4 flex justify-between items-center bg-slate-900/50 hover:bg-slate-800/70 transition-colors duration-200">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">{blueprint.title}</h2>
                <ChevronIcon isOpen={isOpen} />
            </button>
            {isOpen && (
                <div className="p-6 space-y-8 border-t border-slate-700 animate-fade-in-down">
                    <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">Abstract</h3>
                        <p className="text-gray-300">{blueprint.abstract}</p>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">1. Introduction</h3>
                        <div className="space-y-3">
                            <div><h4 className="font-semibold text-fuchsia-400">1.1 Problem Statement</h4><p>{blueprint.introduction.problemStatement}</p></div>
                            <div><h4 className="font-semibold text-fuchsia-400">1.2 Proposed Solution</h4><p>{blueprint.introduction.proposedSolution}</p></div>
                            <div><h4 className="font-semibold text-fuchsia-400">1.3 Value Proposition</h4><p>{blueprint.introduction.valueProposition}</p></div>
                        </div>
                    </section>

                     <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">2. Market Analysis</h3>
                        <div className="space-y-3">
                            <div><h4 className="font-semibold text-fuchsia-400">2.1 Target Audience</h4><p>{blueprint.marketAnalysis.targetAudience}</p></div>
                            <div><h4 className="font-semibold text-fuchsia-400">2.2 Market Size & Potential</h4><p>{blueprint.marketAnalysis.marketSize}</p></div>
                            <div><h4 className="font-semibold text-fuchsia-400">2.3 Competitive Landscape</h4><p>{blueprint.marketAnalysis.competitiveLandscape}</p></div>
                        </div>
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">3. Product Specification</h3>
                         <div className="space-y-4">
                            <div><h4 className="font-semibold text-fuchsia-400 mb-2">3.1 Key Features (MVP)</h4>{renderList(blueprint.productSpecification.keyFeatures)}</div>
                            <div><h4 className="font-semibold text-fuchsia-400 mb-2">3.2 Technology Stack</h4>{renderList(blueprint.productSpecification.techStack)}</div>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                                <h4 className="font-semibold text-fuchsia-400 mb-2 text-center">3.3 {blueprint.productSpecification.userJourneyDiagram.title}</h4>
                                <div dangerouslySetInnerHTML={{ __html: blueprint.productSpecification.userJourneyDiagram.svg }} />
                            </div>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                                <h4 className="font-semibold text-fuchsia-400 mb-2 text-center">3.4 {blueprint.productSpecification.architectureDiagram.title}</h4>
                                <div dangerouslySetInnerHTML={{ __html: blueprint.productSpecification.architectureDiagram.svg }} />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">4. Business Strategy</h3>
                        <div className="space-y-3">
                            <div><h4 className="font-semibold text-fuchsia-400 mb-2">4.1 Monetization Strategy</h4>{renderList(blueprint.businessStrategy.monetizationStrategy)}</div>
                            <div><h4 className="font-semibold text-fuchsia-400 mb-2">4.2 Go-To-Market Plan</h4>{renderList(blueprint.businessStrategy.goToMarketPlan)}</div>
                        </div>
                    </section>

                    <section>
                         <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">5. Implementation Roadmap</h3>
                         {renderDIY(blueprint.implementationRoadmap.diyGuide)}
                    </section>
                    
                    <section>
                        <h3 className="text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mb-3">6. Conclusion</h3>
                        <p>{blueprint.conclusion}</p>
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
    const [selectedIdea, setSelectedIdea] = useState<HybridIdea | null>(null);
    const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
    const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
    const [error, setError] = useState<string | null>(null);
    
    const [openAnalyses, setOpenAnalyses] = useState<Set<number>>(new Set());
    const [openIdeas, setOpenIdeas] = useState<Set<number>>(new Set());
    const [isBlueprintOpen, setIsBlueprintOpen] = useState(true);

    const [focusedInput, setFocusedInput] = useState<HTMLInputElement | null>(null);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('Thinking...');
    const messageIntervalRef = useRef<number | null>(null);

    const loaderRef = useRef<HTMLDivElement>(null);
    const analysesRef = useRef<HTMLDivElement>(null);
    const ideasRef = useRef<HTMLDivElement>(null);
    const blueprintRef = useRef<HTMLDivElement>(null);


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
            }, 2500);
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
            // A slight delay ensures the element is fully rendered and animations have started.
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
                // No scroll on initial state or other cases
                break;
        }
    }, [step]);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setFocusedInput(e.target);
    };

    const handleInputBlur = () => {
        setFocusedInput(null);
    };

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
            setError('Please enter at least two product names.');
            return;
        }
        setError(null);
        setStep(AppStep.ANALYZING);
        try {
            const results = await Promise.all(
                validProducts.map(p => analyzeProduct(p))
            );
            setAnalyses(results);
            const combinedLogs = results.map(r => `## Analysis Log for: ${r.productName}\n\n${r.analysisLog}`).join('\n\n---\n\n');
            setAiLog(combinedLogs);
            setOpenAnalyses(new Set()); // Start with all analysis cards closed
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
            setOpenIdeas(new Set()); // Start with all idea cards closed
            setStep(AppStep.IDEAS_GENERATED);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.ANALYZED);
        }
    }, [analyses]);

    const handleGenerateBlueprint = useCallback(async () => {
        if (!selectedIdea || !analyses) return;
        setError(null);
        setStep(AppStep.GENERATING_BLUEPRINT);
        try {
            const newBlueprint = await generateBlueprint(analyses, selectedIdea);
            setBlueprint(newBlueprint);
            setIsBlueprintOpen(true);
            setStep(AppStep.BLUEPRINT_GENERATED);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.IDEAS_GENERATED);
        }
    }, [selectedIdea, analyses]);
    
    const handleGenerateMoreIdeas = useCallback(async () => {
        if (!analyses || !allIdeas) return;
        setError(null);
        const previousStep = step;
        setStep(AppStep.GENERATING_IDEAS); // Reuse for loading state
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
        setProducts(['', '']);
        setAnalyses(null);
        setAllIdeas(null);
        setAiLog(null);
        setSelectedIdea(null);
        setBlueprint(null);
        setStep(AppStep.INITIAL);
        setError(null);
        setOpenAnalyses(new Set());
        setOpenIdeas(new Set());
        setIsBlueprintOpen(true);
    };

    const handleExportBlueprint = useCallback(() => {
        if (!selectedIdea || !blueprint) return;

        const listToHtml = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        const diyToHtml = (steps: DIYStep[]) => steps.map(step => `
            <h4>Step ${step.step}: ${step.title}</h4>
            <p>${step.description}</p>
            ${listToHtml(step.actionableItems)}
        `).join('<br/>');

        const styles = `
            <style>
                @media print {
                    @page {
                        size: A4;
                        margin: 1in;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .diagram-container, h1, h2, h3, h4 {
                        page-break-inside: avoid;
                        page-break-after: avoid;
                    }
                }
                body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #333; }
                h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 30px; }
                h2 { font-size: 18pt; font-weight: bold; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                h3 { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
                h4 { font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 15px; margin-bottom: 5px; }
                p { font-size: 12pt; margin-bottom: 10px; text-align: justify; }
                ul { font-size: 12pt; margin-left: 20px; }
                li { margin-bottom: 5px; }
                .diagram-container { page-break-inside: avoid; margin-top: 20px; margin-bottom: 20px; }
                svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
            </style>
        `;

        const htmlContent = `
            <h1>${blueprint.title}</h1>

            <h2>Abstract</h2>
            <p>${blueprint.abstract}</p>

            <h2>1. Introduction</h2>
            <h3>1.1 Problem Statement</h3>
            <p>${blueprint.introduction.problemStatement}</p>
            <h3>1.2 Proposed Solution</h3>
            <p>${blueprint.introduction.proposedSolution}</p>
            <h3>1.3 Value Proposition</h3>
            <p>${blueprint.introduction.valueProposition}</p>

            <h2>2. Market Analysis</h2>
            <h3>2.1 Target Audience</h3>
            <p>${blueprint.marketAnalysis.targetAudience}</p>
            <h3>2.2 Market Size & Potential</h3>
            <p>${blueprint.marketAnalysis.marketSize}</p>
            <h3>2.3 Competitive Landscape</h3>
            <p>${blueprint.marketAnalysis.competitiveLandscape}</p>

            <h2>3. Product Specification</h2>
            <h3>3.1 Key Features (MVP)</h3>
            ${listToHtml(blueprint.productSpecification.keyFeatures)}
            <h3>3.2 Technology Stack</h3>
            ${listToHtml(blueprint.productSpecification.techStack)}
            <div class="diagram-container">
                <h3>3.3 User Journey Diagram</h3>
                ${blueprint.productSpecification.userJourneyDiagram.svg}
            </div>
             <div class="diagram-container">
                <h3>3.4 System Architecture Diagram</h3>
                ${blueprint.productSpecification.architectureDiagram.svg}
            </div>

            <h2>4. Business Strategy</h2>
            <h3>4.1 Monetization Strategy</h3>
            ${listToHtml(blueprint.businessStrategy.monetizationStrategy)}
            <h3>4.2 Go-To-Market Plan</h3>
            ${listToHtml(blueprint.businessStrategy.goToMarketPlan)}
            
            <h2>5. Implementation Roadmap</h2>
            <h3>5.1 DIY Step-by-Step Guide</h3>
            ${diyToHtml(blueprint.implementationRoadmap.diyGuide)}

            <h2>6. Conclusion</h2>
            <p>${blueprint.conclusion}</p>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>${blueprint.title} - Blueprint</title>
                        ${styles}
                    </head>
                    <body>
                        ${htmlContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        } else {
            alert('Could not open print window. Please check your pop-up blocker settings.');
        }
    }, [blueprint, selectedIdea]);

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-['Inter',_sans-serif]">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center my-8 md:my-12">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 leading-tight">
                        <span className="block">The 11-Phase</span>
                        <span className="block text-5xl sm:text-6xl md:text-7xl">Hybrid Product</span>
                        <span className="block">Fusion Lab</span>
                    </h1>
                     <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">Hybridize products to spark innovation and create your next big idea.</p>
                </header>
                
                <main className="space-y-12">
                    {step <= AppStep.ANALYZING && (
                        <section 
                            className={`bg-slate-800/60 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 animate-fade-in border border-slate-700 relative overflow-hidden`}
                        >
                            <div className="space-y-6">
                                {products.map((product, index) => (
                                    <div key={index} className="flex items-end gap-3">
                                        <div className="flex-grow">
                                            <ProductInput 
                                                id={`product${index + 1}`} 
                                                label={`Product ${index + 1}`} 
                                                value={product} 
                                                onChange={(e) => handleProductChange(index, e)} 
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
                                                placeholder={index === 0 ? "e.g., Drone" : index === 1 ? "e.g., Robotic Vacuum" : "e.g., Another Product"} 
                                                disabled={isLoading}
                                            />
                                        </div>
                                        {products.length > 2 && (
                                            <button 
                                                onClick={() => handleRemoveProduct(index)} 
                                                className="h-12 w-12 flex-shrink-0 bg-slate-700 hover:bg-red-600 text-white font-bold text-3xl rounded-lg transition-colors duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                aria-label={`Remove Product ${index + 1}`}
                                                disabled={isLoading}
                                            >
                                                -
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {products.length < 5 && (
                                <div className="flex justify-center pt-4">
                                    <button
                                        onClick={handleAddProduct}
                                        className="h-12 w-12 bg-slate-700 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-500 text-white font-normal text-4xl rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-110 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:transform-none"
                                        aria-label="Add Product"
                                        disabled={isLoading}
                                    >
                                        <span className="block -translate-y-px">+</span>
                                    </button>
                                </div>
                            )}
                           
                           <div className="pt-4">
                             <PrimaryButton onClick={handleAnalyzeProducts} disabled={isLoading || products.filter(p => p.trim()).length < 2}>
                                Analyze Products
                            </PrimaryButton>
                           </div>
                           {step === AppStep.ANALYZING && <div className="pt-8" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                        </section>
                    )}
                    
                    {error && <div className="bg-red-900/60 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative animate-fade-in flex items-center gap-3" role="alert">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-medium">{error}</span>
                    </div>}
                    
                    {step >= AppStep.ANALYZED && analyses && (
                        <section ref={analysesRef} className="space-y-8 animate-fade-in">
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
                                <div className="pt-4">
                                    <PrimaryButton onClick={handleGenerateIdeas} disabled={isLoading}>
                                        Generate 3 Hybrid Ideas
                                    </PrimaryButton>
                                </div>
                            )}
                        </section>
                    )}

                     {step === AppStep.GENERATING_IDEAS && <div className="pt-8" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}

                    {step >= AppStep.IDEAS_GENERATED && allIdeas && (
                        <section ref={ideasRef} className="space-y-8 animate-fade-in">
                            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Hybrid Ideas</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {allIdeas.map((idea, index) => (
                                    <IdeaCard 
                                        key={index}
                                        idea={idea}
                                        index={index}
                                        isSelected={selectedIdea?.ideaName === idea.ideaName}
                                        onSelect={() => handleSelectIdea(idea)}
                                        isOpen={!openIdeas.has(index)}
                                        onToggle={() => toggleIdea(index)}
                                    />
                                ))}
                            </div>
                            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SecondaryButton onClick={handleGenerateMoreIdeas} disabled={isLoading}>
                                    Generate 3 More Ideas
                                </SecondaryButton>
                                <PrimaryButton onClick={handleGenerateBlueprint} disabled={!selectedIdea || isLoading}>
                                    {selectedIdea ? `Generate Blueprint for "${selectedIdea.ideaName}"` : 'Select an Idea to Continue'}
                                </PrimaryButton>
                            </div>
                        </section>
                    )}

                    {aiLog && step >= AppStep.ANALYZED && (
                         <section className="animate-fade-in">
                            <FormattedCSL log={aiLog} />
                        </section>
                    )}

                    {step === AppStep.GENERATING_BLUEPRINT && <div className="pt-8" ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                    
                    {step === AppStep.BLUEPRINT_GENERATED && blueprint && (
                        <section ref={blueprintRef} className="space-y-8 animate-fade-in">
                            <BlueprintCard blueprint={blueprint} isOpen={isBlueprintOpen} onToggle={() => setIsBlueprintOpen(!isBlueprintOpen)} />
                            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SecondaryButton onClick={handleExportBlueprint} disabled={false}>Export Blueprint</SecondaryButton>
                                <PrimaryButton onClick={handleStartOver} disabled={false}>Start Over</PrimaryButton>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
