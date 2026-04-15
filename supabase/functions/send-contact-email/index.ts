import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    try {
        const { name, email, message } = await req.json();

        // Basic validation
        if (!name || !email || !message) {
            return new Response(
                JSON.stringify({ error: 'Preencha todos os campos.' }),
                { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(
                JSON.stringify({ error: 'E-mail inválido.' }),
                { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            );
        }

        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY não configurada.');
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'JB.Research <onboarding@resend.dev>',
                to: ['joaoppob@gmail.com'],
                reply_to: email,
                subject: `Nova mensagem de ${name} — JB.Research`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #1a1a1a; color: #f8f8ff; border-radius: 8px;">
                        <h2 style="color: #B6FF50; margin-bottom: 8px;">Nova mensagem pelo site</h2>
                        <p style="color: rgba(255,255,255,0.5); margin-bottom: 32px; font-size: 14px;">JB.Research — Formulário de contato</p>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); width: 80px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Nome</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #f8f8ff; font-weight: 600;">${name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">E-mail</td>
                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #B6FF50;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 16px 0; vertical-align: top; color: rgba(255,255,255,0.6); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Mensagem</td>
                                <td style="padding: 16px 0; color: #f8f8ff; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 32px; font-size: 12px; color: rgba(255,255,255,0.3);">
                            Responda diretamente a este e-mail — o reply-to está configurado para ${email}
                        </p>
                    </div>
                `,
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Resend API error: ${res.status} — ${errorBody}`);
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({ error: 'Erro interno ao enviar o e-mail. Tente novamente.' }),
            { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
    }
});
