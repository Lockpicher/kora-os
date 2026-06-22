import { NextResponse } from "next/server"

export async function GET() {
  const appId = process.env.ML_APP_ID
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!appId || !redirectUri || appId === "your_ml_app_id") {
    // Si no está configurado, mandar un error amigable o redirigir de vuelta al dashboard con un mensaje de error
    return NextResponse.redirect(new URL("/integrations/mercadolibre?error=missing_config", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"))
  }

  // URL de Autorización para Mercado Libre Colombia (puedes ajustar el TLD si operas en otro país)
  const authUrl = `https://auth.mercadolibre.com.co/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`

  return NextResponse.redirect(authUrl)
}
