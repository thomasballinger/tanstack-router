import { v } from 'convex/values'
import { shuffle } from '../src/utils/utils'

import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'

import type { invoiceValidator, userValidator } from './schema'
import type { Infer } from 'convex/values'

export const seed = internalAction(async (ctx) => {
  const users = await (
    await fetch('https://jsonplaceholder.typicode.com/users')
  ).json()
  const invoices = await (
    await fetch('https://jsonplaceholder.typicode.com/posts')
  ).json()
  await ctx.runMutation(internal.data.resetPostsAndInvoices, {
    users: users.slice(0, 10),
    invoices: invoices.slice(0, 10),
  })
})

export const resetPostsAndInvoices = internalMutation(
  async (
    ctx,
    {
      invoices,
      users,
    }: {
      invoices: Array<Infer<typeof invoiceValidator>>
      users: Array<Infer<typeof userValidator>>
    },
  ) => {
    for await (const user of ctx.db.query('users')) {
      ctx.db.delete(user._id)
    }
    for await (const invoice of ctx.db.query('invoices')) {
      ctx.db.delete(invoice._id)
    }

    for (const user of users) {
      ctx.db.insert('users', user)
    }
    for (const invoice of invoices) {
      ctx.db.insert('invoices', invoice)
    }
  },
)

export const getInvoices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('invoices').collect()
  },
})

export const getInvoice = query({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    const invoice = await ctx.db
      .query('invoices')
      .withIndex('id', (q) => q.eq('id', id))
      .unique()
    if (!invoice) throw new Error('not found')
    return invoice
  },
})

export const postInvoice = mutation({
  args: {
    id: v.optional(v.number()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, partialInvoice) => {
    if (partialInvoice.title?.includes('error')) {
      console.log('error')
      throw new Error('Ouch!')
    }
    const largestId = await ctx.db.query('invoices').order('desc').first()
    const id = largestId?.id || 1
    const invoice = {
      id,
      title:
        partialInvoice.title ?? `New Invoice ${String(Date.now()).slice(0, 5)}`,
      body:
        partialInvoice.body ??
        shuffle(
          `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      Fusce ac turpis quis ligula lacinia aliquet. Mauris ipsum. Nulla metus metus, ullamcorper vel, tincidunt sed, euismod in, nibh. Quisque volutpat condimentum velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Nam nec ante. 
      Vestibulum sapien. Proin quam. Etiam ultrices. Suspendisse in justo eu magna luctus suscipit. Sed lectus. Integer euismod lacus luctus magna.  Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante.
      `.split(' '),
        ).join(' '),
    }
    await ctx.db.insert('invoices', invoice)
    return invoice
  },
})

export const patchInvoice = mutation({
  args: {
    id: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, updatedInvoice) => {
    const invoice = await ctx.db
      .query('invoices')
      .withIndex('id', (q) => q.eq('id', updatedInvoice.id))
      .unique()
    if (!invoice) {
      throw new Error('Invoice not found.')
    }

    if (updatedInvoice.title?.toLocaleLowerCase().includes('error')) {
      throw new Error('Ouch!')
    }

    await ctx.db.patch(invoice._id, updatedInvoice)
  },
})

export const getUsers = query({
  args: {},
  handler: async (ctx, args) => {
    console.log('ignoring args:', args)
    return await ctx.db.query('users').collect()
  },
})
export const getUser = query({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    return await ctx.db
      .query('users')
      .withIndex('id', (q) => q.eq('id', id))
      .unique()
  },
})
