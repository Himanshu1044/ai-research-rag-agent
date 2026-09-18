import {
    createDocument,
    getDocumentsByUser,
    getDocumentById,
    updateDocumentStatus
} from '../services/documentService.js';

import { chunkText } from '../utils/chunkText.js';

import {
    createDocumentChunks,
    updateChunkEmbedding
} from '../services/documentChunkService.js';

import { createEmbedding } from '../services/embeddingService.js';

export const postDocument = async (req, res) => {
    let document;

    try {
        const userId = req.user.userId;

        const { title, source, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                error: 'Title and content are required'
            });
        }

        document = await createDocument(
            userId,
            title,
            source,
            content
        );

        await updateDocumentStatus(
            document.id,
            'processing'
        );

        const chunks = chunkText(content);

        const documentChunks = await createDocumentChunks(
            document.id,
            chunks
        );

        for (const chunk of documentChunks) {
            const embedding = await createEmbedding(
                chunk.content
            );

            await updateChunkEmbedding(
                chunk.id,
                embedding
            );
        }

        const completedDocument = await updateDocumentStatus(
            document.id,
            'completed'
        );

        return res.status(201).json({
            message: 'Document created successfully',
            document: completedDocument,
            chunksCreated: documentChunks.length
        });

    } catch (err) {
        console.error(err);

        if (document) {
            try {
                await updateDocumentStatus(
                    document.id,
                    'failed'
                );
            } catch (statusError) {
                console.error(statusError);
            }
        }

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

export const getDocument = async (req, res) => {
    try {
        const userId = req.user.userId;
        const documentId = req.params.id;

        const document = await getDocumentById(
            documentId,
            userId
        );

        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }

        return res.status(200).json({
            document
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};