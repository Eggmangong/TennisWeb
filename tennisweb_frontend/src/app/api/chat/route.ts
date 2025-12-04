// Chat API: proxies to OpenAI (or OpenRouter) and returns a single reply string
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // allow runtime env access

// Optional: choose provider by env. Default to OpenAI Chat Completions
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body?.messages || []) as { role: 'user' | 'assistant' | 'system'; content: string }[];

    // Tennis-focused system prompt to keep answers scoped and safe
    const systemPrompt = {
      role: 'system' as const,
      content:
        'You are a friendly, concise AI tennis assistant. Answer only tennis-related questions: rules, strategy, drills, technique, fitness, equipment, history, and etiquette. If asked for medical, legal, or unrelated topics, politely decline and redirect to tennis topics. Keep answers clear and practical.',
    };

    const finalMessages = [systemPrompt, ...messages].slice(-16);

    // Prefer app-specific var to avoid collisions with any globally-set OPENAI_API_KEY
    const apiKey =
      process.env.TENNISWEB_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing OPENAI_API_KEY (or OPENROUTER_API_KEY) on server.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auto-detect provider by key prefix as a safety net
    // - OpenAI project keys typically start with 'sk-proj-' or 'sk-'
    // - OpenRouter keys typically start with 'sk-or-'
    let useOpenRouter = Boolean(process.env.OPENROUTER_API_KEY) && !process.env.OPENAI_API_KEY;
    if (apiKey.startsWith('sk-or-')) useOpenRouter = true; // force OpenRouter endpoint

    const url = useOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  if (useOpenRouter) headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create a streaming response that forwards tokens as they arrive
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: MODEL,
              messages: finalMessages,
              temperature: 0.3,
              max_tokens: 700,
              stream: true,
            }),
          });

          if (!resp.ok || !resp.body) {
            const text = await resp.text().catch(() => '');
            controller.enqueue(encoder.encode(`Error: ${text || 'LLM request failed'}`));
            controller.close();
            return;
          }

          const reader = resp.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffered = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffered += decoder.decode(value, { stream: true });

            // OpenAI streams Server-Sent Events lines starting with "data:"
            const lines = buffered.split('\n');
            buffered = lines.pop() || '';
            for (const line of lines) {
              const s = line.trim();
              if (!s || !s.startsWith('data:')) continue;
              const data = s.slice(5).trim();
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const token = json?.choices?.[0]?.delta?.content
                  ?? json?.choices?.[0]?.message?.content
                  ?? '';
                if (token) controller.enqueue(encoder.encode(token));
              } catch {
                // ignore malformed lines
              }
            }
          }

          // flush any remainder (usually empty)
          if (buffered) controller.enqueue(encoder.encode(buffered));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`Error: ${err?.message || 'stream error'}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
