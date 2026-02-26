import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.VITE_FAL_KEY });

async function run() {
    try {
        const result = await fal.subscribe("fal-ai/bytedance/seedream/v5/lite/text-to-image", {
            input: {
                prompt: "A beautiful cat",
                image_size: "auto_4K"
            }
        });
        console.log("Success t2i 4K:", result.data);
    } catch(e) { console.error("Error t2i 4K:", e.message || e); }
    try {
        const result = await fal.subscribe("fal-ai/bytedance/seedream/v5/lite/text-to-image", {
            input: {
                prompt: "A beautiful cat",
                image_size: "auto_2K"
            }
        });
        console.log("Success t2i 2K:", result.data);
    } catch(e) { console.error("Error t2i 2K:", e.message || e); }
    
    // Testing Edit
    try {
        const result2 = await fal.subscribe("fal-ai/bytedance/seedream/v5/lite/edit", {
            input: {
                prompt: "A magical scene",
                image_urls: ["https://v3b.fal.media/files/b/0a8f9936/KOsb_qPB_W0ZJ0Ee2OsnU_586e2892841d46f09049ee7199b303d3.png"],
                image_size: "auto_4K"
            }
        });
        console.log("Success Edit:", result2.data);
    } catch(e) { console.error("Error Edit:", e.message || e); }
}

run();
