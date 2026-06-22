import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  if (error) {
    return NextResponse.redirect(new URL(`/integrations/mercadolibre?error=${error}`, siteUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/integrations/mercadolibre?error=missing_code`, siteUrl))
  }

  const appId = process.env.ML_APP_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!appId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/integrations/mercadolibre?error=missing_config", siteUrl))
  }

  try {
    // Intercambiar el authorization_code por un token real
    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error("ML Token Error:", tokenData)
      return NextResponse.redirect(new URL("/integrations/mercadolibre?error=token_exchange_failed", siteUrl))
    }

    const { access_token, refresh_token, expires_in, user_id } = tokenData

    // Obtener la fecha de expiración
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    const supabase = await createClient()

    // 1. Obtener el ID del canal "Mercado Libre"
    const { data: channelData, error: channelError } = await supabase
      .from("sales_channels")
      .select("id")
      .eq("code", "ML")
      .single()

    if (channelError || !channelData) {
      console.error("No se encontró el canal ML en la BD:", channelError)
      return NextResponse.redirect(new URL("/integrations/mercadolibre?error=channel_not_found", siteUrl))
    }

    const channelId = channelData.id

    // 2. Buscar si ya existe una conexión para este user_id
    const { data: existingConnection } = await supabase
      .from("channel_connections")
      .select("id")
      .eq("channel_id", channelId)
      .eq("external_user_id", user_id.toString())
      .single()

    if (existingConnection) {
      // Actualizar token
      await supabase
        .from("channel_connections")
        .update({
          access_token,
          refresh_token,
          expires_at: expiresAt,
          active: true,
          updated_at: new Date().toISOString() // Asumiendo que tengamos updated_at
        })
        .eq("id", existingConnection.id)
    } else {
      // Crear nueva conexión
      await supabase
        .from("channel_connections")
        .insert({
          channel_id: channelId,
          account_name: `Cuenta ML ${user_id}`,
          external_user_id: user_id.toString(),
          access_token,
          refresh_token,
          expires_at: expiresAt,
          active: true
        })
    }

    return NextResponse.redirect(new URL("/integrations/mercadolibre?success=connected", siteUrl))

  } catch (err) {
    console.error("Exception during ML OAuth callback:", err)
    return NextResponse.redirect(new URL("/integrations/mercadolibre?error=server_error", siteUrl))
  }
}
