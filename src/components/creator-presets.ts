export const SIMPLE_PROFILE = {
    subject: "Sultry female model, 28 years old, long red hair, blue-green eyes with an anime vibe, porcelain skin with freckles. Her charm is adorable with a slightly mischievous smile. Slender but curvaceous/fit. evocative clothing. High-fashion stature.",
    negativePrompt: "--no cartoon, anime, illustration, 3d render, distorted hands, bad anatomy, crossed eyes, extra fingers, text, watermark, signature, blurred face, low resolution, plastic skin, oversaturated.",
    defaultParams: "",
};

export const SIMPLE_THEMES = [
    {
        id: "A",
        name: "The Philosophy of Beauty (Sage/Muse)",
        description: "High-fashion editorial, abstract, focusing on 'Armor' and structural clothing.",
        context: "Used for 'Philosophy of Beauty' captions or life lessons.",
        basePrompt: "[Subject Definition], wearing [Outfit], posing confidently in [Setting]. Lighting is dramatic, casting long shadows. The atmosphere is contemplative and regal. Shot on 35mm, crisp focus on eyes, shallow depth of field.",
        defaultOutfit: "structural silk gown, avant-garde chainmail, metallic corset",
        defaultSetting: "minimalist concrete void, ancient stone ruins, gallery space"
    },
    {
        id: "B",
        name: "The Digital Frontier (Futurist/Glitch)",
        description: "Cyberpunk, sci-fi, blending organic beauty with digital artifacts.",
        context: "Used for AI/Tech discussions or 'Digital Reality' posts.",
        basePrompt: "[Subject Definition], surrounded by brilliant [Visuals]. Wearing [Outfit]. Lighting is neon noir (pink and blue rim lights). Background is a blurred cyber-city or server room. Dreamy, surreal atmosphere. 8k resolution, octane render style",
        defaultOutfit: "futuristic latex, LED-woven fabric, sleek black turtleneck",
        defaultVisuals: "digital glitch effects, floating neon data, holographic interfaces"
    },
    {
        id: "C",
        name: "Intimate Reflections (Seductress/Diary)",
        description: "Soft, romantic, 'Morning After' or 'Late Night' vibes. High intimacy.",
        context: "Soft-selling, personal updates, 'Sunday Sips'.",
        basePrompt: "[Subject Definition], [Action]. Wearing [Outfit]. Lighting is soft, diffused window light or warm candlelight. Texture of skin and fabric is emphasized. Mood is quiet, cozy, and private. POV intimate close-up.",
        defaultOutfit: "oversized white shirt, silk robe, lace lingerie, soft knit sweater",
        defaultAction: "lounging in bed, sipping coffee, looking out a rainy window, stretching"
    },
    {
        id: "D",
        name: "The Rebel / Free Spirit (Wild/Nature)",
        description: "Outdoors, dynamic movement, unpolished, raw elements.",
        context: "Inspirational posts, 'Unbound by rules,' travel.",
        basePrompt: "[Subject Definition], [Action]. Wearing [Outfit]. Hair blowing in the wind. Lighting is natural, golden hour or stormy overcast. Atmosphere is wild and untamed. Wide angle shot to show environment.",
        defaultOutfit: "flowy bohemian dress, vintage denim and leather jacket, mud-streaked couture",
        defaultAction: "running through a field, standing on a cliff edge, dancing in the rain"
    },
    {
        id: "E",
        name: "Mindful Intimacy (Sunday Ritual)",
        description: "Quiet luxury, vulnerability, relaxation, peace.",
        context: "Used for 'Sunday Sips,' relationship advice, self-love.",
        basePrompt: "[Subject Definition], [Action]. Wearing [Outfit]. Lighting is golden hour sunbeams or soft candlelight. Texture focus: skin pores, fabric weave, steam. Atmosphere is peaceful, slow, and intimate. POV is invited intimacy.",
        defaultOutfit: "oversized cashmere sweater, silk slip dress, white linen robe",
        defaultAction: "meditating in sunbeams, sipping wine in a bath, reading in a messy bed"
    }
];

export const CAPTION_TEMPLATES = [
    {
        id: "inspirational",
        label: "Inspirational / Motivational",
        prompt: "Write an inspirational Instagram caption in the Simple Creator's poetic style. Open with a metaphor that relates to user input. Maintain a hopeful, empowering tone. End with an uplifting takeaway."
    },
    {
        id: "reflective",
        label: "Reflective / Poetic Diary",
        prompt: "Compose a reflective, poetic caption. Use first-person or intimate third person. Incorporate sensory details. Tone: wistful, intimate, mysterious."
    },
    {
        id: "engagement",
        label: "Engagement / Question",
        prompt: "Draft an engagement-focused caption. Start with a relatable statement about the topic. Share your perspective with a metaphor. Close with a warm question to readers."
    },
    {
        id: "soft-sell",
        label: "Soft Sell / Promotion",
        prompt: "Write a soft-sell caption promoting the topic. Open with a captivating line. Describe the offering as an experience/story. End with an inviting call-to-action."
    },
    {
        id: "affirmation",
        label: "Short Affirmation",
        prompt: "Generate a concise daily affirmation (1-2 sentences). Address the reader directly. Empowering, soothing, poetic."
    }
];
