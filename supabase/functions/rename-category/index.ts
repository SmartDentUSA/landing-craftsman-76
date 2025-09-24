import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RenameRequest {
  type: 'category' | 'subcategory'
  oldName: string
  newName: string
  category?: string // Required when renaming subcategory
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, oldName, newName, category }: RenameRequest = await req.json()

    console.log('Rename request:', { type, oldName, newName, category })

    // Validate input
    if (!type || !oldName || !newName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, oldName, newName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'subcategory' && !category) {
      return new Response(
        JSON.stringify({ error: 'Category is required when renaming subcategory' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if new name already exists
    if (type === 'category') {
      const { data: existingCategories } = await supabaseClient
        .from('products_repository')
        .select('category')
        .eq('category', newName)
        .limit(1)

      if (existingCategories && existingCategories.length > 0) {
        return new Response(
          JSON.stringify({ error: `Category "${newName}" already exists` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Count affected products
      const { count: productsCount } = await supabaseClient
        .from('products_repository')
        .select('*', { count: 'exact', head: true })
        .eq('category', oldName)

      console.log(`Renaming category "${oldName}" to "${newName}" will affect ${productsCount} products`)

      // Update products_repository
      const { error: productsError } = await supabaseClient
        .from('products_repository')
        .update({ category: newName })
        .eq('category', oldName)

      if (productsError) {
        console.error('Error updating products:', productsError)
        throw productsError
      }

      // Update categories_config
      const { error: configError } = await supabaseClient
        .from('categories_config')
        .update({ category: newName })
        .eq('category', oldName)

      if (configError) {
        console.error('Error updating categories_config:', configError)
        throw configError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Category renamed successfully. ${productsCount} products updated.`,
          affectedProducts: productsCount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // Renaming subcategory
      const { data: existingSubcategories } = await supabaseClient
        .from('products_repository')
        .select('subcategory')
        .eq('category', category)
        .eq('subcategory', newName)
        .limit(1)

      if (existingSubcategories && existingSubcategories.length > 0) {
        return new Response(
          JSON.stringify({ error: `Subcategory "${newName}" already exists in category "${category}"` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Count affected products
      const { count: productsCount } = await supabaseClient
        .from('products_repository')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)
        .eq('subcategory', oldName)

      console.log(`Renaming subcategory "${oldName}" to "${newName}" in category "${category}" will affect ${productsCount} products`)

      // Update products_repository
      const { error: productsError } = await supabaseClient
        .from('products_repository')
        .update({ subcategory: newName })
        .eq('category', category)
        .eq('subcategory', oldName)

      if (productsError) {
        console.error('Error updating products:', productsError)
        throw productsError
      }

      // Update categories_config
      const { error: configError } = await supabaseClient
        .from('categories_config')
        .update({ subcategory: newName })
        .eq('category', category)
        .eq('subcategory', oldName)

      if (configError) {
        console.error('Error updating categories_config:', configError)
        throw configError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Subcategory renamed successfully. ${productsCount} products updated.`,
          affectedProducts: productsCount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in rename-category function:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})