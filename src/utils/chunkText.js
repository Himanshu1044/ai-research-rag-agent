export const chunkText = (
    content,
    chunkSize = 500,
    overlap = 50
) => {
    if (overlap >= chunkSize) {
        throw new Error("Overlap must be smaller than chunk size");
    }

    const words = content.trim().split(/\s+/);

    const chunks = [];

    let start = 0;

    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);

        const chunk = words
            .slice(start, end)
            .join(' ');

        chunks.push(chunk);

        if (end === words.length) {
            break;
        }

        start = end - overlap;
    }

    return chunks;
};