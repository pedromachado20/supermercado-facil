import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const sourceTypeEnum = pgEnum('source_type', ['link', 'photo', 'pdf', 'manual'])
export const jobStatusEnum = pgEnum('job_status', ['pending', 'running', 'completed', 'failed'])

// ─── Auth (better-auth) ───────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

// ─── Supermercados ────────────────────────────────────────────────────────────

export const supermarkets = pgTable('supermarkets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  address: text('address'),
  city: text('city'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Categorias (lista normalizada master) ────────────────────────────────────

export const categories = pgTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Produtos ─────────────────────────────────────────────────────────────────

export const products = pgTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  name: text('name').notNull(),
  brand: text('brand'),
  categoryId: text('category_id').references(() => categories.id),
  unit: text('unit'),
  imageUrl: text('image_url'),
  barcode: text('barcode'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Entradas de Preço ────────────────────────────────────────────────────────

export const priceEntries = pgTable('price_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  supermarketId: text('supermarket_id').notNull().references(() => supermarkets.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 10, scale: 2 }),
  isPromo: boolean('is_promo').default(false).notNull(),
  sourceType: sourceTypeEnum('source_type').notNull(),
  sourceUrl: text('source_url'),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Jobs de Importação ───────────────────────────────────────────────────────

export const ingestionJobs = pgTable('ingestion_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  supermarketId: text('supermarket_id').notNull().references(() => supermarkets.id),
  sourceType: sourceTypeEnum('source_type').notNull(),
  sourceUrl: text('source_url'),
  sourceData: text('source_data'),
  status: jobStatusEnum('status').default('pending').notNull(),
  productsFound: integer('products_found').default(0),
  productsImported: integer('products_imported').default(0),
  errorMessage: text('error_message'),
  resultJson: text('result_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

// ─── Listas de Compras ────────────────────────────────────────────────────────

export const shoppingLists = pgTable('shopping_lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const shoppingListItems = pgTable('shopping_list_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id'),
  listId: text('list_id').references(() => shoppingLists.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  customName: text('custom_name'),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).default('1').notNull(),
  unit: text('unit'),
  checked: boolean('checked').default(false).notNull(),
  alertPrice: numeric('alert_price', { precision: 10, scale: 2 }),
  preferredSupermarketId: text('preferred_supermarket_id').references(() => supermarkets.id),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Configurações do usuário ─────────────────────────────────────────────────

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  monthlyBudget: numeric('monthly_budget', { precision: 10, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Receitas ─────────────────────────────────────────────────────────────────

export const recipes = pgTable('recipes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions'),
  servings: integer('servings'),
  prepTimeMinutes: integer('prep_time_minutes'),
  cookTimeMinutes: integer('cook_time_minutes'),
  imageUrl: text('image_url'),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const recipeIngredients = pgTable('recipe_ingredients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  name: text('name').notNull(),
  quantity: text('quantity'),
  unit: text('unit'),
  sortOrder: integer('sort_order').default(0),
})
