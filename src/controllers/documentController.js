import {
    createDocument,
    getDocumentsByUser
} from '../services/documentService.js';

import { chunkText } from '../utils/chunkText.js';

import {
    createDocumentChunks,
    updateChunkEmbedding
} from '../services/documentChunkService.js';

import { createEmbedding } from '../services/embeddingService.js';


export const postDocument = async (req, res) => {
    try {

        const userId = req.user.userId;

        const { title, source, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                error: 'Title and content are required'
            });
        }

        // 1. Create the document
        const document = await createDocument(
            userId,
            title,
            source,
            content
        );

        // 2. Split document into chunks
        const chunks = chunkText(content);

        // 3. Store chunks in database
        const documentChunks = await createDocumentChunks(
            document.id,
            chunks
        );

        // 4. Generate and store embeddings
        for (const chunk of documentChunks) {

            const embedding = await createEmbedding(
                chunk.content
            );

            await updateChunkEmbedding(
                chunk.id,
                embedding
            );
        }

        return res.status(201).json({
            message: 'Document created successfully',
            document,
            chunksCreated: documentChunks.length
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};


export const getDocuments = async (req, res) => {
    try {

        const userId = req.user.userId;

        const documents = await getDocumentsByUser(userId);

        return res.status(200).json({
            message: 'Documents retrieved successfully',
            documents
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};