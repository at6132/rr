import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original users table (kept for compatibility)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(),
  imageUrl: text("image_url"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  detectedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  source: text("source").notNull(), // 'youtube', 'reddit', 'blog'
  title: text("title").notNull(),
  content: text("content"),
  sourceUrl: text("source_url").notNull(),
  author: text("author"),
  publishedAt: text("published_at"),
  thumbnailUrl: text("thumbnail_url"),
  additionalData: json("additional_data"), // For source-specific data (e.g., views for YouTube)
  sentimentScore: integer("sentiment_score"), // 1-5, with 5 being most positive
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// AI Summaries table
export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  positivePercentage: integer("positive_percentage").notNull(),
  neutralPercentage: integer("neutral_percentage").notNull(),
  negativePercentage: integer("negative_percentage").notNull(),
  pros: json("pros").notNull(), // Array of strings
  cons: json("cons").notNull(), // Array of strings
  tags: json("tags").notNull(), // Array of strings (e.g., "Best for travelers")
  reviewCount: integer("review_count").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

// AI Chat History table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  message: text("message").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// API Types (for responses)
export const videoReviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  publishedAt: z.string(),
  viewCount: z.number().optional(),
  thumbnailUrl: z.string(),
  videoUrl: z.string(),
  type: z.enum(["all", "in-depth", "short"]).default("all"),
});

export type VideoReview = z.infer<typeof videoReviewSchema>;

export const redditPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  subreddit: z.string(),
  upvotes: z.number(),
  publishedAt: z.string(),
  summary: z.string(),
  url: z.string(),
});

export type RedditPost = z.infer<typeof redditPostSchema>;

export const blogReviewSchema = z.object({
  id: z.string(),
  source: z.string(),
  rating: z.number().optional(),
  snippet: z.string(),
  url: z.string(),
  logoText: z.string(),
});

export type BlogReview = z.infer<typeof blogReviewSchema>;

// Platform Rating schema for aggregated scores across different platforms
export const platformRatingSchema = z.object({
  platform: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  verified: z.boolean().optional(),
  weight: z.number(), // Weight factor for this platform (1-10)
  url: z.string().optional(),
});

export type PlatformRating = z.infer<typeof platformRatingSchema>;

// Aggregated Score schema
export const aggregatedScoreSchema = z.object({
  overallScore: z.number(), // Normalized overall score (0-5)
  totalReviewCount: z.number(), // Total number of reviews across all platforms
  confidenceScore: z.number(), // How confident we are in this score (0-1)
  platformBreakdown: z.array(platformRatingSchema), // Individual platform scores
});

export type AggregatedScore = z.infer<typeof aggregatedScoreSchema>;

export const productAnalysisSchema = z.object({
  product: z.object({
    title: z.string(),
    source: z.string(),
    url: z.string(),
    imageUrl: z.string().optional(),
  }),
  summary: z.object({
    positivePercentage: z.number(),
    neutralPercentage: z.number(),
    negativePercentage: z.number(),
    reviewCount: z.number(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    tags: z.array(z.string()),
  }),
  aggregatedScore: aggregatedScoreSchema.optional(), // New field for our aggregated score
  videoReviews: z.array(videoReviewSchema),
  redditPosts: z.array(redditPostSchema),
  blogReviews: z.array(blogReviewSchema),
});

export type ProductAnalysis = z.infer<typeof productAnalysisSchema>;
