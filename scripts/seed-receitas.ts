import { db } from '../src/db'
import { recipes, recipeIngredients } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import data from '../receitas-seed.json'

type ReceitaSeed = {
  name: string
  category: string
  description: string
  prepTimeMinutes: number
  cookTimeMinutes: number
  servings: number
  instructions: string
  ingredients: { name: string; quantity: string; unit: string }[]
}

async function seed() {
  const list = data as ReceitaSeed[]
  let inserted = 0
  let skipped = 0

  for (const r of list) {
    // Evita duplicatas pelo nome
    const existing = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.name, r.name))
    if (existing.length > 0) { skipped++; continue }

    const [rec] = await db.insert(recipes).values({
      name: r.name,
      category: r.category,
      description: r.description,
      instructions: r.instructions,
      servings: r.servings,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
    }).returning()

    if (r.ingredients?.length) {
      await db.insert(recipeIngredients).values(
        r.ingredients.map((ing, i) => ({
          recipeId: rec.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit || null,
          sortOrder: i,
        }))
      )
    }

    inserted++
    console.log(`✓ ${r.name}`)
  }

  console.log(`\nPronto! ${inserted} inseridas · ${skipped} já existiam.`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
