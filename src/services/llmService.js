import '../config/env.js';

import { CohereClientV2 } from 'cohere-ai';
import { searchWeb } from '../tools/searchWeb.js';
import { readPage } from '../tools/readPage.js';

const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY
});

const toolFunctions = {
    searchWeb: (args) => searchWeb(args.query),
    readPage: (args) => readPage(args.url),
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
    }
];

export const generateText = async (prompt) => {

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
`
        },
        {
            role: 'user',
            content: prompt
        }
    ];

    const sources = [];

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
                sources
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
            result = await toolFunction(toolArguments);

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

        messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: JSON.stringify(result)
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
        sources
    };
};