import type { NextRequest } from 'next/server';
import { fetch } from 'next/dist/compiled/@edge-runtime/primitives';

export const dynamic = 'force-dynamic';

// Build a prompt instructing the LLM to choose best candidate and output JSON only.
function buildPrompt(currentUser: any, candidates: any[]) {
  const userDesc = JSON.stringify(simplifyUser(currentUser));
  const candLines = candidates.map(c => JSON.stringify({ id: c.user.id, score: c.score, profile: simplifyUser(c.user) }));
  return `You are an AI tennis partner match assistant.
Given the CURRENT_USER and a list of CANDIDATES (each with id, algorithmic score, and profile attributes), pick the single best partner for CURRENT_USER.
Return ONLY valid JSON of the shape: {"user_id": <number>, "reason": "short explanation referencing key attributes"}.
Do not include markdown or commentary outside JSON.

CURRENT_USER: ${userDesc}
CANDIDATES:
${candLines.join('\n')}
Rules:
- Prefer similar skill_level (difference <=1), overlapping court/match preferences, shared play_intentions.
- Higher algorithmic score is a useful guide but can be overridden if another candidate has clearly better holistic compatibility.
- Keep reason concise (<220 chars), highlight 2-3 strongest matching points.
Output JSON now:`;
}

function simplifyUser(u: any) {
  const p = u.profile || {};
  return {
    id: u.id,
    username: u.username,
    location: p.location,
    skill_level: p.skill_level,
    years_playing: p.years_playing,
    dominant_hand: p.dominant_hand,
    backhand_type: p.backhand_type,
    preferred_court_types: p.preferred_court_types || [],
    preferred_match_types: p.preferred_match_types || [],
    play_intentions: p.play_intentions || [],
    preferred_languages: p.preferred_languages || [],
  };
}

async function getProfile(token: string) {
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/profile/', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Backend Unauthorized');
    throw new Error('Failed to load current user profile');
  }
  return await res.json();
}

async function getCandidates(token: string, exclude: number[], limit: number) {
  const params = new URLSearchParams();
  if (exclude.length) params.set('exclude', exclude.join(','));
  params.set('limit', String(limit));
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const url = `${base}/match/candidates/?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Backend Unauthorized');
    throw new Error('Failed to load candidates');
  }
  const json = await res.json();
  return json.candidates || [];
}

function extractJson(text: string): { user_id: number; reason: string } | null {
  // Find first JSON object
  const match = text.match(/\{[^]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (typeof obj.user_id === 'number' && typeof obj.reason === 'string') return obj;
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const exclude: number[] = Array.isArray(body.exclude) ? body.exclude : [];
    const limit = typeof body.limit === 'number' ? body.limit : 8;

    // Auth: read bearer from cookies (client fetch will forward automatically) or headers
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const currentUser = await getProfile(token);
    const candidates = await getCandidates(token, exclude, limit);
    if (!candidates.length) {
      return new Response(JSON.stringify({ error: 'No candidates available' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const prompt = buildPrompt(currentUser, candidates);

    const requestedModel = body.model || 'gpt-4o';
    
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    let apiKey = process.env.TENNISWEB_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    let modelId = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // OpenRouter Configuration
    if (requestedModel !== 'gpt-4o') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = process.env.OPENROUTER_API_KEY;
      
      // Since you have credits, we use the standard (paid) versions for better reliability and higher rate limits.
      // The ':free' endpoints are often congested and have strict daily limits (e.g. 50 req/day).
      const modelMap: Record<string, string> = {
        'grok': 'x-ai/grok-4-fast',
        'llama': 'meta-llama/llama-3.3-70b-instruct',
        'gemini': 'google/gemini-2.0-flash-001',
        'qwen': 'qwen/qwen-2.5-72b-instruct', 
      };
      modelId = modelMap[requestedModel] || requestedModel;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Missing API key for ${requestedModel}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(requestedModel !== 'gpt-4o' ? { 'HTTP-Referer': 'https://tennisweb.app', 'X-Title': 'TennisWeb' } : {}),
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: 'You are a strict JSON-emitting tennis partner match assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return new Response(JSON.stringify({ error: 'LLM request failed', detail: errTxt }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content || '';
    const parsed = extractJson(raw);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'LLM output parse failed', raw }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const picked = candidates.find((c: any) => c.user.id === parsed.user_id);
    if (!picked) {
      return new Response(JSON.stringify({ error: 'Chosen user not in candidate list', parsed, candidateIds: candidates.map((c: any) => c.user.id) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const result = {
      user: picked.user,
      score: picked.score,
      reason: parsed.reason,
      mode: 'ai' as const,
      model: modelId,
    };
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Route Error:', e);
    if (e.message === 'Backend Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}