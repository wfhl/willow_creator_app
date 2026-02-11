import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Play, PenTool, Archive, Folder } from 'lucide-react';
import { geminiService } from '../lib/geminiService';
import type { GenerationRequest } from '../lib/geminiService';
import { falService, type FalGenerationRequest } from '../lib/falService';
import { dbService } from '../lib/dbService';
import type { DBAsset as Asset, DBSavedPost as SavedPost, DBPromptPreset, DBGenerationHistory } from '../lib/dbService';
import { WILLOW_PROFILE, WILLOW_THEMES, CAPTION_TEMPLATES } from './willow-presets';

// Component Imports
import { CreatorHeader } from './tabs/CreatorHeader';
import { CreateTab } from './tabs/CreateTab';
import { PostsTab } from './tabs/PostsTab';
import { EditTab } from './tabs/EditTab';
import { AnimateTab } from './tabs/AnimateTab';
import { ScriptsTab } from './tabs/ScriptsTab';
import { SettingsTab, type Theme, type CaptionStyle } from './tabs/SettingsTab';
import { AssetLibraryTab } from './tabs/AssetLibraryTab';
import { PresetsDropdown } from './tabs/PresetsDropdown';

export default function WillowPostCreator() {
    // --- Shared State ---
    const [assets, setAssets] = useState<Asset[]>([]);
    const [activeTab, setActiveTab] = useState<'create' | 'posts' | 'assets' | 'edit' | 'animate' | 'scripts' | 'settings'>('create');

    // --- Configuration State ---
    const [themes, setThemes] = useState<Theme[]>(WILLOW_THEMES as Theme[]);
    const [captionStyles, setCaptionStyles] = useState<CaptionStyle[]>(CAPTION_TEMPLATES as CaptionStyle[]);

    // --- Saved Posts State ---
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
    const [totalSavedCount, setTotalSavedCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SavedPost[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sortOrder, setSortOrder] = useState<'prev' | 'next'>('prev');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const ignoreNextPromptUpdate = useRef(false);

    // --- Preset State ---
    const [presets, setPresets] = useState<DBPromptPreset[]>([]);
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);
    const [showSaveForm, setShowSaveForm] = useState(false);

    // --- Post Generation State ---
    const [topic, setTopic] = useState("");
    const [captionType, setCaptionType] = useState("reflective");
    const [generatedCaption, setGeneratedCaption] = useState("");
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

    // --- Media Generation State ---
    const [selectedThemeId, setSelectedThemeId] = useState("A");
    const [customTheme, setCustomTheme] = useState("");
    const [specificVisuals, setSpecificVisuals] = useState("");
    const [specificOutfit, setSpecificOutfit] = useState("");
    const [generatedPrompt, setGeneratedPrompt] = useState("");
    const [isDreaming, setIsDreaming] = useState(false);

    // Media Output State
    const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
    const [generatedMediaUrls, setGeneratedMediaUrls] = useState<string[]>([]);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

    // Refinement / I2V States
    const [refineTarget, setRefineTarget] = useState<{ url: string, index: number } | null>(null);
    const [refinePrompt, setRefinePrompt] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [refineResultUrl, setRefineResultUrl] = useState<string | null>(null);
    const [refineAdditionalImages, setRefineAdditionalImages] = useState<Asset[]>([]);

    // Mutable Parameters State
    const [refineImageSize, setRefineImageSize] = useState<string>("square_hd");
    const [refineNumImages, setRefineNumImages] = useState<number>(1);

    const [i2vTarget, setI2VTarget] = useState<{ url: string, index: number } | null>(null);
    const [i2vPrompt, setI2VPrompt] = useState("");
    const [isGeneratingI2V, setIsGeneratingI2V] = useState(false);
    const [i2vResultUrl, setI2VResultUrl] = useState<string | null>(null);

    // Control State
    const [selectedModel, setSelectedModel] = useState<string>('nano-banana-pro-preview');
    const [aspectRatio, setAspectRatio] = useState<string>('3:4');
    const [createImageSize, setCreateImageSize] = useState<string>("auto_4K");
    const [createNumImages, setCreateNumImages] = useState<number>(4);
    const [previewContext, setPreviewContext] = useState<{ urls: string[], index: number } | null>(null);
    const previewUrl = previewContext ? previewContext.urls[previewContext.index] : null;

    const handleOpenPreview = (url: string, allUrls?: string[]) => {
        const urls = allUrls || [url];
        const index = urls.indexOf(url);
        setPreviewContext({ urls, index: index >= 0 ? index : 0 });
    };

    // Video Configuration
    const [videoResolution, setVideoResolution] = useState<string>('1080p');
    const [videoDuration, setVideoDuration] = useState<string>('6s');
    const [i2vAspectRatio, setI2vAspectRatio] = useState<string>('9:16');
    const [withAudio, setWithAudio] = useState(true);
    const [cameraFixed, setCameraFixed] = useState(false);

    // Advanced Edit Config
    const [enableSafety, setEnableSafety] = useState(true);
    const [enhancePromptMode, setEnhancePromptMode] = useState<"standard" | "fast">("standard");
    const [loras, setLoras] = useState<Array<{ path: string; scale: number }>>([]);

    // --- INITIALIZATION EFFECTS ---

    // Load presets
    useEffect(() => {
        dbService.getAllPresets().then(setPresets).catch(console.error);
    }, []);

    // Load Assets & Posts (Persistence)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Configs
                const savedThemes = await dbService.getConfig<Theme[]>('themes');
                if (savedThemes) setThemes(savedThemes);
                else await dbService.saveConfig('themes', WILLOW_THEMES);

                const savedStyles = await dbService.getConfig<CaptionStyle[]>('caption_styles');
                if (savedStyles) setCaptionStyles(savedStyles);
                else await dbService.saveConfig('caption_styles', CAPTION_TEMPLATES);

                // Assets
                const dbAssets = await dbService.getAllAssets();
                // Only load assets that are flagged as 'selected' into the active prompt reference state
                setAssets(dbAssets.filter(a => a.selected));

                // Posts
                const count = await dbService.getPostsCount();
                setTotalSavedCount(count);
                if (count > 0) {
                    const batch = await dbService.getRecentPostsBatch(24, 0, sortOrder);
                    setSavedPosts(batch);
                }
            } catch (e) { console.error(e); }
        };
        loadInitialData();
    }, []);

    // Persist Configs
    const persistThemes = (newThemes: Theme[]) => {
        setThemes(newThemes);
        dbService.saveConfig('themes', newThemes).catch(console.error);
    };

    const persistCaptionStyles = (newStyles: CaptionStyle[]) => {
        setCaptionStyles(newStyles);
        dbService.saveConfig('caption_styles', newStyles).catch(console.error);
    };

    // Reload posts on sort/search
    useEffect(() => {
        const reloadSortedPosts = async () => {
            if (activeTab === 'posts' && !searchQuery) {
                const count = await dbService.getPostsCount();
                setTotalSavedCount(count);
                const batch = await dbService.getRecentPostsBatch(24, 0, sortOrder);
                setSavedPosts(batch);
            }
        };
        reloadSortedPosts();
    }, [sortOrder, activeTab, searchQuery]);

    // Deep search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await dbService.searchPosts(searchQuery, 48, sortOrder);
                setSearchResults(results);
            } catch (err) { console.error(err); } finally { setIsSearching(false); }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, sortOrder]);

    // Update model when type changes
    useEffect(() => {
        if (mediaType === 'image') {
            const isValidImageModel = selectedModel.includes('gemini') ||
                selectedModel.includes('banana') ||
                selectedModel.includes('seedream') ||
                selectedModel.includes('grok-imagine-image');
            if (!isValidImageModel) setSelectedModel('nano-banana-pro-preview');
        } else {
            const isValidVideoModel = selectedModel.includes('veo') ||
                selectedModel.includes('grok-imagine-video');
            if (!isValidVideoModel) setSelectedModel('veo-3.1-generate-preview');
        }
    }, [mediaType]);

    const currentTheme = themes.find((t: Theme) => t.id === selectedThemeId) || themes[0];


    // --- LOGIC HANDLERS ---

    // Keyboard Navigation for Preview Carousel
    useEffect(() => {
        if (!previewContext) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setPreviewContext(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
            } else if (e.key === 'ArrowRight') {
                setPreviewContext(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
            } else if (e.key === 'Escape') {
                setPreviewContext(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewContext]);

    const constructPrompt = () => {
        let prompt = `SUBJECT: ${WILLOW_PROFILE.subject} `;

        if (selectedThemeId === 'CUSTOM') {
            prompt += ` ${specificVisuals || "A creative, artistic portrait."}`;
            if (specificOutfit) prompt += ` Wearing ${specificOutfit}.`;
        } else {
            let base = currentTheme.basePrompt;
            base = base.replace("[Subject Definition], ", "").replace("[Subject Definition]", "");
            base = base.replace("[Outfit]", specificOutfit || currentTheme.defaultOutfit || "");

            const theme = currentTheme as any;
            if (currentTheme.id === 'B') {
                base = base.replace("[Visuals]", specificVisuals || theme.defaultVisuals || "");
            } else if (['C', 'D', 'E'].includes(currentTheme.id)) {
                base = base.replace("[Action]", specificVisuals || theme.defaultAction || "");
            } else {
                base = base.replace("[Setting]", specificVisuals || theme.defaultSetting || "");
            }
            prompt += base;
        }

        prompt += ` ${WILLOW_PROFILE.defaultParams} ${WILLOW_PROFILE.negativePrompt}`;
        setGeneratedPrompt(prompt);
    };

    useEffect(() => {
        if (ignoreNextPromptUpdate.current) {
            ignoreNextPromptUpdate.current = false;
            return;
        }
        constructPrompt();
    }, [selectedThemeId, specificVisuals, specificOutfit]);


    const handleInputImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'visuals' | 'outfit') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const simulatedText = target === 'visuals'
                ? `Scene inspired by uploaded image: ${file.name}`
                : `Outfit context from: ${file.name}`;
            if (target === 'visuals') setSpecificVisuals(simulatedText);
            if (target === 'outfit') setSpecificOutfit(simulatedText);
        }
    };

    const handleDreamConcept = async () => {
        setIsDreaming(true);
        try {
            const themeToUse = selectedThemeId === 'CUSTOM' ? (customTheme || 'creative concept') : currentTheme.name;
            const concept = await (geminiService as any).generateConcept(themeToUse, 'post');
            setTopic(concept.topic);
            setSpecificVisuals(concept.setting);
            setSpecificOutfit(concept.outfit);
        } catch (e) { console.error(e); } finally { setIsDreaming(false); }
    };

    const handleAssetsAdd = (files: FileList) => {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target?.result as string;
                const newAsset: Asset = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 6),
                    name: file.name,
                    type: 'face_reference', // Explicitly mark as face reference when added via reference uploader
                    base64,
                    folderId: null,
                    timestamp: Date.now(),
                    selected: true
                };
                setAssets(prev => [...prev, newAsset]);
                await dbService.saveAsset(newAsset);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAssetRemove = async (id: string) => {
        setAssets(prev => prev.filter(a => a.id !== id));
        await dbService.deleteAsset(id);
    };

    const handleAssetToggle = async (id: string) => {
        setAssets(prev => {
            const next = prev.map(a => {
                if (a.id === id) {
                    const updated = { ...a, selected: !a.selected };
                    dbService.saveAsset(updated);
                    return updated;
                }
                return a;
            });
            return next;
        });
    };

    const handleGenerateMedia = async (promptOverride?: string) => {
        const finalPromptToUse = promptOverride || generatedPrompt;
        if (!finalPromptToUse) return;
        setIsGeneratingMedia(true);
        setGeneratedMediaUrls([]);

        // Determine service type early for history tracking
        const isFalModel = selectedModel.includes('grok') || selectedModel.includes('seedream') || selectedModel.includes('seedance') || selectedModel.includes('wan');
        let generationSucceeded = false;
        let generationError = '';
        let resultUrls: string[] = [];

        try {
            const selectedImages = assets.filter(a => a.selected && a.type === 'image');
            let finalPrompt = finalPromptToUse;
            const contentParts: any[] = [];

            if (selectedImages.length > 0) {
                const faceInstruction = `Generate a portrait consistent with the character identity in the attached reference images. Focus on her specific red hair, blue-green eyes, and freckles. Maintain the subject's unique facial features while implementing the following scene:`;
                finalPrompt = `${faceInstruction} ${finalPromptToUse}`;
                selectedImages.forEach(img => {
                    contentParts.push({
                        inlineData: { mimeType: "image/jpeg", data: img.base64.split(',')[1] }
                    });
                });
            }

            if (isFalModel) {
                const request: FalGenerationRequest = {
                    model: selectedModel,
                    prompt: finalPrompt,
                    aspectRatio: mediaType === 'video' ? i2vAspectRatio : aspectRatio,
                    contentParts: contentParts,
                    videoConfig: mediaType === 'video' ? {
                        resolution: videoResolution,
                        durationSeconds: videoDuration.replace('s', ''),
                        withAudio,
                        cameraFixed
                    } : undefined,
                    editConfig: {
                        imageSize: createImageSize,
                        numImages: createNumImages,
                        enableSafety,
                        enhancePromptMode
                    },
                    loras: loras
                };

                if (mediaType === 'image' && createNumImages > 1 && !selectedModel.includes('edit')) {
                    const taskIndexes = Array.from({ length: createNumImages }, (_, i) => i);
                    const promises = taskIndexes.map(async (i) => {
                        if (i > 0) await new Promise(r => setTimeout(r, i * 500));
                        return falService.generateMedia(request);
                    });
                    const results = await Promise.all(promises);
                    setGeneratedMediaUrls(results);
                    resultUrls = results;
                } else {
                    const url = await falService.generateMedia(request);
                    setGeneratedMediaUrls([url]);
                    resultUrls = [url];
                }

            } else {
                const request: GenerationRequest = {
                    type: mediaType,
                    prompt: finalPrompt,
                    model: selectedModel,
                    aspectRatio: mediaType === 'video' ? i2vAspectRatio : aspectRatio,
                    contentParts: contentParts,
                    videoConfig: mediaType === 'video' ? {
                        resolution: videoResolution,
                        durationSeconds: videoDuration.replace('s', ''),
                        withAudio: false
                    } : undefined,
                    editConfig: {
                        imageSize: createImageSize,
                        numImages: createNumImages
                    }
                };

                if (mediaType === 'image') {
                    const taskIndexes = Array.from({ length: createNumImages }, (_, i) => i);
                    const collectedUrls: string[] = [];
                    const imagePromises = taskIndexes.map(async (i) => {
                        try {
                            if (i > 0) await new Promise(r => setTimeout(r, i * 2000));
                            const url = await geminiService.generateMedia(request);
                            if (url) {
                                setGeneratedMediaUrls(prev => [...prev, url]);
                                collectedUrls.push(url);
                                return url;
                            }
                        } catch (e) { console.error(e); }
                        return null;
                    });
                    await Promise.all(imagePromises);
                    resultUrls = collectedUrls;
                } else {
                    const result = await geminiService.generateMedia(request);
                    if (result) {
                        setGeneratedMediaUrls([result]);
                        resultUrls = [result];
                    }
                }
            }

            generationSucceeded = resultUrls.length > 0;

        } catch (error: any) {
            console.error(error);
            generationError = error?.message || 'Unknown error';
            alert("Media generation failed.");
        } finally {
            setIsGeneratingMedia(false);

            // --- Save to Generation History ---
            try {
                const historyEntry: DBGenerationHistory = {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: mediaType,
                    prompt: finalPromptToUse,
                    model: selectedModel,
                    mediaUrls: resultUrls,
                    aspectRatio: mediaType === 'video' ? i2vAspectRatio : aspectRatio,
                    imageSize: createImageSize,
                    numImages: createNumImages,
                    videoResolution: mediaType === 'video' ? videoResolution : undefined,
                    videoDuration: mediaType === 'video' ? videoDuration : undefined,
                    withAudio: mediaType === 'video' ? withAudio : undefined,
                    cameraFixed: mediaType === 'video' ? cameraFixed : undefined,
                    themeId: selectedThemeId,
                    themeName: currentTheme?.name,
                    topic: topic || undefined,
                    visuals: specificVisuals || undefined,
                    outfit: specificOutfit || undefined,
                    service: isFalModel ? 'fal' : 'gemini',
                    status: generationSucceeded ? 'success' : 'failed',
                    errorMessage: generationError || undefined,
                };
                await dbService.saveGenerationHistory(historyEntry);
            } catch (histErr) {
                console.error('Failed to save generation history:', histErr);
            }
        }
    };

    const handleGenerateCaption = async (overrides?: any) => {
        const t = overrides?.topic || topic;
        if (!t) return;
        setIsGeneratingCaption(true);
        try {
            const template = captionStyles.find(c => c.id === (overrides?.captionType || captionType));
            const systemInstruction = `
            You are Willow Wisdom.
            CORE PERSONA: ${WILLOW_PROFILE.subject}
            CONTEXT: Theme: ${(overrides?.theme || currentTheme).name}, Visuals: ${overrides?.visuals || specificVisuals}, Outfit: ${overrides?.outfit || specificOutfit}
            TASK: Write a caption for Topic: "${t}". Style: ${template?.prompt}
            `;
            const result = await geminiService.generateText(`TOPIC: "${t}"`, systemInstruction);
            setGeneratedCaption(result);
        } catch (e) {
            console.error(e);
            setGeneratedCaption("Error generating caption.");
        } finally {
            setIsGeneratingCaption(false);
        }
    };

    const handleGenerateContent = () => {
        handleGenerateMedia();
        handleGenerateCaption();
    };

    const handleGenerateRandomPost = async () => {
        setIsDreaming(true);
        try {
            const randomTheme = themes[Math.floor(Math.random() * themes.length)];
            const randomCaption = captionStyles[Math.floor(Math.random() * captionStyles.length)];
            setSelectedThemeId(randomTheme.id);
            setCaptionType(randomCaption.id);

            const concept = await (geminiService as any).generateConcept(randomTheme.name, 'post');
            setTopic(concept.topic);
            setSpecificVisuals(concept.setting);
            setSpecificOutfit(concept.outfit);

            let prompt = randomTheme.basePrompt.replace("[Subject Definition]", WILLOW_PROFILE.subject)
                .replace("[Outfit]", concept.outfit || randomTheme.defaultOutfit);

            if (randomTheme.id === 'B') prompt = prompt.replace("[Visuals]", concept.setting || randomTheme.defaultVisuals || "");
            else if (['C', 'D', 'E'].includes(randomTheme.id)) prompt = prompt.replace("[Action]", concept.setting || randomTheme.defaultAction || "");
            else prompt = prompt.replace("[Setting]", concept.setting || randomTheme.defaultSetting || "");

            prompt += ` ${WILLOW_PROFILE.defaultParams}`;
            setGeneratedPrompt(prompt);

            handleGenerateMedia(prompt);
            handleGenerateCaption({
                topic: concept.topic,
                theme: randomTheme,
                visuals: concept.setting,
                outfit: concept.outfit,
                captionType: randomCaption.id
            });

        } catch (e) { console.error(e); } finally { setIsDreaming(false); }
    };

    // --- SAVE / PRESET HANDLERS ---

    const handleSavePost = async () => {
        const newPost: SavedPost = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            topic,
            caption: generatedCaption,
            captionType,
            mediaUrls: generatedMediaUrls,
            mediaType: generatedMediaUrls.some(url => url.startsWith('data:video') || url.match(/\.(mp4|webm|mov)$/i)) ? 'video' : 'image',
            themeId: selectedThemeId,
            visuals: specificVisuals,
            outfit: specificOutfit,
            prompt: generatedPrompt,
            tags: []
        };
        try {
            await dbService.savePost(newPost);
            setSavedPosts(prev => [newPost, ...prev]);
            setTotalSavedCount(prev => prev + 1);
            alert("Post Saved!");
        } catch (e) {
            console.error(e);
            alert("Save failed.");
        }
    };

    const handleSavePreset = async (_data: any, nameOverride?: string) => {
        // Determine prompts based on active tab
        let promptToSave = generatedPrompt;
        let description = topic || "No description";

        if (activeTab === 'edit') {
            promptToSave = refinePrompt;
            description = `Refinement: ${refinePrompt.slice(0, 30)}...`;
        } else if (activeTab === 'animate') {
            promptToSave = i2vPrompt;
            description = `Animation: ${i2vPrompt.slice(0, 30)}...`;
        }

        let name = nameOverride;
        if (!name) {
            // Only prompt if no name provided from input
            name = prompt("Enter a name for this preset:") || `Preset ${new Date().toLocaleTimeString()}`;
        }

        // If user cancelled prompt (and name became null from prompt cancel), handle it?
        // prompt() returns null if cancelled. '' if empty ok.
        // If nameOverride was undefined, we ran prompt. If that returns null, we probably shouldn't save?
        // But the previous code defaulted to 'Preset Time' if prompt returns falsy.
        // Let's keep existing fallback behavior for safety if prompt returns empty/null.
        if (!name) name = `Preset ${new Date().toLocaleTimeString()}`;

        const preset: DBPromptPreset = {
            id: crypto.randomUUID(),
            name: name,
            description: description,
            basePrompt: promptToSave,
            themeId: selectedThemeId,
            visuals: specificVisuals,
            outfit: specificOutfit,
            action: "",
            model: selectedModel,
            aspectRatio: aspectRatio,
            negativePrompt: WILLOW_PROFILE.negativePrompt,
            videoDuration,
            videoResolution,
            timestamp: Date.now()
        };
        await dbService.savePreset(preset);
        setPresets(prev => [preset, ...prev]);
        return preset.id;
    };

    const handleLoadPreset = (preset: DBPromptPreset) => {
        if (preset.themeId) setSelectedThemeId(preset.themeId);
        if (preset.visuals) setSpecificVisuals(preset.visuals);
        if (preset.outfit) setSpecificOutfit(preset.outfit);
        if (preset.model) setSelectedModel(preset.model);
        if (preset.videoDuration) setVideoDuration(preset.videoDuration);
        if (preset.videoResolution) setVideoResolution(preset.videoResolution);

        if (activeTab === 'create') {
            if (preset.aspectRatio) setAspectRatio(preset.aspectRatio);
            if (preset.basePrompt) {
                ignoreNextPromptUpdate.current = true;
                setGeneratedPrompt(preset.basePrompt);
            }
        } else if (activeTab === 'edit') {
            if (preset.basePrompt) setRefinePrompt(preset.basePrompt);
        } else if (activeTab === 'animate') {
            if (preset.basePrompt) setI2VPrompt(preset.basePrompt);
            if (preset.aspectRatio && preset.aspectRatio !== 'auto') {
                // Approximate mapping or direct set if compatible
                setI2vAspectRatio(preset.aspectRatio);
            }
        }
        setIsPresetsOpen(false);
    };

    const handleDeletePreset = async (id: string) => {
        await dbService.deletePreset(id);
        setPresets(prev => prev.filter(p => p.id !== id));
    };

    // --- RECALL POST ---
    // --- RECALL POST ---
    const handleRecallPost = (post: SavedPost) => {
        // Correctly set "Create" tab state
        setSelectedThemeId(post.themeId);
        setCaptionType(post.captionType || 'A'); // Default to A if missing

        // Tone/Platform are derived or not explicit in saved post, leaving defaulting logic.

        setTopic(post.topic);
        setSpecificVisuals(post.visuals);
        setSpecificOutfit(post.outfit);

        // Populate generated content if available, so user sees result immediately
        setGeneratedCaption(post.caption);
        setGeneratedPrompt(post.prompt);

        // Ensure manual mode is respected if it was custom
        if (post.themeId === 'CUSTOM') {
            // Logic for custom theme is handled by selectedThemeId === 'CUSTOM'
        }

        // Prevent auto-overwrite of prompt by useEffect on mount/change if we have a saved prompt
        if (post.prompt) {
            ignoreNextPromptUpdate.current = true;
        }

        setActiveTab('create');
    };

    const handleImportReferences = async () => {
        if (!confirm("Import 'GenReference' images into Post Library?")) return;
        try {
            const res = await fetch('/references.json');
            if (!res.ok) throw new Error("References file not found. Please ask admin to run 'process-references' script.");
            const refs: SavedPost[] = await res.json();
            if (refs.length === 0) return alert("No references found in catalog.");
            if (!confirm(`Found ${refs.length} reference images. Import them now?`)) return;
            let count = 0;
            for (const item of refs) {
                await dbService.savePost(item);
                count++;
            }
            const newCount = await dbService.getPostsCount();
            setTotalSavedCount(newCount);
            const batch = await dbService.getRecentPostsBatch(24, 0);
            setSavedPosts(batch);
            alert(`Successfully imported ${count} references!`);
        } catch (e: any) { console.error(e); alert("Import failed: " + e.message); }
    };

    const handleImportIGArchive = async () => {
        if (!confirm("Import Instagram Archive?")) return;
        try {
            const manifestRes = await fetch('/ig_archive_manifest.json');
            if (!manifestRes.ok) throw new Error("Manifest not found.");
            const manifest = await manifestRes.json();
            const { totalChunks, totalPosts } = manifest;
            if (totalPosts === 0) return alert("Archive is empty.");
            if (!confirm(`Found ${totalPosts} posts. Import?`)) return;

            let count = 0;
            for (let i = 0; i < totalChunks; i++) {
                try {
                    const res = await fetch(`/ig_archive_${i}.json`);
                    if (!res.ok) continue;
                    const chunk: SavedPost[] = await res.json();
                    for (const post of chunk) {
                        await dbService.savePost(post);
                        count++;
                    }
                } catch (err) { console.error(err); }
            }
            const newCount = await dbService.getPostsCount();
            setTotalSavedCount(newCount);
            const batch = await dbService.getRecentPostsBatch(24, 0);
            setSavedPosts(batch);
            alert(`Successfully imported ${count} posts!`);
        } catch (e: any) { console.error(e); alert("Import failed: " + e.message); }
    };

    const handleRefineEntry = (url: string, index: number) => {
        setRefineTarget({ url, index });
        setMediaType('image');
        setRefinePrompt("");
        setRefineResultUrl(null);
        setActiveTab('edit');
    };

    const handleI2VEntry = (url: string, index: number) => {
        setI2VTarget({ url, index });
        setI2VPrompt("");
        setI2VResultUrl(null);
        setMediaType('video');
        setActiveTab('animate');
    };

    const handleSaveToAssets = async (url: string, type: 'image' | 'video', name?: string) => {
        try {
            let base64 = url;
            if (!url.startsWith('data:')) {
                const res = await fetch(url);
                const blob = await res.blob();
                base64 = await new Promise<string>(r => {
                    const reader = new FileReader();
                    reader.onloadend = () => r(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }

            // Check if already exists
            const allAssets = await dbService.getAllAssets();
            const exists = allAssets.find(a => a.base64 === base64);
            if (exists) {
                if (!confirm("This image is already in your Asset Library. Save another copy?")) {
                    return;
                }
            }

            const newAsset: Asset = {
                id: crypto.randomUUID(),
                name: name || `Saved ${type} ${new Date().toLocaleString()}`,
                type: type, // Keep as 'image' or 'video' for general library
                base64: base64,
                folderId: null,
                timestamp: Date.now(),
                selected: false // Do NOT automatically select as a prompt reference
            };

            await dbService.saveAsset(newAsset);
            // Do NOT update setAssets(prev => [...]) here.
            // Generative results saved to the library should not become prompt references.
            alert("Saved to Asset Library!");
        } catch (err) {
            console.error("Save to assets failed:", err);
            alert("Failed to save asset.");
        }
    };

    const handleDownload = async (url: string, prefix: string = 'willow') => {
        try {
            const isVideo = url.startsWith('data:video') || url.match(/\.(mp4|webm|mov)$/i);
            const extension = isVideo ? 'mp4' : 'png';
            const filename = `${prefix}_${Date.now()}.${extension}`;

            let blob: Blob;
            if (url.startsWith('data:')) {
                const parts = url.split(',');
                const mime = parts[0].match(/:(.*?);/)![1];
                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                blob = new Blob([u8arr], { type: mime });
            } else {
                const response = await fetch(url);
                blob = await response.blob();
            }

            const file = new File([blob], filename, { type: blob.type });

            // Using Mobile Share API for native "Save to Photos" support
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Save to Photos',
                    });
                    return;
                } catch (shareErr) {
                    console.log("Share cancelled or failed, falling back to traditional download", shareErr);
                }
            }

            // Fallback for desktop/unsupported browsers
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        } catch (err) {
            console.error("Download failed:", err);
            // Universal fallback
            const a = document.createElement('a');
            a.href = url;
            a.download = 'willow_media';
            a.target = "_blank";
            a.click();
        }
    };

    const handleApproveRefinement = (action: 'replace' | 'add') => {
        if (!refineResultUrl) return;
        if (action === 'replace' && refineTarget) {
            setGeneratedMediaUrls(prev => {
                const next = [...prev];
                next[refineTarget.index] = refineResultUrl;
                return next;
            });
        } else {
            setGeneratedMediaUrls(prev => [...prev, refineResultUrl]);
        }
        setRefineTarget(null);
        setRefineResultUrl(null);
        setActiveTab('create');
    };


    // --- RENDER ---
    return (
        <div className="h-screen w-full bg-[#050505] text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-100 flex flex-col overflow-hidden">
            <CreatorHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                savedCount={totalSavedCount}
            />

            <div className="flex-1 overflow-y-auto pt-16 md:pt-20 pb-24 md:pb-10 scroll-smooth">
                {activeTab === 'create' && (
                    <CreateTab
                        themes={themes}
                        captionStyles={captionStyles}
                        selectedThemeId={selectedThemeId}
                        setSelectedThemeId={setSelectedThemeId}
                        customTheme={customTheme}
                        setCustomTheme={setCustomTheme}
                        specificVisuals={specificVisuals}
                        setSpecificVisuals={setSpecificVisuals}
                        specificOutfit={specificOutfit}
                        setSpecificOutfit={setSpecificOutfit}
                        assets={assets}
                        onAssetsAdd={handleAssetsAdd}
                        onAssetRemove={handleAssetRemove}
                        onAssetToggle={handleAssetToggle}
                        handleInputImageUpload={handleInputImageUpload}
                        generatedPrompt={generatedPrompt}
                        setGeneratedPrompt={setGeneratedPrompt}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        mediaType={mediaType}
                        onGenerateCaptionOnly={handleGenerateCaption}
                        setMediaType={setMediaType}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        createImageSize={createImageSize}
                        setCreateImageSize={setCreateImageSize}
                        createNumImages={createNumImages}
                        setCreateNumImages={setCreateNumImages}
                        videoResolution={videoResolution}
                        setVideoResolution={setVideoResolution}
                        videoDuration={videoDuration}
                        setVideoDuration={setVideoDuration}
                        topic={topic}
                        setTopic={setTopic}
                        captionType={captionType}
                        setCaptionType={setCaptionType}
                        generatedCaption={generatedCaption}
                        setGeneratedCaption={setGeneratedCaption}
                        isDreaming={isDreaming}
                        handleDreamConcept={handleDreamConcept}
                        handleGenerateContent={handleGenerateContent}
                        isGeneratingMedia={isGeneratingMedia}
                        isGeneratingCaption={isGeneratingCaption}
                        handleGenerateRandomPost={handleGenerateRandomPost}
                        generatedMediaUrls={generatedMediaUrls}
                        handleRefineEntry={handleRefineEntry}
                        handleI2VEntry={handleI2VEntry}
                        onRemoveMedia={(index) => {
                            setGeneratedMediaUrls(prev => prev.filter((_, i) => i !== index));
                        }}
                        onRerollMedia={async (index) => {
                            // Reroll logic similar to generate but for single item and replacement
                            const promptOverride = generatedPrompt;
                            if (!promptOverride) return;

                            // Determine if using Fal or Gemini (reuse logic from handleGenerateMedia)
                            const isFalModel = selectedModel.includes('grok') || selectedModel.includes('seedream') || selectedModel.includes('seedance') || selectedModel.includes('wan');

                            // Prepare assets part
                            const selectedImages = assets.filter(a => a.selected && a.type === 'image');
                            let finalPrompt = promptOverride;
                            const contentParts: any[] = [];
                            if (selectedImages.length > 0) {
                                const faceInstruction = `Generate a portrait consistent with the character identity in the attached reference images. Focus on her specific red hair, blue-green eyes, and freckles. Maintain the subject's unique facial features while implementing the following scene:`;
                                finalPrompt = `${faceInstruction} ${promptOverride}`;
                                selectedImages.forEach(img => {
                                    contentParts.push({
                                        inlineData: { mimeType: "image/jpeg", data: img.base64.split(',')[1] }
                                    });
                                });
                            }

                            // Indicate loading state for specific item? 
                            // For simplicity, use global loading or we'd need a map of loading indices.
                            // Using global isGeneratingMedia is safest for now to block other actions.
                            setIsGeneratingMedia(true);

                            try {
                                let newUrl: string | null = null;

                                if (isFalModel) {
                                    const request: FalGenerationRequest = {
                                        model: selectedModel,
                                        prompt: finalPrompt,
                                        aspectRatio: mediaType === 'video' ? i2vAspectRatio : aspectRatio,
                                        contentParts: contentParts,
                                        videoConfig: mediaType === 'video' ? {
                                            resolution: videoResolution,
                                            durationSeconds: videoDuration.replace('s', ''),
                                            withAudio,
                                            cameraFixed
                                        } : undefined,
                                        editConfig: {
                                            imageSize: createImageSize,
                                            numImages: 1, // Force 1 for reroll
                                            enableSafety,
                                            enhancePromptMode
                                        }
                                    };
                                    newUrl = await falService.generateMedia(request);
                                } else {
                                    // Gemini / Veo
                                    const request: GenerationRequest = {
                                        type: mediaType,
                                        prompt: finalPrompt,
                                        model: selectedModel,
                                        aspectRatio: mediaType === 'video' ? i2vAspectRatio : aspectRatio,
                                        contentParts: contentParts,
                                        videoConfig: mediaType === 'video' ? {
                                            resolution: videoResolution,
                                            durationSeconds: videoDuration.replace('s', ''),
                                            withAudio: false
                                        } : undefined,
                                        editConfig: {
                                            imageSize: createImageSize,
                                            numImages: 1
                                        }
                                    };
                                    newUrl = await geminiService.generateMedia(request);
                                }

                                if (newUrl) {
                                    setGeneratedMediaUrls(prev => {
                                        const next = [...prev];
                                        next[index] = newUrl!;
                                        return next;
                                    });
                                }

                            } catch (e) {
                                console.error("Reroll failed", e);
                                alert("Reroll failed.");
                            } finally {
                                setIsGeneratingMedia(false);
                            }
                        }}
                        onSaveToAssets={handleSaveToAssets}
                        handleCopy={(t) => navigator.clipboard.writeText(t)}
                        handleSavePost={handleSavePost}
                        isSaving={false} // Can add loading state for saving later if needed
                        showSaveForm={showSaveForm}
                        setShowSaveForm={setShowSaveForm}
                        loras={loras}
                        setLoras={setLoras}
                        onLoRAUpload={async (file: File) => {
                            try {
                                const url = await falService.uploadFile(file);
                                setLoras(prev => [...prev, { path: url, scale: 1.0 }]);
                            } catch (e) {
                                console.error("LoRA Upload Failed", e);
                                alert("Failed to upload LoRA");
                            }
                        }}
                        presetsDropdown={
                            <PresetsDropdown
                                isOpen={isPresetsOpen}
                                setIsOpen={setIsPresetsOpen}
                                showSaveForm={showSaveForm}
                                setShowSaveForm={setShowSaveForm}
                                currentPostData={{}}
                                onSavePost={handleSavePreset}
                                onLoadPreset={handleLoadPreset}
                                presetsList={presets}
                                onDeletePreset={handleDeletePreset}
                                direction="up"
                            />
                        }
                        onPreview={(url) => setPreviewContext({ urls: generatedMediaUrls, index: generatedMediaUrls.indexOf(url) })}
                        onDownload={handleDownload}
                        onUploadToPost={(files: FileList | null) => {
                            if (!files) return;
                            Array.from(files).forEach(file => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    if (reader.result) {
                                        setGeneratedMediaUrls(prev => [...prev, reader.result as string]);
                                    }
                                };
                                reader.readAsDataURL(file);
                            });
                        }}
                    />
                )}

                {activeTab === 'posts' && (
                    <PostsTab
                        savedPosts={savedPosts}
                        searchResults={searchResults}
                        totalSavedCount={totalSavedCount}
                        searchQuery={searchQuery}
                        isSearching={isSearching}
                        sortOrder={sortOrder}
                        onSearchChange={setSearchQuery}
                        onSortChange={setSortOrder}
                        onLoadPost={(post) => {
                            setTopic(post.topic);
                            setGeneratedCaption(post.caption);
                            setCaptionType(post.captionType);
                            setGeneratedMediaUrls(post.mediaUrls);
                            setMediaType(post.mediaType);
                            setSelectedThemeId(post.themeId);
                            setSpecificVisuals(post.visuals);
                            setSpecificOutfit(post.outfit);
                            setGeneratedPrompt(post.prompt);
                            setActiveTab('create');
                        }}
                        onRecall={handleRecallPost}
                        onDeletePost={async (id) => {
                            if (!confirm("Delete this post?")) return;
                            await dbService.deletePost(id);
                            setSavedPosts(prev => prev.filter(p => p.id !== id));
                            setTotalSavedCount(prev => prev - 1);
                        }}
                        onImportReferences={handleImportReferences}
                        onImportIGArchive={handleImportIGArchive}
                        onLoadMore={async () => {
                            if (isLoadingMore || searchQuery) return;
                            setIsLoadingMore(true);
                            try {
                                const nextBatch = await dbService.getRecentPostsBatch(24, savedPosts.length, sortOrder);
                                if (nextBatch.length > 0) {
                                    setSavedPosts(prev => [...prev, ...nextBatch]);
                                }
                            } catch (e) { console.error(e); } finally { setIsLoadingMore(false); }
                        }}

                        onPreview={(url, urls) => handleOpenPreview(url, urls)}
                    />
                )}

                {activeTab === 'assets' && (
                    <AssetLibraryTab
                        onPreview={(url) => handleOpenPreview(url)}
                    />
                )}

                {activeTab === 'edit' && (
                    <EditTab
                        refineTarget={refineTarget}
                        setRefineTarget={setRefineTarget}
                        refinePrompt={refinePrompt}
                        setRefinePrompt={setRefinePrompt}
                        refineImageSize={refineImageSize}
                        setRefineImageSize={setRefineImageSize}
                        refineNumImages={refineNumImages}
                        setRefineNumImages={setRefineNumImages}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        refineAdditionalImages={refineAdditionalImages}
                        setRefineAdditionalImages={setRefineAdditionalImages}
                        refineResultUrl={refineResultUrl}
                        setRefineResultUrl={setRefineResultUrl}
                        isRefining={isRefining}
                        enableSafety={enableSafety}
                        setEnableSafety={setEnableSafety}
                        enhancePromptMode={enhancePromptMode}
                        setEnhancePromptMode={setEnhancePromptMode}
                        onRefineSubmit={async () => {
                            if (!refineTarget || !refinePrompt) return;
                            setIsRefining(true);
                            try {
                                const urlToBase64 = async (url: string) => {
                                    if (url.startsWith('data:')) return url.split(',')[1];
                                    const res = await fetch(url);
                                    const blob = await res.blob();
                                    return new Promise<string>(r => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => r((reader.result as string).split(',')[1]);
                                        reader.readAsDataURL(blob);
                                    });
                                };
                                const base64 = await urlToBase64(refineTarget.url);
                                const contentParts: any[] = [{ inlineData: { mimeType: "image/jpeg", data: base64 } }];
                                refineAdditionalImages.forEach(img => {
                                    contentParts.push({ inlineData: { mimeType: "image/jpeg", data: img.base64.split(',')[1] } });
                                });

                                let url = "";
                                if (selectedModel.includes('grok') || selectedModel.includes('seedream')) {
                                    // Fal Service
                                    const req: FalGenerationRequest = {
                                        model: selectedModel,
                                        prompt: refinePrompt,
                                        contentParts,
                                        editConfig: {
                                            imageSize: refineImageSize,
                                            numImages: refineNumImages,
                                            enableSafety: false,
                                            enhancePromptMode
                                        }
                                    };
                                    url = await falService.generateMedia(req);
                                } else {
                                    // Gemini Service
                                    const req: GenerationRequest = {
                                        type: 'edit',
                                        prompt: refinePrompt,
                                        model: selectedModel,
                                        aspectRatio,
                                        contentParts,
                                        editConfig: {
                                            imageSize: refineImageSize,
                                            numImages: refineNumImages
                                        }
                                    };
                                    url = await geminiService.generateMedia(req);
                                }

                                if (url) {
                                    setRefineResultUrl(url);
                                    // Save to History
                                    try {
                                        await dbService.saveGenerationHistory({
                                            id: crypto.randomUUID(),
                                            timestamp: Date.now(),
                                            type: 'image',
                                            prompt: refinePrompt,
                                            model: selectedModel,
                                            mediaUrls: [url],
                                            service: (selectedModel.includes('grok') || selectedModel.includes('seedream')) ? 'fal' : 'gemini',
                                            status: 'success'
                                        });
                                    } catch (err) { console.error("Failed to save history:", err); }
                                }
                            } catch (e) { console.error(e); alert("Refinement failed"); } finally { setIsRefining(false); }
                        }}
                        onApproveRefinement={handleApproveRefinement}
                        onExit={() => setActiveTab('create')}
                        onI2VEntry={(url) => handleI2VEntry(url, -1)}
                        presetsDropdown={
                            <PresetsDropdown
                                isOpen={isPresetsOpen}
                                setIsOpen={setIsPresetsOpen}
                                showSaveForm={showSaveForm}
                                setShowSaveForm={setShowSaveForm}
                                currentPostData={{}}
                                onSavePost={handleSavePreset}
                                onLoadPreset={handleLoadPreset}
                                presetsList={presets}
                                onDeletePreset={handleDeletePreset}
                                direction="down"
                            />
                        }
                        onSaveToAssets={handleSaveToAssets}
                        onPreview={(url) => handleOpenPreview(url)}
                        onDownload={handleDownload}
                    />
                )}

                {activeTab === 'animate' && (
                    <AnimateTab
                        i2vTarget={i2vTarget}
                        setI2VTarget={setI2VTarget}
                        i2vPrompt={i2vPrompt}
                        setI2VPrompt={setI2VPrompt}
                        i2vAspectRatio={i2vAspectRatio}
                        setI2VAspectRatio={setI2vAspectRatio}
                        videoDuration={videoDuration}
                        setVideoDuration={setVideoDuration}
                        videoResolution={videoResolution}
                        setVideoResolution={setVideoResolution}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        isGeneratingI2V={isGeneratingI2V}
                        withAudio={withAudio}
                        setWithAudio={setWithAudio}
                        cameraFixed={cameraFixed}
                        setCameraFixed={setCameraFixed}
                        loras={loras}
                        setLoras={setLoras}
                        onLoRAUpload={async (file: File) => {
                            try {
                                const url = await falService.uploadFile(file);
                                setLoras(prev => [...prev, { path: url, scale: 1.0 }]);
                            } catch (e) {
                                console.error("LoRA Upload Failed", e);
                                alert("Failed to upload LoRA");
                            }
                        }}

                        onGenerateI2V={async () => {
                            if (!i2vTarget || !i2vPrompt) return;
                            setIsGeneratingI2V(true);
                            try {
                                const urlToBase64 = async (url: string) => {
                                    if (url.startsWith('data:')) return url.split(',')[1];
                                    const res = await fetch(url);
                                    const blob = await res.blob();
                                    return new Promise<string>(r => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => r((reader.result as string).split(',')[1]);
                                        reader.readAsDataURL(blob);
                                    });
                                };
                                const base64 = await urlToBase64(i2vTarget.url);
                                const contentParts = [{ inlineData: { mimeType: "image/jpeg", data: base64 } }];

                                let url = "";
                                if (selectedModel.includes('grok') || selectedModel.includes('seedance') || selectedModel.includes('wan')) {
                                    // Fal Service
                                    const req: FalGenerationRequest = {
                                        model: selectedModel,
                                        prompt: i2vPrompt,
                                        aspectRatio: i2vAspectRatio,
                                        contentParts,
                                        loras,
                                        videoConfig: {
                                            resolution: videoResolution,
                                            durationSeconds: videoDuration.replace('s', ''),
                                            withAudio,
                                            cameraFixed
                                        },
                                        editConfig: {
                                            enableSafety: false
                                        }
                                    };
                                    url = await falService.generateMedia(req);
                                } else {
                                    // Gemini / Veo Service
                                    const req: GenerationRequest = {
                                        type: 'video',
                                        prompt: i2vPrompt,
                                        model: selectedModel,
                                        aspectRatio: i2vAspectRatio,
                                        videoConfig: {
                                            resolution: videoResolution,
                                            durationSeconds: videoDuration.replace('s', ''),
                                            withAudio: false
                                        },
                                        contentParts
                                    };
                                    url = await geminiService.generateMedia(req);
                                }

                                if (url) {
                                    setI2VResultUrl(url);
                                    // Save to History
                                    try {
                                        await dbService.saveGenerationHistory({
                                            id: crypto.randomUUID(),
                                            timestamp: Date.now(),
                                            type: 'video',
                                            prompt: i2vPrompt,
                                            model: selectedModel,
                                            mediaUrls: [url],
                                            service: (selectedModel.includes('grok') || selectedModel.includes('seedance') || selectedModel.includes('wan')) ? 'fal' : 'gemini',
                                            status: 'success'
                                        });
                                    } catch (err) { console.error("Failed to save history:", err); }
                                }
                            } catch (e: any) { console.error(e); alert(`Video gen failed: ${e.message || e}`); } finally { setIsGeneratingI2V(false); }
                        }}
                        generatedI2VUrl={i2vResultUrl}
                        onExit={() => setActiveTab('create')}
                        onApproveI2V={() => {
                            if (!i2vResultUrl) return;
                            // Always add as new item, preserve original
                            setGeneratedMediaUrls(prev => [...prev, i2vResultUrl]);

                            setI2VTarget(null);
                            setI2VResultUrl(null);
                            setActiveTab('create');
                        }}
                        onDiscardI2V={() => {
                            setI2VResultUrl(null);
                        }}
                        presetsDropdown={
                            <PresetsDropdown
                                isOpen={isPresetsOpen}
                                setIsOpen={setIsPresetsOpen}
                                showSaveForm={showSaveForm}
                                setShowSaveForm={setShowSaveForm}
                                currentPostData={{}}
                                onSavePost={handleSavePreset}
                                onLoadPreset={handleLoadPreset}
                                presetsList={presets}
                                onDeletePreset={handleDeletePreset}
                                direction="down"
                            />
                        }
                        onSaveToAssets={handleSaveToAssets}
                        onPreview={(url) => handleOpenPreview(url)}
                        onDownload={handleDownload}
                    />
                )}

                {activeTab === 'scripts' && <ScriptsTab />}
                {activeTab === 'settings' && (
                    <SettingsTab
                        themes={themes}
                        setThemes={persistThemes}
                        captionStyles={captionStyles}
                        setCaptionStyles={persistCaptionStyles}
                        onExit={() => setActiveTab('create')}
                    />
                )}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-[100] px-4 pb-safe-area">
                <nav className="flex items-center justify-around h-16">
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex flex-col items-center gap-1 transition-all active-scale ${activeTab === 'create' ? 'text-emerald-400' : 'text-white/40'}`}
                    >
                        <PenTool className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Create</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`flex flex-col items-center gap-1 transition-all active-scale ${activeTab === 'edit' ? 'text-emerald-400' : 'text-white/40'}`}
                    >
                        <Edit2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Refine</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('animate')}
                        className={`flex flex-col items-center gap-1 transition-all active-scale ${activeTab === 'animate' ? 'text-emerald-400' : 'text-white/40'}`}
                    >
                        <Play className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Animate</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex flex-col items-center gap-1 transition-all active-scale ${activeTab === 'posts' ? 'text-emerald-400' : 'text-white/40'}`}
                    >
                        <Archive className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Posts</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('assets')}
                        className={`flex flex-col items-center gap-1 transition-all active-scale ${activeTab === 'assets' ? 'text-emerald-400' : 'text-white/40'}`}
                    >
                        <Folder className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Assets</span>
                    </button>
                </nav>
            </div>

            {/* Media Preview Modal */}
            {previewContext && previewUrl && (
                <div
                    className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-2 md:p-12 animate-in fade-in duration-300"
                    onClick={() => setPreviewContext(null)}
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/60 hover:text-white transition-all border border-white/10 z-[1001]"
                        onClick={() => setPreviewContext(null)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>

                    {/* Navigation Buttons */}
                    {previewContext.urls.length > 1 && (
                        <>
                            <button
                                className="absolute left-4 md:left-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all border border-white/5 z-[1001]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewContext(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                            <button
                                className="absolute right-4 md:right-8 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all border border-white/5 z-[1001]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewContext(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </>
                    )}

                    <div
                        className="relative w-full h-full flex flex-col items-center justify-center"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex-1 flex items-center justify-center min-h-0 w-full relative">
                            {previewUrl.startsWith('data:video') || previewUrl.match(/\.(mp4|webm|mov)$/i) ? (
                                <video
                                    src={previewUrl}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-full rounded-xl md:rounded-2xl shadow-2xl border border-white/10"
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Full Preview"
                                    className="max-w-full max-h-full object-contain rounded-xl md:rounded-2xl shadow-2xl border border-white/10"
                                />
                            )}

                            {/* Counter */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-mono tracking-widest text-white/60">
                                {previewContext.index + 1} / {previewContext.urls.length}
                            </div>
                        </div>

                        <div className="mt-6 shrink-0 flex flex-wrap justify-center gap-3 md:gap-4 pb-4 px-4 w-full">
                            {!previewUrl.startsWith('data:video') && (
                                <>
                                    <button
                                        onClick={() => {
                                            handleRefineEntry(previewUrl, previewContext.index);
                                            setPreviewContext(null);
                                        }}
                                        className="px-4 md:px-6 py-2 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/80 transition-all flex items-center gap-2"
                                    >
                                        <Edit2 className="w-3 md:w-4 h-3 md:h-4 text-emerald-400" />
                                        Refine
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleI2VEntry(previewUrl, previewContext.index);
                                            setPreviewContext(null);
                                        }}
                                        className="px-4 md:px-6 py-2 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/80 transition-all flex items-center gap-2"
                                    >
                                        <Play className="w-3 md:w-4 h-3 md:h-4 text-emerald-400" />
                                        Animate
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => handleDownload(previewUrl!, 'willow_preview')}
                                className="px-4 md:px-6 py-2 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400/50 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest text-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Download
                            </button>

                            <button
                                onClick={() => handleSaveToAssets(previewUrl, previewUrl.startsWith('data:video') || previewUrl.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image')}
                                className="px-4 md:px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-400 transition-all flex items-center gap-2"
                            >
                                <Archive className="w-3 md:w-4 h-3 md:h-4" />
                                Save to Library
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
