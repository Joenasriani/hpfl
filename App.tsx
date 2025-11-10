import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { analyzeProduct, generateHybridIdeas, generateBlueprint, paraphraseText } from './services/geminiService';
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


const App: React.FC = () => {
    const [products, setProducts] = useState<string[]>(['', '']);
    const [analyses, setAnalyses] = useState<AnalysisResult[] | null>(null);
    const [allIdeas, setAllIdeas] = useState<HybridIdea[] | null>(null);
    const [thinkingProcess, setThinkingProcess] = useState<string | null>(null);
    const [selectedIdeas, setSelectedIdeas] = useState<HybridIdea[]>([]);
    const [blueprints, setBlueprints] = useState<Map<string, Blueprint>>(new Map());
    const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
    const [error, setError] = useState<string | null>(null);
    
    const [openAnalyses, setOpenAnalyses] = useState<Set<number>>(new Set());
    const [openIdeas, setOpenIdeas] = useState<Set<number>>(new Set());
    const [openBlueprints, setOpenBlueprints] = useState<Set<string>>(new Set());

    const [focusedInput, setFocusedInput] = useState<HTMLInputElement | null>(null);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState('Thinking...');

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
            const paraphrasedProcess = await paraphraseText(thinkingProcess);
            setAllIdeas(ideas);
            setThinkingProcess(paraphrasedProcess);
            setOpenIdeas(new Set()); // Start with all idea cards closed
            setStep(AppStep.IDEAS_GENERATED);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(AppStep.ANALYZED);
        }
    }, [analyses]);

    const handleGenerateBlueprints = useCallback(async () => {
        if (selectedIdeas.length === 0) return;
        setError(null);
        setStep(AppStep.GENERATING_BLUEPRINT);
        try {
            const results = await Promise.all(
                selectedIdeas.map(idea => generateBlueprint(idea).then(bp => ({ ideaName: idea.ideaName, blueprint: bp })))
            );
            
            const newBlueprints = new Map(blueprints);
            results.forEach(({ ideaName, blueprint }) => {
                newBlueprints.set(ideaName, blueprint);
            });
            
            setBlueprints(newBlueprints);
             // Default all blueprints to be closed upon generation.
            setOpenBlueprints(new Set());
            setStep(AppStep.BLUEPRINT_GENERATED);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to generate one or more blueprints. ${err.message}`;
            setError(errorMessage);
            setStep(AppStep.IDEAS_GENERATED);
        }
    }, [selectedIdeas, blueprints]);
    
    const handleGenerateMoreIdeas = useCallback(async () => {
        if (!analyses || !allIdeas) return;
        setError(null);
        const previousStep = step;
        setStep(AppStep.GENERATING_IDEAS); // Reuse for loading state
        try {
            const { ideas, thinkingProcess: newThinkingProcessPart } = await generateHybridIdeas(analyses, allIdeas);
            const combinedProcess = `${thinkingProcess || ''}\n\n---\n\n${newThinkingProcessPart}`;
            const paraphrasedCombinedProcess = await paraphraseText(combinedProcess);

            setAllIdeas(prev => [...(prev || []), ...ideas]);
            setThinkingProcess(paraphrasedCombinedProcess);
            setStep(previousStep);
        } catch (err)
 {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            setStep(previousStep);
        }
    }, [analyses, allIdeas, step, thinkingProcess]);
    
    const handleToggleIdeaSelection = (idea: HybridIdea) => {
        setSelectedIdeas(prev => {
            const isSelected = prev.some(i => i.ideaName === idea.ideaName);
            if (isSelected) {
                return prev.filter(i => i.ideaName !== idea.ideaName);
            } else {
                return [...prev, idea];
            }
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

    const toggleBlueprint = (ideaName: string) => {
        setOpenBlueprints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(ideaName)) {
                newSet.delete(ideaName);
            } else {
                newSet.add(ideaName);
            }
            return newSet;
        });
    };
    
    const handleStartOver = () => {
        setProducts(['', '']);
        setAnalyses(null);
        setAllIdeas(null);
        setThinkingProcess(null);
        setSelectedIdeas([]);
        setBlueprints(new Map());
        setStep(AppStep.INITIAL);
        setError(null);
        setOpenAnalyses(new Set());
        setOpenIdeas(new Set());
        setOpenBlueprints(new Set());
    };

    const handleShare = useCallback(async () => {
        if (blueprints.size === 0 || !navigator.share) {
             if (typeof navigator.share === 'undefined') {
                 alert("Sharing is not supported on this browser.");
            }
            return;
        }

        const firstBlueprint = blueprints.values().next().value as Blueprint | undefined;
        if (!firstBlueprint) return;

        const shareText = `
PRODUCT PROPOSAL: ${firstBlueprint.title}

ABSTRACT
${firstBlueprint.abstract}

1. INTRODUCTION
${firstBlueprint.introduction.proposedSolution}

Value Proposition: ${firstBlueprint.introduction.valueProposition}

(This is a summary of the first of ${blueprints.size} generated blueprints.)
        `.trim().replace(/^\s+/gm, '');

        try {
            await navigator.share({
                title: `Product Proposal: ${firstBlueprint.title}`,
                text: shareText,
            });
        } catch (err) {
            console.error('Error sharing idea:', err);
        }
    }, [blueprints]);

    const handleExportBlueprintsToDoc = useCallback(() => {
        if (blueprints.size === 0) return;

        const listToHtml = (items: string[]) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
        const diyToHtml = (steps: DIYStep[]) => steps.map(step => `
            <h4>Step ${step.step}: ${step.title}</h4>
            <p>${step.description}</p>
            ${listToHtml(step.actionableItems)}
        `).join('<br/>');

        const styles = `
            <style>
                body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #333; }
                h1, h2, h3, h4 { font-weight: bold; }
                h1 { font-size: 24pt; text-align: center; margin-bottom: 5px; }
                h2 { font-size: 18pt; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                h3 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; }
                h4 { font-size: 12pt; font-style: italic; margin-top: 15px; margin-bottom: 5px; }
                p { font-size: 12pt; margin-bottom: 10px; text-align: justify; }
                ul { font-size: 12pt; margin-left: 20px; }
                li { margin-bottom: 5px; }
                .page-break { page-break-before: always; }
                .toc { border: 1px solid #ccc; padding: 15px; margin-bottom: 40px; }
                .toc h2 { border-bottom: none; }
                .toc ul { list-style-type: none; padding-left: 0; }
                .toc a { text-decoration: none; color: #0000EE; }
                .doc-title { font-size: 28pt; text-align: center; margin-bottom: 40px; }
                .diagram-container { page-break-inside: avoid; margin-top: 20px; margin-bottom: 20px; }
                svg { max-width: 100%; height: auto; }
            </style>
        `;
        
        const blueprintArray = Array.from(blueprints.values());
        
        // 1. Table of Contents
        const toc = `
            <div class="toc">
                <h2>Table of Contents</h2>
                <ul>
                    ${blueprintArray.map((bp, index) => `<li><a href="#blueprint_${index + 1}">${index + 1}. ${bp.title}</a></li>`).join('')}
                </ul>
            </div>
        `;

        // 2. Blueprint Content
        const blueprintsHtml = blueprintArray.map((blueprint, index) => `
            <div class="${index > 0 ? 'page-break' : ''}">
                <h1 id="blueprint_${index + 1}">${blueprint.title}</h1>

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
            </div>
        `).join('');

        const htmlContent = `
            ${styles}
            <h1 class="doc-title">Hybrid Product Fusion Lab: Invention Portfolio</h1>
            ${toc}
            ${blueprintsHtml}
        `;

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + htmlContent + footer;

        const blob = new Blob(['\ufeff', sourceHTML], {
            type: 'application/msword'
        });
        
        const url = URL.createObjectURL(blob);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = url;
        fileDownload.download = 'Hybrid_Product_Blueprints.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
        URL.revokeObjectURL(url);
    }, [blueprints]);

    return (
        <div className="min-h-screen text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-['Inter',_sans-serif]">
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
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleAddProduct}
                                        className="h-12 w-12 bg-slate-700 hover:bg-gradient-to-r hover:from-[#6594f3] hover:to-[#7089f3] text-white font-normal text-4xl rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-110 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:transform-none"
                                        aria-label="Add Product"
                                        disabled={isLoading}
                                    >
                                        <span className="block -translate-y-px">+</span>
                                    </button>
                                </div>
                            )}
                           
                           <div>
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
                            <div className="grid grid-cols-1 gap-8">
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
                             {step === AppStep.GENERATING_IDEAS && !allIdeas && <div ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                        </section>
                    )}

                    {(step >= AppStep.IDEAS_GENERATED || (step === AppStep.GENERATING_IDEAS && allIdeas)) && (
                        <section ref={ideasRef} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Hybrid Ideas</h2>
                                <p className="text-gray-400 mt-2">Select one or more ideas to generate blueprints.</p>
                            </div>

                            {thinkingProcess && <ThinkingMonitorCard thinkingProcess={thinkingProcess} />}
                            
                            {allIdeas && <div className="space-y-8">
                                {allIdeas.map((idea, index) => (
                                     <HybridIdeaCard 
                                        key={index} 
                                        idea={idea} 
                                        index={index}
                                        isSelected={selectedIdeas.some(i => i.ideaName === idea.ideaName)}
                                        onToggleSelect={() => handleToggleIdeaSelection(idea)}
                                        isOpen={openIdeas.has(index)}
                                        onToggleExpansion={() => toggleIdea(index)}
                                    />
                                ))}
                            </div>}

                            {step === AppStep.GENERATING_IDEAS && <div ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                            
                            {step === AppStep.IDEAS_GENERATED && (
                                <footer className="pt-8 animate-fade-in">
                                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <PrimaryButton onClick={handleGenerateBlueprints} disabled={isLoading || selectedIdeas.length === 0}>
                                        {selectedIdeas.length === 0 ? 'Select Ideas to Continue' : `Generate Blueprints for ${selectedIdeas.length} Idea${selectedIdeas.length > 1 ? 's' : ''}`}
                                    </PrimaryButton>
                                    <PrimaryButton onClick={handleGenerateMoreIdeas} disabled={isLoading}>
                                        Generate More Ideas
                                    </PrimaryButton>
                                    </div>
                                    <div className="mt-6">
                                        <SecondaryButton onClick={handleStartOver} disabled={isLoading}>Start Over</SecondaryButton>
                                    </div>
                                </footer>
                            )}
                            {step === AppStep.GENERATING_BLUEPRINT && <div ref={loaderRef}><Loader message={currentLoadingMessage} /></div>}
                        </section>
                    )}

                    {step >= AppStep.BLUEPRINT_GENERATED && blueprints.size > 0 && (
                        <div ref={blueprintRef} className="space-y-8">
                            {Array.from(blueprints.entries()).map(([ideaName, blueprint]) => (
                                 <BlueprintCard 
                                    key={ideaName}
                                    blueprint={blueprint} 
                                    ideaName={ideaName}
                                    isOpen={openBlueprints.has(ideaName)}
                                    onToggle={() => toggleBlueprint(ideaName)}
                                />
                            ))}

                            <footer className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                                <PrimaryButton onClick={handleExportBlueprintsToDoc} disabled={isLoading || blueprints.size === 0}>
                                    Export to Doc
                                </PrimaryButton>
                                <PrimaryButton onClick={handleShare} disabled={isLoading || blueprints.size === 0 || typeof navigator.share === 'undefined'}>
                                    Share Summary
                                </PrimaryButton>
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <SecondaryButton onClick={handleStartOver} disabled={isLoading}>
                                        Start Over
                                    </SecondaryButton>
                                </div>
                            </footer>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
};

const FormattedThinkingProcess: React.FC<{ text: string }> = ({ text }) => {
    const sections = text.split('\n\n---\n\n');

    return (
        <div className="font-sans text-base leading-relaxed space-y-8">
            {sections.map((section, sectionIndex) => {
                 const lines = section.split('\n');
                 // FIX: Replaced `JSX.Element` with `React.ReactElement` to resolve "Cannot find namespace 'JSX'" error.
                 const elements: React.ReactElement[] = [];
                 let listItems: string[] = [];
             
                 const flushList = () => {
                     if (listItems.length > 0) {
                         elements.push(
                             <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 pl-4 mb-4 text-gray-300">
                                 {listItems.map((item, index) => (
                                     <li key={index}>{item}</li>
                                 ))}
                             </ul>
                         );
                         listItems = [];
                     }
                 };
             
                 lines.forEach((line, index) => {
                     const trimmedLine = line.trim();
             
                     if (trimmedLine.startsWith('### ')) {
                         flushList();
                         elements.push(<h3 key={index} className="text-lg font-semibold text-cyan-300 mt-4 mb-2">{trimmedLine.substring(4)}</h3>);
                     } else if (trimmedLine.startsWith('## ')) {
                         flushList();
                         elements.push(<h2 key={index} className="text-xl font-bold text-yellow-300 mt-6 mb-3 border-b border-yellow-700/50 pb-2">{trimmedLine.substring(3)}</h2>);
                     } else if (trimmedLine.startsWith('# ')) {
                         flushList();
                         elements.push(<h1 key={index} className="text-2xl font-black text-yellow-200 mt-8 mb-4">{trimmedLine.substring(2)}</h1>);
                     } else if (trimmedLine.startsWith('- ')) {
                         listItems.push(trimmedLine.substring(2));
                     } else if (trimmedLine) {
                         flushList();
                         elements.push(<p key={index} className="text-gray-400 mb-3 leading-relaxed">{trimmedLine}</p>);
                     }
                 });
             
                 flushList();

                 return <div key={sectionIndex}>{elements}</div>
            })}
        </div>
    );
};

const ThinkingMonitorCard: React.FC<{ thinkingProcess: string }> = ({ thinkingProcess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === '123') {
            setIsLocked(false);
            setPasswordError('');
            setPasswordInput('');
            setShowPassword(false);
        } else {
            setPasswordError('Incorrect password.');
        }
    };

    const handleLock = () => {
        setIsLocked(true);
        setIsOpen(false);
    };
    
    const handleToggleOpen = () => {
        const currentlyOpen = isOpen;
        setIsOpen(!currentlyOpen);
        
        if (!currentlyOpen && isLocked) {
            setShowPassword(true);
        } else {
            setShowPassword(false);
        }
    }

    return (
        <div className="bg-slate-950/80 backdrop-blur-xl rounded-2xl shadow-lg border border-yellow-500/50 animate-fade-in">
            <button
                className="w-full p-6 text-left flex justify-between items-center"
                onClick={handleToggleOpen}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    {isLocked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    )}
                    <h2 className="text-2xl font-bold text-yellow-400">AI Creative Strategy Log</h2>
                </div>
                <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
                <div className="px-6 pb-6 pt-4 border-t border-yellow-500/50">
                   {isLocked ? (
                       <>
                       {showPassword && (
                           <form onSubmit={handleUnlock} className="space-y-4 py-4 animate-fade-in">
                               <p className="text-yellow-200">This log is protected. Please enter the password to view.</p>
                               <div>
                                   <label htmlFor="log-password" className="sr-only">Password for strategy log</label>
                                   <input 
                                       id="log-password"
                                       type="password"
                                       value={passwordInput}
                                       onChange={(e) => {
                                           setPasswordInput(e.target.value);
                                           if (passwordError) setPasswordError('');
                                       }}
                                       className="w-full bg-slate-800/70 text-gray-100 placeholder-gray-500 p-3 rounded-lg border border-slate-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50 transition duration-300"
                                       placeholder="Password"
                                       aria-label="Password for strategy log"
                                       autoFocus
                                   />
                               </div>
                               {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                               <button
                                    type="submit"
                                    className="w-full font-bold py-2 px-4 rounded-lg transition-all duration-300 bg-yellow-600 hover:bg-yellow-500 text-slate-900"
                                >
                                    Unlock
                                </button>
                           </form>
                       )}
                       </>
                   ) : (
                       <div>
                           <FormattedThinkingProcess text={thinkingProcess} />
                           <button
                                onClick={handleLock}
                                className="mt-6 w-full font-bold py-2 px-4 rounded-lg transition-all duration-300 bg-slate-700 hover:bg-slate-600 text-white"
                           >
                               Lock Log
                           </button>
                       </div>
                   )}
                </div>
            </div>
        </div>
    );
};

const HybridIdeaCard: React.FC<{ idea: HybridIdea, index: number, isSelected: boolean, onToggleSelect: () => void, isOpen: boolean, onToggleExpansion: () => void }> = ({ idea, index, isSelected, onToggleSelect, isOpen, onToggleExpansion }) => {
    const baseClasses = "bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-lg border-2 transition-all duration-300 group animate-slide-in";
    const selectedClasses = isSelected 
        ? 'border-purple-500 ring-4 ring-purple-500/40 scale-[1.03] shadow-2xl shadow-purple-500/20' 
        : 'border-slate-700 hover:border-purple-500 hover:-translate-y-1.5';
    
    return (
        <div
            className={`${baseClasses} ${selectedClasses}`}
            style={{ animationDelay: `${index * 150}ms`}}
        >
            <div className="w-full p-6 sm:p-8 text-left flex justify-between items-center cursor-pointer" onClick={onToggleSelect}>
                <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-purple-500 border-purple-400' : 'bg-slate-700 border-slate-500'}`}>
                        {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 transition-all group-hover:from-cyan-300 group-hover:to-purple-300">{idea.ideaName}</h3>
                        <div className="mt-2">
                            <span className="bg-purple-500/20 text-purple-300 text-sm font-bold px-3 py-1 rounded-full">Idea #{index + 1}</span>
                        </div>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleExpansion(); }} aria-label={isOpen ? "Collapse idea details" : "Expand idea details"} className="p-2 -mr-2 rounded-full hover:bg-slate-700/50 text-[#698ff3]">
                    <ChevronIcon isOpen={isOpen} />
                </button>
            </div>
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
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg> <span className="text-cyan-400">Introduction</span></>} items={analysis.introduction} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> <span className="text-cyan-400">Manufacturing Origin</span></>} items={analysis.manufacturingOrigin} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> <span className="text-green-400">Strengths</span></>} items={analysis.strengths} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> <span className="text-red-400">Flaws</span></>} items={analysis.flaws} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg> <span className="text-cyan-400">Human Impact</span></>} items={analysis.humanImpact} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> <span className="text-cyan-400">Missed Opportunities</span></>} items={analysis.missedOpportunities} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414-1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" /></svg> <span className="text-yellow-400">Enhancement Ideas</span></>} items={analysis.enhancementIdeas} />
                <AnalysisDetail title={<><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> <span className="text-orange-400">Unforeseen Flaws</span></>} items={analysis.unforeseenFlaws} />
            </div>
        </div>
    </div>
);

const BlueprintSection: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={className}>
        <h3 className="text-2xl font-bold mb-4 border-b-2 border-slate-700 pb-3 flex items-center gap-3 text-green-400">
            {title}
        </h3>
        <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
            {children}
        </div>
    </div>
);

const BlueprintSubSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div>
        <h4 className="text-xl font-semibold text-cyan-300 mb-2">{title}</h4>
        {children}
    </div>
);

const SvgRenderer: React.FC<{ svgString: string; title: string }> = ({ svgString, title }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <h4 className="font-bold text-lg text-cyan-300 mb-4 text-center">{title}</h4>
        <div 
            className="flex justify-center items-center[&>svg]:max-w-full [&>svg]:h-auto" 
            dangerouslySetInnerHTML={{ __html: svgString }} 
        />
    </div>
);

const BlueprintCard: React.FC<{ blueprint: Blueprint, ideaName: string, isOpen: boolean, onToggle: () => void }> = ({ blueprint, ideaName, isOpen, onToggle }) => (
    <section className="space-y-8 animate-fade-in">
        <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-green-500/50 shadow-green-500/20">
            <button onClick={onToggle} className="w-full p-6 sm:p-8 text-left flex justify-between items-center" aria-expanded={isOpen}>
                 <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500">{blueprint.title}</h2>
                 <ChevronIcon isOpen={isOpen} />
            </button>
            <div className={`collapsible-content ${isOpen ? 'open' : ''} ${isOpen ? 'border-t border-slate-700' : ''}`}>
                <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-8 space-y-10">
                    <BlueprintSection title="📄 Abstract">
                        <p>{blueprint.abstract}</p>
                    </BlueprintSection>

                    <BlueprintSection title="1. Introduction">
                        <BlueprintSubSection title="Problem Statement"><p>{blueprint.introduction.problemStatement}</p></BlueprintSubSection>
                        <BlueprintSubSection title="Proposed Solution"><p>{blueprint.introduction.proposedSolution}</p></BlueprintSubSection>
                        <BlueprintSubSection title="Value Proposition"><p>{blueprint.introduction.valueProposition}</p></BlueprintSubSection>
                    </BlueprintSection>

                    <BlueprintSection title="2. Market Analysis">
                        <BlueprintSubSection title="Target Audience"><p>{blueprint.marketAnalysis.targetAudience}</p></BlueprintSubSection>
                        <BlueprintSubSection title="Market Size & Potential"><p>{blueprint.marketAnalysis.marketSize}</p></BlueprintSubSection>
                        <BlueprintSubSection title="Competitive Landscape"><p>{blueprint.marketAnalysis.competitiveLandscape}</p></BlueprintSubSection>
                    </BlueprintSection>

                    <BlueprintSection title="3. Product Specification">
                        <BlueprintSubSection title="Key Features (MVP)">
                            <ul className="list-disc list-inside space-y-2 pl-1">{blueprint.productSpecification.keyFeatures.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </BlueprintSubSection>
                        <BlueprintSubSection title="Technology Stack">
                            <ul className="list-disc list-inside space-y-2 pl-1">{blueprint.productSpecification.techStack.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </BlueprintSubSection>
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6">
                            <SvgRenderer svgString={blueprint.productSpecification.userJourneyDiagram.svg} title={blueprint.productSpecification.userJourneyDiagram.title} />
                            <SvgRenderer svgString={blueprint.productSpecification.architectureDiagram.svg} title={blueprint.productSpecification.architectureDiagram.title} />
                        </div>
                    </BlueprintSection>

                     <BlueprintSection title="4. Business Strategy">
                        <BlueprintSubSection title="Monetization Strategy">
                             <ul className="list-disc list-inside space-y-2 pl-1">{blueprint.businessStrategy.monetizationStrategy.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </BlueprintSubSection>
                        <BlueprintSubSection title="Go-To-Market Plan">
                             <ul className="list-disc list-inside space-y-2 pl-1">{blueprint.businessStrategy.goToMarketPlan.map((item, i) => <li key={i}>{item}</li>)}</ul>
                        </BlueprintSubSection>
                    </BlueprintSection>

                    <BlueprintSection title="5. Implementation Roadmap">
                         <div className="space-y-6">
                            {blueprint.implementationRoadmap.diyGuide.map((step) => (
                                <div key={step.step} className="p-5 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <h4 className="font-bold text-lg text-cyan-300">Step {step.step}: {step.title}</h4>
                                    <p className="mt-2 text-gray-400 text-base">{step.description}</p>
                                    <ul className="list-disc list-inside mt-4 space-y-1.5 text-gray-300 pl-2">
                                        {step.actionableItems.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </BlueprintSection>

                     <BlueprintSection title="6. Conclusion">
                        <p>{blueprint.conclusion}</p>
                    </BlueprintSection>
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
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.collapsible-content.open {
    max-height: 80vh; /* Accommodate content, but prevent huge layouts */
    overflow-y: auto;   /* Enable scrolling for long content */
    transition: max-height 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}
/* Custom scrollbar for webkit browsers */
.collapsible-content.open::-webkit-scrollbar {
    width: 8px;
}
.collapsible-content.open::-webkit-scrollbar-track {
    background: transparent;
}
.collapsible-content.open::-webkit-scrollbar-thumb {
    background-color: #334155; /* slate-700 */
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
}
.collapsible-content.open::-webkit-scrollbar-thumb:hover {
    background-color: #475569; /* slate-600 */
}
`;
document.head.appendChild(style);

export default App;