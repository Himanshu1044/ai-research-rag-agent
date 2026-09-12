export const searchWeb = async (query) => {
    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: "POST",
            headers: {
                "X-API-KEY": process.env.SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: query
            })
        });

        const data = await response.json();

        return data.organic.map((item) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
        }));

    } catch (error) {
        console.error("Web search failed:", error);
        throw error;
    }
};