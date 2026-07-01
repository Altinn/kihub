import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      authors: z.array(z.string()).optional(),
      estimatedReadingTime: z.string().optional(),
      tags: z.array(z.string()).optional(),
      relatedArticles: z.array(z.string()).optional(),
      prerequisites: z.array(z.string()).optional(),
    }),
  }),
});

const nyheter = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/nyheter" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    image: z.string(),
    imageAlt: z.string(),
    color: z.enum(["accent", "brand1", "brand2", "brand3", "brand4"]).default("brand1"),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const arrangementer = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/arrangementer" }),
  schema: z.object({
    title: z.string(),
    ingress: z.string(),
    type: z.enum(["webinar", "verksted", "kurs", "konferanse", "internt"]),
    startDateTime: z.coerce.date(),
    endDateTime: z.coerce.date(),
    allDay: z.boolean().default(false),
    mode: z.enum(["digitalt", "oppmote", "hybrid"]),
    locationName: z.string(),
    locationAddress: z.string().optional(),
    meetingUrl: z.string().optional(),
    organizer: z.string(),
    registrationOpen: z.boolean().default(true),
    registrationUrl: z.string().optional(),
    registrationDeadline: z.coerce.date().optional(),
    capacity: z.number().nullable().default(null),
    registeredCount: z.number().default(0),
    status: z.enum(["upcoming", "full", "cancelled", "past"]).default("upcoming"),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  docs,
  nyheter,
  arrangementer,
};
