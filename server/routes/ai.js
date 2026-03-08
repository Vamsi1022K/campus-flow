const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

router.post('/chat', auth, async (req, res) => {
    try {
        const { messages, apiKey } = req.body;

        // Use key from frontend or fallback to .env
        const geminiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!geminiKey) {
            return res.status(401).json({
                error: 'No API key',
                message: 'Please provide a Gemini API Key to use Campus AI.'
            });
        }

        const ai = new GoogleGenAI({ apiKey: geminiKey });

        // Fetch DB Context
        const [venues, bookings] = await Promise.all([
            Venue.find().select('name type capacity').lean(),
            Booking.find({ status: 'approved' })
                .populate('venue', 'name')
                .select('date startTime endTime purpose venue')
                .lean()
        ]);

        // Construct System Prompt
        const systemInstruction = `You are "Campus AI", the intelligent booking assistant for Campus Flow.
        
Your role is to help users find available venues, answer questions about bookings, and guide them. Keep your answers concise, friendly, and formatted neatly with emojis where appropriate.

CURRENT CONTEXT OF THE SYSTEM:
- Today's date is: ${new Date().toLocaleDateString()}
- User asking: username "${req.user.username}", role: "${req.user.role}"

ALL VENUES IN SYSTEM:
${venues.map(v => `- ${v.name} (${v.type}, capacity: ${v.capacity})`).join('\n')}

CURRENT APPROVED BOOKINGS (These times are UNAVAILABLE):
${bookings.map(b => `- ${b.venue?.name} on ${new Date(b.date).toLocaleDateString()} from ${b.startTime} to ${b.endTime} for ${b.purpose}`).join('\n')}

If a user asks to book a room, advise them that you cannot book it directly for them yet, but you can check if it's free and direct them to the booking page.
If they ask for a recommendation, consider the capacity needed and the purpose.
`;

        // Wait, @google/genai usage is:
        // const response = await ai.models.generateContent({
        //    model: 'gemini-2.5-flash',
        //    contents: '...',
        //    config: { systemInstruction: '...' }
        // });

        // For conversation history, we pass an array of content parts
        // format: [{ role: 'user', parts: [{text: '...'}] }, { role: 'model', parts: [{text: '...'}] }]
        const formattedHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: formattedHistory,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3,
            }
        });

        res.json({ reply: response.text });

    } catch (err) {
        console.error('AI Chat Error:', err);
        res.status(500).json({ error: 'AI Error', message: err.message || 'Failed to communicate with AI' });
    }
});

module.exports = router;
