import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedData() {
  console.log('🤖 Setting up dummy AI training data...\n')

  // 1. Get all products
  const { data: products, error: prodErr } = await supabase.from('products').select('*')
  if (prodErr) {
    console.error('Failed to fetch products:', prodErr)
    return
  }

  if (products.length === 0) {
    console.log('⚠️ No products found. Please create some products first.')
    return
  }

  // 2. We need a default location for the move history. Let's get any location.
  const { data: locations, error: locErr } = await supabase.from('locations').select('id').limit(1)
  const locationId = locations?.[0]?.id || null

  if (!locationId) {
    console.log('⚠️ No locations found. You need at least one location.')
    return
  }

  console.log(`Found ${products.length} products. Generating 30 days of past sales history...\n`)

  const movesToInsert = []

  // Generate 30 days of data for each product
  for (const product of products) {
    // Randomize a base daily demand for this product (e.g. 5 to 25)
    const baseDemand = Math.floor(Math.random() * 20) + 5

    // Create 30 days of history
    for (let day = 30; day >= 1; day--) {
      // Fluctuate demand by +/- 30% day-to-day
      const fluctuation = 1 + (Math.random() * 0.6 - 0.3)
      const dailySales = Math.max(1, Math.round(baseDemand * fluctuation))

      // Create a date going backward ('day' days ago)
      const date = new Date()
      date.setDate(date.getDate() - day)

      movesToInsert.push({
        type: 'OUT',
        product_id: product.id,
        from_location_id: locationId, // OUT typically goes from a location to outside
        to_location_id: null,
        quantity: dailySales * -1, // convention: if it's out, sometimes it's negative in some systems. Your AI takes absolute value though! Let's do positive, some schemas restrict negative qty.
      })
    }
  }

  // 3. Fix quantity strictly to positive since the DB schema (quantity INTEGER NOT NULL) and AI `Math.abs(move.quantity)` handles it
  const finalMoves = movesToInsert.map(m => ({
    ...m,
    quantity: Math.abs(m.quantity)
  }))

  const { error: insErr } = await supabase.from('moves').insert(finalMoves)
  
  if (insErr) {
    console.error('❌ Failed to insert dummy data:', insErr)
  } else {
    console.log(`✅ Successfully injected ${finalMoves.length} 'OUT' sales records into the database.`)
    console.log('\n👉 Go to your browser and click "Refresh Analysis" on the AI Insights page. The AI will now have beautiful prediction data!')
  }
}

seedData()
