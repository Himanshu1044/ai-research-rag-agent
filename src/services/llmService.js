import '../config/env.js';

import { CohereClientV2 } from 'cohere-ai';
import { searchWeb } from '../tools/searchWeb.js';
import { readPage } from '../tools/readPage.js';
import { retrieveKnowledge } from './retrievalService.js';
import { saveMemory } from '../tools/saveMemory.js';
import { retrieveMemory } from '../tools/retrieveMemory.js';

const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY
});

const toolFunctions = {
    searchWeb: (args) => searchWeb(args.query),
    readPage: (args) => readPage(args.url),
    retrieveKnowledge: (args, userId) =>
        retrieveKnowledge(userId, args.query, args.limit),
    saveMemory: (args, userId) =>
        saveMemory(userId, args.content),
    retrieveMemory: (args, userId) =>
        retrieveMemory(userId),
};

const tools = [
    {
        type: 'function',
        function: {
            name: 'searchWeb',
            description: 'Search the web for information related to a research question.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to use on the web.'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'readPage',
            description: 'Read and extract the text content from a webpage.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL of the webpage to read.'
                    }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'retrieveKnowledge',
            description: `Search the user's private knowledge base for information relevant to the research question.`,
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: `The question or topic to search for in the user’s knowledge base.`
                    },
                    limit: {
                        type: 'integer',
                        description: 'Maximum number of relevant chunks to retrieve.',
                        minimum: 1,
                        maximum: 10
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'saveMemory',
            description: 'Save useful information about the user that may be relevant in future conversations.',
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'The information about the user that should be remembered.'
                    }
                },
                required: ['content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'retrieveMemory',
            description: 'Retrieve information previously saved about the user.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    }
];

export const generateText = async (prompt, userId) => {

    const currentDate = new Date().toISOString().split('T')[0];

    const messages = [
        {
            role: 'system',
            content: `
You are a research agent.

Current date: ${currentDate}

Your responsibilities:
- Understand the user's research question.
- Use searchWeb to find relevant information.
- Use readPage to inspect useful sources.
- For latest, current, or recent questions, prioritize recent information.
- Do not invent a year when constructing search queries.
- If the collected information is insufficient, perform additional research.
- Base the final answer on the information gathered from sources.
- Do not use tools when they are unnecessary.
- Use retrieveKnowledge when information from the user's private knowledge base may help answer the question.
- Use searchWeb when current or external web information is needed.
- You may use both when appropriate.
- Never assume information exists in the user's knowledge base; use the tool to check when relevant.
- Use retrieveMemory when previous information about the user may help answer the question.
- Use saveMemory when the user provides useful information that should be remembered for future research.
`
        },
        {
            role: 'user',
            content: prompt
        }
    ];

    const sources = [];
    const knowledge = [];

    let toolCallCount = 0;
    const maxToolCalls = 5;

    while (toolCallCount < maxToolCalls) {

        const response = await cohere.chat({
            model: 'command-a-plus-05-2026',
            messages,
            tools
        });

        const toolCall = response.message.toolCalls?.[0];

        if (!toolCall) {
            const textContent = response.message.content.find(
                (item) => item.type === 'text'
            );

            return {
                answer: textContent?.text,
                sources,
                knowledge
            };
        }

        toolCallCount++;

        const toolName = toolCall.function.name;

        const toolArguments = JSON.parse(
            toolCall.function.arguments
        );

        console.log('Tool:', toolName);
        console.log('Arguments:', toolArguments);

        const toolFunction = toolFunctions[toolName];

        if (!toolFunction) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        let result;

        try {
            if (
                toolName === 'retrieveKnowledge' ||
                toolName === 'saveMemory' ||
                toolName === 'retrieveMemory'
            ) {
                result = await toolFunction(toolArguments, userId);

                if (toolName === 'retrieveKnowledge') {
                    knowledge.push(...result);
                }
            } else {
                result = await toolFunction(toolArguments);
            }

            if (toolName === 'readPage') {
                sources.push({
                    title: result.title,
                    url: result.url,
                    content: result.content
                });
            }

        } catch (error) {
            result = {
                error: true,
                message: error.message
            };
        }

        messages.push({
            role: 'assistant',
            toolCalls: response.message.toolCalls
        });

        const toolResults = Array.isArray(result)
            ? result
            : [result];

        // Cohere's v2 API rejects a tool message whose content array is
        // empty (e.g. retrieveKnowledge on an empty knowledge base, or
        // retrieveMemory before anything's been saved). Without this
        // fallback, `content: []` reaches the API and comes back as a
        // confusing 400 about the output's "id" field — the id logic
        // below is fine, it's just never reached with nothing to map.
        const toolContent = toolResults.length > 0
            ? toolResults.map((item) => ({
                type: 'document',
                document: {
                    id: String(item.id ?? `${toolCall.id}`),
                    data: item
                }
            }))
            : [{
                type: 'document',
                document: {
                    id: String(toolCall.id),
                    data: { message: 'No results found.' }
                }
            }];

        messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: toolContent
        });
    }

    const finalResponse = await cohere.chat({
        model: 'command-a-plus-05-2026',
        messages: [
            ...messages,
            {
                role: 'user',
                content: 'You have reached the maximum number of tool calls. Do not use any more tools. Based only on the information collected so far, provide the best possible answer to the original question.'
            }
        ]
    });

    const textContent = finalResponse.message.content.find(
        (item) => item.type === 'text'
    );

    return {
        answer: textContent?.text,
        sources,
        knowledge
    };
};