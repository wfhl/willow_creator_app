/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';

const loadingMessages = [
    "Warming up the digital director...",
    "Gathering pixels and photons...",
    "Storyboarding your vision...",
    "Consulting with the AI muse...",
    "Rendering the first scene...",
    "Applying cinematic lighting...",
    "This can take a few minutes, hang tight!",
    "Adding a touch of movie magic...",
    "Composing the final cut...",
    "Polishing the masterpiece...",
    "Teaching the AI to say 'I'll be back'...",
    "Checking for digital dust bunnies...",
    "Calibrating the irony sensors...",
    "Untangling the timelines...",
    "Enhancing to ludicrous speed...",
    "Don't worry, the pixels are friendly.",
    "Harvesting nano banana stems...",
    "Praying to the Gemini star...",
    "Starting a draft for your oscar speech..."
];

interface LoadingIndicatorProps {
    title?: string;
    modelName?: string;
    type?: 'image' | 'video' | 'edit' | 'text';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    title = "Generating Content",
    modelName,
    type = 'image'
}) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
        }, 3000); // Change message every 3 seconds

        return () => clearInterval(intervalId);
    }, []);

    const borderColors = {
        video: 'border-blue-500',
        edit: 'border-emerald-500',
        text: 'border-red-500',
        image: 'border-purple-500',
        purple: 'border-purple-500' // fallback
    };

    const borderColor = borderColors[type] || borderColors.purple;

    return (
        <div className="flex flex-col items-center justify-center p-12 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
            <div className={`w-20 h-20 border-4 border-t-transparent ${borderColor} rounded-full animate-spin shadow-[0_0_30px_rgba(0,0,0,0.5)]`}></div>
            <h2 className="text-xl font-bold mt-8 text-white uppercase tracking-[0.2em] font-serif">{title}</h2>
            <p className="mt-4 text-white/50 text-sm italic font-serif text-center transition-opacity duration-500 max-w-xs h-10">
                {loadingMessages[messageIndex]}
            </p>
            {modelName && (
                <div className="mt-8 text-[10px] text-white/30 font-bold tracking-widest uppercase bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    Processor: {modelName}
                </div>
            )}
        </div>
    );
};

export default LoadingIndicator;
