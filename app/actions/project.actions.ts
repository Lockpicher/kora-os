"use server"

import { createClient } from '@/lib/supabase/server'
import { ProjectInsertSchema } from '@/src/modules/work/schema/project.schema'
import { z } from 'zod'

export async function createProjectAction(cmd: Record<string, unknown>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // MOCK USER
    const activeUser = user || { id: '00000000-0000-0000-0000-000000000001' }

    let orgMember = await supabase.from("organization_members").select("organization_id").eq("user_id", activeUser.id).single().then(res => res.data)
    
    if (!orgMember?.organization_id) {
      const defaultOrgId = '00000000-0000-0000-0000-000000000000'
      await supabase.from("organization_members").insert({
        organization_id: defaultOrgId, user_id: activeUser.id, role: 'owner'
      })
      orgMember = { organization_id: defaultOrgId }
    }

    const validatedData = ProjectInsertSchema.parse({
      ...cmd,
      organization_id: orgMember.organization_id
    })

    const { data: project, error } = await supabase.from('projects').insert(validatedData).select().single()
    if (error) throw new Error(error.message)

    return { success: true, data: project }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unknown error occurred" }
  }
}
