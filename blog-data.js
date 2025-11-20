export const blogPosts = [
    {
        id: 'implementing-codemode-go-utcp',
        title: 'Implementing CodeMode in go-utcp: Bridging LLMs and Tool Orchestration',
        date: '2025-11-20',
        readTime: '12 min read',
        tags: ['Go', 'AI', 'UTCP', 'LLM', 'Architecture'],
        excerpt: 'A deep dive into building CodeMode UTCP - a system that enables LLMs to orchestrate Universal Tool Calling Protocol tools by generating and executing Go-like code snippets in a sandboxed environment.',
        content: `
# Implementing CodeMode in go-utcp: Bridging LLMs and Tool Orchestration

## Introduction

One of the most challenging problems in AI agent development is enabling Large Language Models (LLMs) to effectively orchestrate multiple tools in complex workflows. While LLMs excel at understanding intent and generating code, they struggle with sequential tool decision-making and maintaining state across multiple API calls.

**CodeMode UTCP** solves this by allowing LLMs to generate Go-like code snippets that chain tools together, handle outputs, and produce structured results—all validated and executed in a sandboxed environment using the [Yaegi Go interpreter](https://github.com/traefik/yaegi).

This article explores the architecture, implementation challenges, and design decisions behind CodeMode UTCP, part of the [go-utcp](https://github.com/universal-tool-calling-protocol/go-utcp) implementation.

---

## The Problem: Sequential vs. Compositional Tool Calling

Traditional LLM tool-calling approaches follow a sequential pattern:

1. LLM decides which tool to call
2. Tool executes and returns result
3. LLM receives result and decides next action
4. Repeat until task complete

This creates several problems:

- **High latency**: Multiple round-trips between LLM and tools
- **State management**: LLM must track intermediate results across turns
- **Error handling**: Difficult to implement robust retry logic
- **Composability**: Hard to express complex workflows like "search, filter, then summarize top 3"

CodeMode UTCP takes a different approach: **the LLM generates a complete workflow as executable code**, which runs to completion in one execution.

---

## Architecture Overview

CodeMode UTCP consists of two main components:

### 1. **Orchestrator** (\`orchestrator.go\`)
The LLM-driven decision pipeline that:
- Determines if tools are needed for a given query
- Selects appropriate tools from available UTCP tools
- Generates Go code snippets using only selected tools
- Validates generated code against strict rules

### 2. **Code Execution Engine** (\`codemode.go\`)
The sandboxed runtime that:
- Uses Yaegi Go interpreter for safe code execution
- Injects helper functions for UTCP tool access
- Normalizes and wraps user code into valid Go programs
- Enforces timeouts and captures stdout/stderr

---

## The Four-Step Pipeline

When \`CallTool()\` is invoked with a user prompt, the orchestrator executes four distinct steps:

### Step 1: Decide if Tools Are Needed

\`\`\`go
func (cm *CodeModeUTCP) decideIfToolsNeeded(
    ctx context.Context,
    query string,
    tools string,
) (bool, error) {
    prompt := fmt.Sprintf(\`
Decide if the following user query requires using ANY UTCP tools.

USER QUERY: %q
AVAILABLE UTCP TOOLS: %s

Respond ONLY in JSON: { "needs": true } or { "needs": false }
\`, query, tools)
    
    raw, err := cm.model.Generate(ctx, prompt)
    // ... parse JSON response
}
\`\`\`

This prevents unnecessary tool calls for simple queries that don't require external actions.

### Step 2: Select Appropriate Tools

\`\`\`go
func (cm *CodeModeUTCP) selectTools(
    ctx context.Context,
    query string,
    tools string,
) ([]string, error) {
    prompt := fmt.Sprintf(\`
Select ALL UTCP tools that match the user's intent.

Rules:
- Use ONLY names listed above
- NO modifications, NO guessing
- If multiple tools apply, include all
\`, query, tools)
    
    // Returns: ["math.add", "math.multiply"]
}
\`\`\`

The LLM identifies which tool names match the user's intent, ensuring only relevant tools are available during code generation.

### Step 3: Generate Go Snippet

This is where the magic happens. The LLM generates a Go code snippet following strict rules:

\`\`\`go
// Example generated code for: "Get sum of 5 and 7, then multiply by 3"

r1, err := codemode.CallTool("math.add", map[string]any{
    "a": 5,
    "b": 7,
})
if err != nil { return err }

var sum any
if m, ok := r1.(map[string]any); ok {
    sum = m["result"]
}

r2, err := codemode.CallTool("math.multiply", map[string]any{
    "a": sum,
    "b": 3,
})

__out = map[string]any{
    "sum": sum,
    "product": r2,
}
\`\`\`

**Key constraints enforced:**
- Use only selected tool names (no inventing tools)
- Use exact input/output schema keys from tool specs
- No package/import declarations
- Assign final result to \`__out\` variable
- Use provided helper functions only

### Step 4: Execute and Return

\`\`\`go
func (c *CodeModeUTCP) Execute(
    ctx context.Context,
    args CodeModeArgs,
) (CodeModeResult, error) {
    // Create interpreter with timeout
    ctx, cancel := context.WithTimeout(ctx, 
        time.Duration(args.Timeout)*time.Millisecond)
    defer cancel()
    
    i, stdout, stderr := newInterpreter()
    
    // Inject UTCP helpers
    injectHelpers(i, c.client)
    
    // Wrap and execute code
    wrapped := c.prepareWrappedProgram(args.Code)
    
    // Run in goroutine with panic recovery
    go func() {
        defer func() {
            if r := recover(); r != nil {
                done <- evalResult{err: fmt.Errorf("panic: %v", r)}
            }
        }()
        
        v, err := i.Eval(wrapped)
        done <- evalResult{val: v, err: err}
    }()
    
    // Wait for completion or timeout
    select {
    case <-ctx.Done():
        return CodeModeResult{}, fmt.Errorf("timeout")
    case res := <-done:
        return CodeModeResult{
            Value: res.val.Interface(),
            Stdout: stdout.String(),
            Stderr: stderr.String(),
        }, res.err
    }
}
\`\`\`

---

## Code Normalization: Making LLM Output Executable

LLMs don't always generate perfect Go code. CodeMode includes several normalization steps:

### 1. Package/Import Stripping

\`\`\`go
func stripPackageAndImports(code string) string {
    rePackage := regexp.MustCompile(\`(?m)^\\s*package\\s+\\w+\\s*$\`)
    code = rePackage.ReplaceAllString(code, "")
    
    reImportMulti := regexp.MustCompile(\`(?s)^\\s*import\\s*\\((.*?)\\)\\s*$\`)
    code = reImportMulti.ReplaceAllString(code, "")
    
    return code
}
\`\`\`

LLMs often include \`package main\` or \`import\` statements. We strip these since the wrapper adds them automatically.

### 2. Walrus Operator Conversion

\`\`\`go
func convertOutWalrus(code string) string {
    // Converts: __out := ... 
    // To:       __out = ...
    re := regexp.MustCompile(\`__out\\s*:=\`)
    return re.ReplaceAllString(code, "__out = ")
}
\`\`\`

The \`__out\` variable is pre-declared in the wrapper, so \`:=\` would cause a redeclaration error.

### 3. Bare Return Fixing

\`\`\`go
func fixBareReturn(code string) string {
    re := regexp.MustCompile(\`(?m)^\\s*return\\s*$\`)
    return re.ReplaceAllString(code, "return __out")
}
\`\`\`

Converts bare \`return\` statements to \`return __out\`.

### 4. JSON to Go Literal Conversion

\`\`\`go
func jsonToGoLiteral(s string) string {
    var v any
    if err := json.Unmarshal([]byte(s), &v); err != nil {
        return s
    }
    return toGoLiteral(v)
}

func toGoLiteral(v any) string {
    switch val := v.(type) {
    case map[string]any:
        parts := make([]string, 0, len(val))
        for k, v2 := range val {
            parts = append(parts, 
                fmt.Sprintf("%q: %s", k, toGoLiteral(v2)))
        }
        return fmt.Sprintf("map[string]any{%s,}", 
            strings.Join(parts, ", "))
    case []any:
        items := make([]string, len(val))
        for i := range val {
            items[i] = toGoLiteral(val[i])
        }
        return fmt.Sprintf("[]any{%s}", strings.Join(items, ", "))
    case string:
        return fmt.Sprintf("%q", val)
    // ... other cases
    }
}
\`\`\`

LLMs sometimes output JSON objects instead of Go map literals. This converts them automatically.

---

## Injecting UTCP Helpers

The sandboxed environment needs access to UTCP tools. We inject helper functions using Yaegi's reflection-based exports:

\`\`\`go
func injectHelpers(i *interp.Interpreter, client utcp.UtcpClientInterface) error {
    i.Use(stdlib.Symbols) // Load Go standard library
    
    exports := interp.Exports{
        "codemode_helpers/codemode_helpers": map[string]reflect.Value{
            "CallTool": reflect.ValueOf(func(name string, args map[string]any) (any, error) {
                return client.CallTool(context.Background(), name, args)
            }),
            
            "CallToolStream": reflect.ValueOf(func(name string, args map[string]any) (*codeModeStream, error) {
                stream, err := client.CallToolStream(context.Background(), name, args)
                if err != nil {
                    return nil, err
                }
                return &codeModeStream{next: stream.Next}, nil
            }),
            
            "SearchTools": reflect.ValueOf(func(query string, limit int) ([]tools.Tool, error) {
                return client.SearchTools(query, limit)
            }),
            
            "Sprintf": reflect.ValueOf(fmt.Sprintf),
            "Errorf": reflect.ValueOf(fmt.Errorf),
        },
    }
    
    return i.Use(exports)
}
\`\`\`

These functions are available in generated code as \`codemode.CallTool()\`, \`codemode.Sprintf()\`, etc.

---

## Handling Streaming Tools

Some UTCP tools return streaming results. CodeMode supports this with a special stream wrapper:

\`\`\`go
type codeModeStream struct {
    next func() (any, error)
}

func (s *codeModeStream) Next() (any, error) {
    return s.next()
}
\`\`\`

Generated code can use streaming tools like this:

\`\`\`go
stream, err := codemode.CallToolStream("api.fetch", map[string]any{
    "url": "https://example.com/data",
})
if err != nil { return err }

var items []any
for {
    chunk, err := stream.Next()
    if err != nil { break }
    items = append(items, chunk)
}

__out = items
\`\`\`

The orchestrator marks streaming code with \`"stream": true\` in the JSON response for proper handling.

---

## Tool Schema Rendering

To help the LLM generate correct code, we provide detailed tool specifications:

\`\`\`go
func renderUtcpToolsForPrompt(specs []tools.Tool) string {
    var sb strings.Builder
    
    for _, t := range specs {
        sb.WriteString(fmt.Sprintf("TOOL: %s\\n", t.Name))
        sb.WriteString(fmt.Sprintf("DESCRIPTION: %s\\n\\n", t.Description))
        
        // Input fields with types
        sb.WriteString("INPUT FIELDS (USE EXACTLY THESE KEYS):\\n")
        for key, raw := range t.Inputs.Properties {
            propType := extractType(raw)
            sb.WriteString(fmt.Sprintf("- %s: %s\\n", key, propType))
        }
        
        // Required fields
        if len(t.Inputs.Required) > 0 {
            sb.WriteString("\\nREQUIRED FIELDS:\\n")
            for _, r := range t.Inputs.Required {
                sb.WriteString(fmt.Sprintf("- %s\\n", r))
            }
        }
        
        // Full JSON schemas
        inBytes, _ := json.MarshalIndent(t.Inputs, "", "  ")
        sb.WriteString("FULL INPUT SCHEMA (JSON):\\n")
        sb.WriteString(string(inBytes))
        
        outBytes, _ := json.MarshalIndent(t.Outputs, "", "  ")
        sb.WriteString("\\nOUTPUT SCHEMA (EXACT SHAPE RETURNED):\\n")
        sb.WriteString(string(outBytes))
        
        sb.WriteString("\\n" + strings.Repeat("-", 60) + "\\n\\n")
    }
    
    return sb.String()
}
\`\`\`

This ensures the LLM has complete information about:
- Available input fields and their types
- Required vs. optional fields
- Exact output structure for chaining results

---

## Security and Safety

Running LLM-generated code requires careful sandboxing:

### 1. **Yaegi Interpreter**
- No access to filesystem or network (unless explicitly provided)
- No ability to spawn processes
- Runs in same process but isolated namespace

### 2. **Timeout Enforcement**
\`\`\`go
ctx, cancel := context.WithTimeout(ctx, 
    time.Duration(timeoutMs)*time.Millisecond)
defer cancel()
\`\`\`

Default 30s timeout prevents infinite loops.

### 3. **Panic Recovery**
\`\`\`go
defer func() {
    if r := recover(); r != nil {
        done <- evalResult{err: fmt.Errorf("panic: %v", r)}
    }
}()
\`\`\`

Interpreter panics are caught and returned as errors.

### 4. **Validation Rules**
\`\`\`go
func isValidSnippet(code string) bool {
    if strings.Contains(code, "map[value:") {
        return false // Invalid Go syntax
    }
    if !strings.Contains(code, "__out") {
        return false // Missing output assignment
    }
    return true
}
\`\`\`

Basic syntax validation before execution.

---

## Real-World Example

Let's walk through a complete example:

**User Query:** "Search for Python tutorials and summarize the top 3 results"

### Step 1: Decide Tools Needed
→ **Result:** \`{ "needs": true }\`

### Step 2: Select Tools
→ **Result:** \`{ "tools": ["search.web", "text.summarize"] }\`

### Step 3: Generate Code
\`\`\`go
// Search for tutorials
searchResult, err := codemode.CallTool("search.web", map[string]any{
    "query": "Python tutorials",
    "limit": 3,
})
if err != nil { return err }

var results []any
if m, ok := searchResult.(map[string]any); ok {
    if r, ok := m["results"].([]any); ok {
        results = r
    }
}

// Extract top 3 and summarize
var summaries []any
for i := 0; i < 3 && i < len(results); i++ {
    item := results[i]
    
    var text string
    if m, ok := item.(map[string]any); ok {
        if t, ok := m["content"].(string); ok {
            text = t
        }
    }
    
    summary, err := codemode.CallTool("text.summarize", map[string]any{
        "text": text,
        "max_length": 100,
    })
    if err != nil { continue }
    
    summaries = append(summaries, summary)
}

__out = map[string]any{
    "query": "Python tutorials",
    "summaries": summaries,
}
\`\`\`

### Step 4: Execute
The code runs in the Yaegi sandbox, calls the actual UTCP tools, and returns structured results—all in one execution.

---

## Performance Considerations

### Latency Breakdown
- **LLM calls:** 3 sequential calls (decide, select, generate) ≈ 2-5 seconds
- **Code execution:** Typically <100ms for simple workflows
- **Tool calls:** Depends on tool implementation

### Optimization Strategies
1. **Parallel LLM calls:** Decide + Select could run in parallel
2. **Caching:** Cache tool specs to reduce prompt size
3. **Streaming:** Stream code generation for faster perceived latency
4. **Compiled mode:** Pre-compile common patterns

---

## Limitations and Trade-offs

### Current Limitations
1. **Single-threaded execution:** Yaegi runs code sequentially
2. **No filesystem access:** Unless explicitly provided via helpers
3. **LLM quality dependency:** Bad code generation = runtime errors
4. **Debugging difficulty:** Stack traces from interpreted code can be cryptic

### Design Trade-offs
- **Safety vs. Flexibility:** Sandboxing limits what code can do
- **Simplicity vs. Power:** Go DSL is more constrained than Python
- **Latency vs. Reliability:** Multiple LLM calls increase latency but improve correctness

---

## Future Enhancements

### Short-term
- **Better error messages:** Map Yaegi errors to user-friendly explanations
- **Code validation:** Static analysis before execution
- **Retry logic:** Auto-retry failed tool calls with exponential backoff

### Long-term
- **Compiled mode:** Generate actual Go binaries for production workflows
- **Parallel execution:** Support concurrent tool calls via goroutines
- **Visual debugging:** Show execution flow and intermediate values
- **Learning system:** Learn from successful patterns to improve generation

---

## Conclusion

CodeMode UTCP demonstrates that **LLMs can be effective orchestrators** when given the right abstractions. By generating executable code instead of making sequential decisions, we achieve:

✅ **Lower latency** - One execution vs. multiple round-trips  
✅ **Better composability** - Express complex workflows naturally  
✅ **Robust error handling** - Standard Go error patterns  
✅ **Type safety** - Validated against tool schemas  
✅ **Debuggability** - Inspect generated code and execution logs  

The key insight is that **code is a better interface for tool orchestration than JSON-RPC**. LLMs already understand code structure, control flow, and error handling—we just need to provide the right runtime environment.

---

## Try It Yourself

CodeMode UTCP is part of the [go-utcp](https://github.com/universal-tool-calling-protocol/go-utcp) repository:

\`\`\`bash
git clone https://github.com/universal-tool-calling-protocol/go-utcp
cd go-utcp/src/plugins/codemode
go test -v
\`\`\`

Check out the [README](https://github.com/universal-tool-calling-protocol/go-utcp/tree/main/src/plugins/codemode) for more examples and API documentation.

---

## Acknowledgments

CodeMode UTCP builds on:
- [Yaegi](https://github.com/traefik/yaegi) - Go interpreter
- [UTCP](https://github.com/universal-tool-calling-protocol) - Universal Tool Calling Protocol

Special thanks to the UTCP community for feedback and contributions.

---

*Have questions or ideas? Reach out on [GitHub](https://github.com/universal-tool-calling-protocol/go-utcp/issues) or [email me](mailto:kmosc@protonmail.com).*
        `
    }
];
