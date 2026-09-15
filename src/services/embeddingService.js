import '../config/env.js';

import { CohereClientV2 } from 'cohere-ai';

const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY
});

export const createEmbedding = async (text) => {
    try {
        const response = await cohere.embed({
            model: 'embed-v4.0',
            inputType: 'search_document',
            texts: [text],
            embedding_types: ['float'],
            output_dimension: 1024
        });

        return response.embeddings.float[0];

    } catch (error) {
        console.error('Embedding generation failed:', error);
        throw error;
    }
};

export const createQueryEmbedding = async (text) => {
    try {
        const response = await cohere.embed({
            model: 'embed-v4.0',
            inputType: 'search_query',
            texts: [text],
            embedding_types: ['float'],
            output_dimension: 1024
        });

        return response.embeddings.float[0];

    } catch (error) {
        console.error('Query embedding generation failed:', error);
        throw error;
    }
};
