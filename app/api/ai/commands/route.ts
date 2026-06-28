import { NextResponse } from 'next/server'
import { EntityResolverService } from '@/src/modules/core/services/entity-resolver.service'

const resolver = new EntityResolverService()

// Tipos de retorno esperados
export type CommandResponse = {
  intent: "create_task" | "create_project" | "unknown"
  confidence: number
  project?: string
  workflow?: string
  entity?: {
    type: string
    id: string
    name: string
  }
  title: string
  priority?: "baja" | "media" | "alta" | "urgente"
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // 1. Capa Determinística (Reglas Locales)
    const lowerPrompt = prompt.toLowerCase()
    const isCreateTask = lowerPrompt.includes("crear publicación") || lowerPrompt.includes("crear tarea")
    
    if (isCreateTask) {
      // Intentamos extraer entidad y proyecto heurísticamente
      let potentialEntityName = ""
      
      // Buscar algo que parezca el nombre del producto (ej: Turmalina Negra)
      // Heurística muy básica: palabras después de Mercado Libre o Publicación
      const match = prompt.match(/(?:mercado libre|publicación|producto)\s+(.+)/i)
      if (match && match[1]) {
        potentialEntityName = match[1].trim()
      } else {
        potentialEntityName = prompt
      }

      // Llamar al Entity Resolver
      const resolved = await resolver.resolve(potentialEntityName, ["product", "project"])
      const topEntity = resolved[0]

      if (topEntity && topEntity.confidence > 0.8) {
        // Logramos parseo determinístico
        const response: CommandResponse = {
          intent: "create_task",
          confidence: 0.98, // Alta confianza por coincidencia exacta
          title: prompt,
          priority: "media",
          entity: {
            type: topEntity.type,
            id: topEntity.id,
            name: topEntity.name
          }
        }
        return NextResponse.json(response)
      }
    }

    // 2. Capa LLM (Fallback a Gemini 2.5 Flash)
    // Cuando las reglas locales fallan o la confianza es baja, usamos IA
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      // Fallback sin IA
      return NextResponse.json({
        intent: "unknown",
        confidence: 0,
        title: prompt
      } as CommandResponse)
    }

    // Llamada real a Gemini usando REST API para mantenerlo simple y sin dependencias pesadas
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
    
    const systemInstruction = `
      Eres el cerebro de KORA OS.
      Tu único trabajo es convertir el texto del usuario en un JSON estructurado.
      NUNCA devuelvas texto libre, solo JSON.
      
      Esquema JSON requerido:
      {
        "intent": "create_task" | "create_project" | "unknown",
        "confidence": number, // 0.0 a 1.0
        "project": string, // Nombre del proyecto inferido
        "workflow": string, // Workflow inferido
        "entity": { "type": string, "id": string, "name": string } | null,
        "title": string, // Título limpio de la tarea/proyecto
        "priority": "baja" | "media" | "alta" | "urgente"
      }
    `

    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    })

    if (!aiRes.ok) {
      throw new Error("Fallo en la comunicación con Gemini")
    }

    const aiData = await aiRes.json()
    const jsonString = aiData.candidates[0].content.parts[0].text
    const parsedCommand: CommandResponse = JSON.parse(jsonString)
    
    // Si la IA detecta una entidad por nombre, podríamos validarla con el Resolver
    if (parsedCommand.entity && parsedCommand.entity.name) {
       const res = await resolver.resolve(parsedCommand.entity.name)
       if (res.length > 0) {
         parsedCommand.entity.id = res[0].id
         parsedCommand.entity.type = res[0].type
         // Aumentamos la confianza porque pudimos enlazarla a un ID real
         parsedCommand.confidence = Math.min(1.0, parsedCommand.confidence + 0.2)
       }
    }

    return NextResponse.json(parsedCommand)

  } catch (error) {
    console.error("AI Command Error:", error)
    return NextResponse.json({ error: "Failed to parse command" }, { status: 500 })
  }
}
