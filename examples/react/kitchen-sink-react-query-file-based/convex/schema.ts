import { defineSchema, defineTable } from 'convex/server'
import { Infer, v } from 'convex/values'

const geoValidator = v.object({
  lat: v.string(),
  lng: v.string(),
})

const addressValidator = v.object({
  street: v.string(),
  suite: v.string(),
  city: v.string(),
  zipcode: v.string(),
  geo: geoValidator,
})

const companyValidator = v.object({
  name: v.string(),
  catchPhrase: v.string(),
  bs: v.string(),
})

export const userValidator = v.object({
  id: v.number(),
  name: v.string(),
  username: v.string(),
  email: v.string(),
  address: addressValidator,
  phone: v.string(),
  website: v.string(),
  company: companyValidator,
})

export const invoiceValidator = v.object({
  id: v.number(),
  title: v.string(),
  body: v.string(),
  userId: v.optional(v.number()),
})

export type Invoice = Infer<typeof invoiceValidator>

export default defineSchema({
  users: defineTable(userValidator).index('id', ['id']),
  invoices: defineTable(invoiceValidator).index('id', ['id']),
})
