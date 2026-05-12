/**
 * Knowledge Base Model
 * Stores articles, FAQs, and help documentation
 */
import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  summary: {
    type: String,
    maxlength: 500,
    default: ''
  },
  type: {
    type: String,
    enum: ['article', 'faq', 'guide', 'policy', 'tutorial'],
    required: true,
    default: 'article'
  },
  category: {
    type: String,
    required: true,
    enum: [
      'getting-started',
      'submitting-grievances',
      'tracking-status',
      'policies-procedures',
      'technical-help',
      'account-management',
      'department-info',
      'common-issues',
      'emergency-contacts'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'es', 'fr', 'de', 'zh', 'hi', 'ar']
  },
  targetAudience: [{
    type: String,
    enum: ['students', 'admins', 'superadmins', 'all']
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  searchRank: {
    type: Number,
    default: 0
  },
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  attachments: [{
    type: String, // File paths
    description: String
  }],
  lastReviewed: {
    type: Date,
    default: Date.now
  },
  reviewFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annually', 'never'],
    default: 'quarterly'
  },
  nextReviewDate: {
    type: Date
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  analytics: {
    averageReadTime: Number,
    bounceRate: Number,
    searchQueries: [String],
    clickThroughRate: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for search performance
knowledgeBaseSchema.index({ title: 'text', content: 'text', summary: 'text', tags: 'text' });
knowledgeBaseSchema.index({ category: 1, status: 1, priority: 1 });
knowledgeBaseSchema.index({ targetAudience: 1, status: 1 });
knowledgeBaseSchema.index({ searchRank: -1, viewCount: -1 });

// Virtual for helpfulness score
knowledgeBaseSchema.virtual('helpfulnessScore').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  return total > 0 ? (this.helpfulCount / total) * 100 : 0;
});

// Pre-save middleware for slug generation
knowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// Pre-save middleware for next review date
knowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified('reviewFrequency') || this.isNew) {
    const now = new Date();
    let months = 3; // default quarterly
    
    switch (this.reviewFrequency) {
      case 'weekly': months = 0.25; break;
      case 'monthly': months = 1; break;
      case 'quarterly': months = 3; break;
      case 'annually': months = 12; break;
      case 'never': 
        this.nextReviewDate = null;
        return next();
    }
    
    this.nextReviewDate = new Date(now.setMonth(now.getMonth() + months));
  }
  next();
});

// Static methods
knowledgeBaseSchema.statics.search = function(query, options = {}) {
  const {
    category,
    type,
    language = 'en',
    targetAudience,
    limit = 20,
    skip = 0,
    sortBy = 'relevance'
  } = options;

  const searchQuery = {
    status: 'published',
    language
  };

  if (category) searchQuery.category = category;
  if (type) searchQuery.type = type;
  if (targetAudience) searchQuery.targetAudience = { $in: [targetAudience, 'all'] };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  let sort = {};
  switch (sortBy) {
    case 'recent':
      sort = { createdAt: -1 };
      break;
    case 'popular':
      sort = { viewCount: -1 };
      break;
    case 'helpful':
      sort = { helpfulCount: -1 };
      break;
    case 'priority':
      sort = { priority: -1, searchRank: -1 };
      break;
    default: // relevance
      sort = { score: { $meta: 'textScore' }, searchRank: -1 };
  }

  return this.find(searchQuery)
    .populate('author', 'name email')
    .populate('relatedArticles', 'title slug')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

knowledgeBaseSchema.statics.getPopular = function(limit = 10, timeframe = '30d') {
  const dateFilter = {};
  if (timeframe !== 'all') {
    const days = parseInt(timeframe) || 30;
    dateFilter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }

  return this.find({ 
    status: 'published', 
    ...dateFilter 
  })
    .sort({ viewCount: -1, helpfulCount: -1 })
    .limit(limit)
    .populate('author', 'name');
};

knowledgeBaseSchema.statics.getByCategory = function(category, language = 'en') {
  return this.find({ 
    category, 
    status: 'published', 
    language 
  })
    .sort({ priority: -1, searchRank: -1 })
    .populate('author', 'name');
};

knowledgeBaseSchema.statics.getRelated = function(articleId, limit = 5) {
  return this.findById(articleId)
    .then(article => {
      if (!article) return [];
      
      return this.find({
        _id: { $ne: articleId },
        category: article.category,
        status: 'published',
        language: article.language
      })
        .sort({ searchRank: -1, viewCount: -1 })
        .limit(limit)
        .populate('author', 'name');
    });
};

// Instance methods
knowledgeBaseSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save();
};

knowledgeBaseSchema.methods.markHelpful = function(helpful = true) {
  if (helpful) {
    this.helpfulCount += 1;
  } else {
    this.notHelpfulCount += 1;
  }
  return this.save();
};

knowledgeBaseSchema.methods.updateAnalytics = function(data) {
  if (data.averageReadTime) this.analytics.averageReadTime = data.averageReadTime;
  if (data.bounceRate) this.analytics.bounceRate = data.bounceRate;
  if (data.searchQueries) this.analytics.searchQueries.push(...data.searchQueries);
  if (data.clickThroughRate) this.analytics.clickThroughRate = data.clickThroughRate;
  return this.save();
};

export default mongoose.model('KnowledgeBase', knowledgeBaseSchema);
