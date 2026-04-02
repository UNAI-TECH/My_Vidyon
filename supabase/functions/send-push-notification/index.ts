import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64url(str: string | Uint8Array): string {
    let base64: string
    if (typeof str === 'string') {
        base64 = btoa(str)
    } else {
        base64 = btoa(String.fromCharCode(...str))
    }
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

// JWT generation for Firebase
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600

    const header = {
        alg: 'RS256',
        typ: 'JWT',
    }

    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: exp,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }

    const encoder = new TextEncoder()

    // Import private key
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToDer(serviceAccount.private_key),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    )

    // Create JWT
    const headerB64 = base64url(JSON.stringify(header))
    const payloadB64 = base64url(JSON.stringify(payload))
    const signatureInput = `${headerB64}.${payloadB64}`

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        encoder.encode(signatureInput)
    )

    const signatureB64 = base64url(new Uint8Array(signature))
    const jwt = `${signatureInput}.${signatureB64}`

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get Firebase access token:', JSON.stringify(errorData));
        throw new Error(`Firebase token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json()
    return data.access_token
}

function pemToDer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\\n/g, '') // Handle literal \n strings
        .replace(/\s/g, '')  // Handle actual whitespace

    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get Firebase Service Account from environment
        const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
        }

        const serviceAccount = JSON.parse(serviceAccountJson)
        const payload = await req.json()
        
        let userId: string | undefined
        let title: string | undefined
        let body: string | undefined
        let action_url: string | undefined
        let notification_id: string | undefined
        let source = 'unknown'

        // Webhook Format (from Supabase Dashboard Database Webhook)
        if (payload.type === 'INSERT' && payload.record) {
            source = 'webhook'
            userId = payload.record.user_id
            title = payload.record.title
            body = payload.record.message
            action_url = payload.record.action_url
            notification_id = payload.record.id
        } else {
            // Direct Post Format (from SQL trigger via pg_net)
            source = 'trigger'
            userId = payload.userId
            title = payload.title
            body = payload.body
            action_url = payload.data?.action_url
            notification_id = payload.data?.notification_id
        }

        console.log(`[Push] Invoked via: ${source}, notification_id: ${notification_id}, user: ${userId}`)

        const data = { action_url, notification_id }

        if (!userId || !title || !body) {
            console.error('[Push] Missing fields in payload', payload)
            return new Response(
                JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // ── IDEMPOTENCY CHECK ──
        // If we have a notification_id, check if it was already pushed.
        // This prevents double-sends if both a webhook AND a trigger fire.
        if (notification_id) {
            const { data: existing } = await supabase
                .from('notifications')
                .select('pushed_at')
                .eq('id', notification_id)
                .maybeSingle()

            if (existing?.pushed_at) {
                console.log(`[Push] SKIPPED — notification ${notification_id} already pushed at ${existing.pushed_at}`)
                return new Response(
                    JSON.stringify({ success: true, skipped: true, reason: 'already_pushed' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Mark as pushed NOW to prevent any concurrent invocation
            await supabase
                .from('notifications')
                .update({ pushed_at: new Date().toISOString() })
                .eq('id', notification_id)
        }

        // Get user's FCM tokens
        const { data: tokens, error: tokensError } = await supabase
            .from('user_push_tokens')
            .select('fcm_token, platform')
            .eq('user_id', userId)

        if (tokensError || !tokens || tokens.length === 0) {
            console.log(`[Push] No device tokens found for user ${userId}`)
            return new Response(
                JSON.stringify({ success: false, message: 'No device tokens found' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── DEDUPLICATE TOKENS ──
        // Even with DB constraints, guard against sending to the same FCM token twice
        const uniqueTokens = tokens.filter(
            (t: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.fcm_token === t.fcm_token) === i
        )

        console.log(`[Push] Sending to ${uniqueTokens.length} unique device(s) (${tokens.length} raw tokens)`)

        // Get Firebase access token
        const accessToken = await getFirebaseAccessToken(serviceAccount)

        // Send to each device using FCM V1 API
        const results = await Promise.allSettled(
            uniqueTokens.map(async (tokenRecord: { fcm_token: string, platform: string }) => {
                const fcmPayload = {
                    message: {
                        token: tokenRecord.fcm_token,
                        notification: {
                            title: title || 'My Vidyon Notification',
                            body: body || 'You have a new update. Open the app to view.',
                        },
                        data: {
                            ...(data || {}),
                            originalTitle: title,
                            originalBody: body,
                        },
                        android: {
                            priority: 'high' as const,
                            notification: {
                                channel_id: 'default',
                                sound: 'default',
                                visibility: 'public' as const,
                                sticky: false,
                                local_only: false,
                                default_vibrate_timings: true,
                                default_sound: true,
                            },
                        },
                    },
                }

                const response = await fetch(
                    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(fcmPayload),
                    }
                )

                const result = await response.json()

                console.log(`[Push] FCM result for ${tokenRecord.fcm_token.substring(0, 10)}...: ${response.status}`)

                // Remove invalid tokens
                if (response.status === 404 || result.error?.status === 'NOT_FOUND' || result.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
                    console.log('[Push] Removing invalid/unregistered token:', tokenRecord.fcm_token)
                    await supabase
                        .from('user_push_tokens')
                        .delete()
                        .eq('fcm_token', tokenRecord.fcm_token)
                }

                return {
                    token: tokenRecord.fcm_token,
                    success: response.ok,
                    error: response.ok ? null : result,
                }
            })
        )

        const successCount = results.filter((r: any) =>
            r.status === 'fulfilled' && r.value.success
        ).length

        console.log(`[Push] Done. Sent: ${successCount}/${results.length}`)

        return new Response(
            JSON.stringify({
                success: true,
                sent: successCount,
                failed: results.length - successCount,
                total: results.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[Push] Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
