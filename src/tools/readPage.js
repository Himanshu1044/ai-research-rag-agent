import * as cheerio from "cheerio";

export const readPage = async (url) => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch page: ${response.status} ${response.statusText}`
            );
        }

        const html = await response.text();

        const $ = cheerio.load(html);

        $("script, style, noscript").remove();

        const title = $("title").text().trim();

        const content = $("body")
            .text()
            .replace(/\s+/g, " ")
            .trim();

        return {
            title,
            url,
            content
        };

    } catch (error) {
        console.error("Failed to read page:", error);
        throw error;
    }
};