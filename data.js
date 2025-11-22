export const projects = [
    {
        title: 'go-utcp',
        description: 'The official Go implementation of the Universal Tool Calling Protocol, enabling standardized tool usage across AI agents.',
        tags: ['Go', 'AI', 'Protocol', 'Standard'],
        link: 'https://github.com/universal-tool-calling-protocol/go-utcp'
    },
    {
        title: 'Thunder',
        description: 'A minimalist Go backend framework designed to convert gRPC services into REST and GraphQL APIs effortlessly.',
        tags: ['Go', 'gRPC', 'GraphQL', 'Framework'],
        link: 'https://github.com/Protocol-Lattice/thunder'
    },
    {
        title: 'GoEventBus',
        description: 'A high-performance, lock-free event bus for Go, optimized for real-time pipelines and microservices architectures.',
        tags: ['Go', 'Concurrency', 'Event Bus', 'Performance'],
        link: 'https://github.com/Protocol-Lattice/GoEventBus'
    },
    {
        title: 'go-agent',
        description: 'A flexible and powerful AI agent framework for Go, built to leverage the Protocol Lattice ecosystem.',
        tags: ['Go', 'AI', 'Agents', 'Lattice'],
        link: 'https://github.com/Protocol-Lattice/go-agent'
    },
    {
        title: 'lattice-code',
        description: 'AI agents for software creation, offering tools for high-level design, feature implementation, and code analysis.',
        tags: ['AI', 'Agents', 'Software Engineering', 'Lattice'],
        link: 'https://github.com/Protocol-Lattice/lattice-code'
    },
    {
        title: 'memory-bank-mcp',
        description: 'A robust memory bank implementation for the Model Context Protocol (MCP), built in Go.',
        tags: ['Go', 'MCP', 'Memory', 'AI'],
        link: 'https://github.com/Protocol-Lattice/memory-bank-mcp'
    },
    {
        title: 'grpc-graphql-gateway',
        description: 'A protoc plugin that automatically generates GraphQL execution code from Protocol Buffers definitions.',
        tags: ['Go', 'Protobuf', 'GraphQL', 'Code Gen'],
        link: 'https://github.com/Raezil/grpc-graphql-gateway'
    },
    {
        title: 'vibe',
        description: 'An advanced coding tool leveraging Google Gemini to support protobuf gRPC gateway files and Prisma schemas.',
        tags: ['AI', 'Gemini', 'Go', 'Prisma'],
        link: 'https://github.com/Raezil/vibe'

    }
];

export const organizations = [
    {
        name: 'Universal Tool Calling Protocol',
        description: 'Member of the organization defining the open standard for AI tool interactions and discovery.',
        icon: 'https://github.com/universal-tool-calling-protocol.png',
        link: 'https://github.com/universal-tool-calling-protocol'
    },
    {
        name: 'Protocol Lattice',
        description: 'Developing open standards and tools for AI interaction, memory, and tooling.',
        icon: 'https://github.com/Protocol-Lattice.png',
        link: 'https://github.com/Protocol-Lattice'
    }
];

export const blogPosts = [
    {
        id: 'implementing-codemode-go-utcp',
        title: 'Implementing CodeMode in go-utcp: Bridging LLMs and Tool Orchestration',
        date: '2025-11-20',
        readTime: '12 min read',
        tags: ['Go', 'AI', 'UTCP', 'LLM', 'Architecture'],
        excerpt: 'A deep dive into building CodeMode UTCP - a system that enables LLMs to orchestrate Universal Tool Calling Protocol tools by generating and executing Go-like code snippets in a sandboxed environment.',
        link: '/blog/implementing-codemode-go-utcp.html'
    },
    {
        id: 'agents-as-utcp-tools',
        title: 'Agents as UTCP Tools: Unlocking Powerful Workflows with CodeMode',
        date: '2025-11-22',
        readTime: '10 min read',
        tags: ['Agents', 'UTCP', 'CodeMode', 'Go', 'Multi-Agent'],
        excerpt: 'Discover how exposing autonomous agents as UTCP tools enables complex, multi-agent workflows orchestrated by CodeMode, transforming how we build AI systems.',
        link: '/blog/agents-as-utcp-tools.html'
    }
];
