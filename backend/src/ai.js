// وحدة ذكاء مشتركة خفيفة (Gemini أساسي + إعادة محاولة + Groq احتياطي)
const { GoogleGenerativeAI } = require('@google/generative-ai');
let Groq; try { Groq = require('groq-sdk'); } catch { Groq = null; }
const logger = require('./logger');

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groqAI = (Groq && process.env.GROQ_API_KEY) ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const isTransient = (e) => {
  const m = (e && (e.message || '')) + '';
  return e?.status === 503 || e?.status === 500 ||
    /error fetching|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network|socket hang up|timeout|terminated|UNAVAILABLE/i.test(m);
};

function repairJson(s) {
  s = String(s).trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  const i = s.indexOf('{'); const j = s.lastIndexOf('}');
  if (i >= 0 && j > i) s = s.slice(i, j + 1);
  return s;
}
function parseJSON(text) {
  try { return JSON.parse(text); } catch {}
  try { return JSON.parse(repairJson(text)); } catch {}
  return {};
}

// توليد JSON
async function aiJSON(prompt, { temperature = 0.5, maxTokens = 4096, _attempt = 0 } = {}) {
  try {
    const model = geminiAI.getGenerativeModel({ model: MODEL, generationConfig: { maxOutputTokens: maxTokens, temperature, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } });
    const r = await model.generateContent(prompt + '\n\nأجب بـ JSON صارم فقط.');
    return parseJSON(r.response.text());
  } catch (e) {
    if (isTransient(e) && _attempt < 3) {
      await new Promise(r => setTimeout(r, 1200 * (_attempt + 1)));
      return aiJSON(prompt, { temperature, maxTokens, _attempt: _attempt + 1 });
    }
    if (groqAI) {
      try {
        const res = await groqAI.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt + '\n\nأجب بـ JSON صارم فقط.' }],
          response_format: { type: 'json_object' }, max_tokens: Math.min(maxTokens, 6000), temperature,
        });
        return JSON.parse(res.choices[0].message.content);
      } catch (g) { logger.warn('aiJSON groq fail: ' + g.message?.slice(0, 60)); }
    }
    throw e;
  }
}

// محادثة نصية مع سياق + صور اختيارية (Vision)
async function aiChatText(systemPrompt, history, message, imageParts = []) {
  const model = geminiAI.getGenerativeModel({ model: MODEL });
  try {
    if (imageParts.length) {
      const r = await model.generateContent([{ text: systemPrompt + '\n\n' + message }, ...imageParts.slice(0, 4)]);
      return r.response.text();
    }
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'تمام، أنا مساعدك جاهز.' }] },
        ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
      ],
    });
    const r = await chat.sendMessage(message);
    return r.response.text();
  } catch (e) {
    if (groqAI) {
      const res = await groqAI.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }],
        max_tokens: 1200,
      });
      return res.choices[0].message.content;
    }
    throw e;
  }
}

// توليد نص خام (بدون JSON) — أنسب للنصوص الطويلة كالأوصاف
async function aiText(prompt, { temperature = 0.7, maxTokens = 1500, _attempt = 0 } = {}) {
  try {
    const model = geminiAI.getGenerativeModel({ model: MODEL, generationConfig: { maxOutputTokens: maxTokens, temperature, thinkingConfig: { thinkingBudget: 0 } } });
    const r = await model.generateContent(prompt);
    return (r.response.text() || '').trim();
  } catch (e) {
    if (isTransient(e) && _attempt < 3) {
      await new Promise(r => setTimeout(r, 1200 * (_attempt + 1)));
      return aiText(prompt, { temperature, maxTokens, _attempt: _attempt + 1 });
    }
    if (groqAI) {
      try {
        const res = await groqAI.chat.completions.create({
          model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }],
          max_tokens: Math.min(maxTokens, 4000), temperature,
        });
        return (res.choices[0].message.content || '').trim();
      } catch (g) { /* ignore */ }
    }
    throw e;
  }
}

// توليد/تحسين صورة منتج عبر نموذج صور Gemini — يعيد {mimeType, data(base64)}
async function aiImage(prompt, inlineImage) {
  const modelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const model = geminiAI.getGenerativeModel({ model: modelName });
  const parts = [{ text: prompt }];
  if (inlineImage && inlineImage.data) parts.push({ inlineData: { mimeType: inlineImage.mimeType || 'image/jpeg', data: inlineImage.data } });
  const r = await model.generateContent(parts);
  const cand = r.response?.candidates?.[0];
  const imgPart = (cand?.content?.parts || []).find(p => p.inlineData && p.inlineData.data);
  if (!imgPart) throw new Error('no_image');
  return { mimeType: imgPart.inlineData.mimeType || 'image/png', data: imgPart.inlineData.data };
}

module.exports = { aiJSON, aiChatText, aiText, aiImage };
