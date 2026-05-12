/**
 * Knowledge Base Routes
 * Provides endpoints for FAQ and knowledge base management
 */
import express from "express";
import KnowledgeBase from "../models/KnowledgeBase.js";
import { guardAny, guardAdmin, guardSuperAdmin } from "../middleware/guards.js";
// import { generateKnowledgeBaseSummary } from "../services/aiClient.js"; // Temporarily disabled

const router = express.Router();

/**
 * GET /api/knowledge/search
 * Search knowledge base articles
 */
router.get("/search", async (req, res, next) => {
  try {
    const {
      q: query,
      category,
      type,
      language = 'en',
      targetAudience,
      limit = 20,
      skip = 0,
      sortBy = 'relevance'
    } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const results = await KnowledgeBase.search(query, {
      category,
      type,
      language,
      targetAudience,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy
    });

    // Increment search analytics
    for (const article of results) {
      if (!article.analytics.searchQueries.includes(query)) {
        await article.updateAnalytics({ searchQueries: [query] });
      }
    }

    res.json({
      query,
      results,
      total: results.length,
      hasMore: results.length === parseInt(limit)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/popular
 * Get popular articles
 */
router.get("/popular", async (req, res, next) => {
  try {
    const { limit = 10, timeframe = '30d', language = 'en' } = req.query;

    const articles = await KnowledgeBase.getPopular(parseInt(limit), timeframe)
      .where({ language });

    res.json({
      articles,
      timeframe,
      total: articles.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/category/:category
 * Get articles by category
 */
router.get("/category/:category", async (req, res, next) => {
  try {
    const { category } = req.params;
    const { language = 'en' } = req.query;

    const articles = await KnowledgeBase.getByCategory(category, language);

    res.json({
      category,
      articles,
      total: articles.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/:slug
 * Get specific article by slug
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const article = await KnowledgeBase.findOne({ slug, status: 'published' })
      .populate('author', 'name email')
      .populate('relatedArticles', 'title slug summary');

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Increment view count
    await article.incrementView();

    res.json(article);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/:slug/related
 * Get related articles
 */
router.get("/:slug/related", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const article = await KnowledgeBase.findOne({ slug });
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const related = await KnowledgeBase.getRelated(article._id);

    res.json({
      related,
      total: related.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/knowledge/:slug/helpful
 * Mark article as helpful or not helpful
 */
router.post("/:slug/helpful", ...guardAny, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ message: "helpful must be a boolean" });
    }

    const article = await KnowledgeBase.findOne({ slug, status: 'published' });
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    await article.markHelpful(helpful);

    res.json({
      message: `Article marked as ${helpful ? 'helpful' : 'not helpful'}`,
      helpfulCount: article.helpfulCount,
      notHelpfulCount: article.notHelpfulCount,
      helpfulnessScore: article.helpfulnessScore
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/categories
 * Get all categories with article counts
 */
router.get("/categories", async (req, res, next) => {
  try {
    const { language = 'en' } = req.query;

    const categories = await KnowledgeBase.aggregate([
      { $match: { status: 'published', language } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/faq
 * Get FAQ articles specifically
 */
router.get("/faq", async (req, res, next) => {
  try {
    const { category, language = 'en', limit = 20 } = req.query;

    const query = { type: 'faq', status: 'published', language };
    if (category) query.category = category;

    const faqs = await KnowledgeBase.find(query)
      .sort({ priority: -1, searchRank: -1 })
      .limit(parseInt(limit))
      .populate('author', 'name');

    res.json({
      faqs,
      total: faqs.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/knowledge
 * Create new knowledge base article (admin only)
 */
router.post("/", ...guardAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      summary,
      type,
      category,
      tags,
      priority,
      language,
      targetAudience,
      attachments,
      seo
    } = req.body;

    const article = await KnowledgeBase.create({
      title,
      content,
      summary,
      type,
      category,
      tags,
      priority,
      language,
      targetAudience,
      attachments,
      seo,
      author: req.userId
    });

    // Generate AI summary if not provided
    if (!summary && content.length > 100) {
      try {
        // const aiSummary = await generateKnowledgeBaseSummary(content);
        // if (aiSummary.available) {
        //   article.summary = aiSummary.summary;
        //   await article.save();
        // }
        console.log('AI summary generation temporarily disabled');
      } catch (error) {
        console.error('AI summary generation failed:', error);
      }
    }

    res.status(201).json({
      message: "Knowledge base article created successfully",
      article
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/knowledge/:id
 * Update knowledge base article (admin only)
 */
router.put("/:id", ...guardAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const article = await KnowledgeBase.findByIdAndUpdate(
      id,
      { ...updates, lastReviewed: new Date() },
      { new: true, runValidators: true }
    ).populate('author', 'name');

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.json({
      message: "Article updated successfully",
      article
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/knowledge/:id
 * Delete knowledge base article (admin only)
 */
router.delete("/:id", ...guardAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await KnowledgeBase.findByIdAndDelete(id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.json({
      message: "Article deleted successfully",
      article
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/admin/all
 * Get all articles for admin management
 */
router.get("/admin/all", ...guardAdmin, async (req, res, next) => {
  try {
    const {
      status,
      category,
      type,
      language,
      author,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;
    if (language) query.language = language;
    if (author) query.author = author;

    const articles = await KnowledgeBase.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await KnowledgeBase.countDocuments(query);

    res.json({
      articles,
      total,
      hasMore: articles.length === parseInt(limit)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/knowledge/admin/bulk-update
 * Bulk update articles (superadmin only)
 */
router.post("/admin/bulk-update", ...guardSuperAdmin, async (req, res, next) => {
  try {
    const { articleIds, updates } = req.body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({ message: "Article IDs are required" });
    }

    const result = await KnowledgeBase.updateMany(
      { _id: { $in: articleIds } },
      { ...updates, lastReviewed: new Date() }
    );

    res.json({
      message: "Bulk update completed",
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge/admin/analytics
 * Get knowledge base analytics (admin only)
 */
router.get("/admin/analytics", ...guardAdmin, async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = parseInt(timeframe) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalArticles,
      publishedArticles,
      totalViews,
      helpfulStats,
      categoryStats,
      popularArticles,
      recentActivity
    ] = await Promise.all([
      KnowledgeBase.countDocuments({ createdAt: { $gte: startDate } }),
      KnowledgeBase.countDocuments({ status: 'published', createdAt: { $gte: startDate } }),
      KnowledgeBase.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ]),
      KnowledgeBase.aggregate([
        { $match: { status: 'published', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            helpful: { $sum: '$helpfulCount' },
            notHelpful: { $sum: '$notHelpfulCount' }
          }
        }
      ]),
      KnowledgeBase.aggregate([
        { $match: { status: 'published', createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      KnowledgeBase.getPopular(5, timeframe),
      KnowledgeBase.find({ createdAt: { $gte: startDate } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'name')
        .select('title slug createdAt status viewCount')
    ]);

    res.json({
      overview: {
        totalArticles,
        publishedArticles,
        totalViews: totalViews[0]?.total || 0,
        helpfulRating: helpfulStats[0] ? {
          helpful: helpfulStats[0].helpful,
          notHelpful: helpfulStats[0].notHelpful,
          total: helpfulStats[0].helpful + helpfulStats[0].notHelpful
        } : null
      },
      categoryStats,
      popularArticles,
      recentActivity,
      timeframe
    });
  } catch (err) {
    next(err);
  }
});

export default router;
