/**
 * Internationalization Service
 * Handles multi-language support and translations
 */
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

class I18nService {
  constructor() {
    this.translations = new Map();
    this.fallbackLanguage = 'en';
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'hi', 'ar'];
    this.translationCache = new Map();
    this.loadTranslations();
  }

  /**
   * Load translation files
   */
  async loadTranslations() {
    try {
      const translationsDir = path.join(process.cwd(), 'src', 'translations');
      
      for (const lang of this.supportedLanguages) {
        const filePath = path.join(translationsDir, `${lang}.json`);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          this.translations.set(lang, JSON.parse(content));
        } catch (error) {
          console.warn(`Translation file not found for ${lang}, using empty object`);
          this.translations.set(lang, {});
        }
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  /**
   * Get translation for a key
   */
  t(key, language = 'en', params = {}) {
    const lang = this.supportedLanguages.includes(language) ? language : this.fallbackLanguage;
    const translations = this.translations.get(lang) || {};
    
    let translation = this.getNestedValue(translations, key);
    
    // Fallback to English if translation not found
    if (!translation && lang !== this.fallbackLanguage) {
      const fallbackTranslations = this.translations.get(this.fallbackLanguage) || {};
      translation = this.getNestedValue(fallbackTranslations, key);
    }
    
    // Return key if no translation found
    if (!translation) {
      return key;
    }
    
    // Replace parameters
    return this.replaceParams(translation, params);
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, key) {
    return key.split('.').reduce((current, keyPart) => {
      return current && current[keyPart] !== undefined ? current[keyPart] : null;
    }, obj);
  }

  /**
   * Replace parameters in translation string
   */
  replaceParams(str, params) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Translate grievance content using AI
   */
  async translateContent(content, targetLanguage, sourceLanguage = 'en') {
    if (targetLanguage === sourceLanguage) {
      return content;
    }

    const cacheKey = `${content.substring(0, 100)}_${sourceLanguage}_${targetLanguage}`;
    
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      // Use AI service for translation
      const translation = await this.aiTranslate(content, targetLanguage, sourceLanguage);
      this.translationCache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error('Translation failed:', error);
      return content; // Return original if translation fails
    }
  }

  /**
   * AI-powered translation
   */
  async aiTranslate(content, targetLanguage, sourceLanguage) {
    // This would integrate with your AI service
    // For now, return a mock implementation
    const languageNames = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'ar': 'Arabic'
    };

    return `[Translated to ${languageNames[targetLanguage]}]: ${content}`;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages.map(code => ({
      code,
      name: this.getLanguageName(code),
      nativeName: this.getNativeLanguageName(code)
    }));
  }

  /**
   * Get language name in English
   */
  getLanguageName(code) {
    const names = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'ar': 'Arabic'
    };
    return names[code] || code;
  }

  /**
   * Get native language name
   */
  getNativeLanguageName(code) {
    const names = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文',
      'hi': 'हिन्दी',
      'ar': 'العربية'
    };
    return names[code] || code;
  }

  /**
   * Detect language from text
   */
  async detectLanguage(text) {
    // Simple language detection based on character patterns
    // In production, use a proper language detection library
    
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[ñáéíóúü]/i.test(text)) return 'es';
    if (/[àâäçéèêëïîôöùûüÿ]/i.test(text)) return 'fr';
    if (/[äöüß]/i.test(text)) return 'de';
    
    return 'en'; // Default to English
  }

  /**
   * Format date according to locale
   */
  formatDate(date, language = 'en', options = {}) {
    const locale = this.getLocaleCode(language);
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    
    try {
      return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format number according to locale
   */
  formatNumber(number, language = 'en', options = {}) {
    const locale = this.getLocaleCode(language);
    const defaultOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    };
    
    try {
      return new Intl.NumberFormat(locale, defaultOptions).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount, language = 'en', currency = 'USD') {
    const locale = this.getLocaleCode(language);
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount}`;
    }
  }

  /**
   * Get locale code for Intl APIs
   */
  getLocaleCode(language) {
    const localeMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'hi': 'hi-IN',
      'ar': 'ar-SA'
    };
    return localeMap[language] || 'en-US';
  }

  /**
   * Get translation for grievance categories
   */
  getCategoryTranslation(category, language = 'en') {
    const categoryKey = `categories.${category}`;
    return this.t(categoryKey, language, { category });
  }

  /**
   * Get translation for grievance status
   */
  getStatusTranslation(status, language = 'en') {
    const statusKey = `statuses.${status}`;
    return this.t(statusKey, language, { status });
  }

  /**
   * Get translation for priority levels
   */
  getPriorityTranslation(priority, language = 'en') {
    const priorityKey = `priorities.${priority}`;
    return this.t(priorityKey, language, { priority });
  }

  /**
   * Translate grievance object
   */
  async translateGrievance(grievance, targetLanguage) {
    if (targetLanguage === 'en') {
      return grievance;
    }

    const translated = { ...grievance };
    
    // Translate title and description
    if (grievance.title) {
      translated.title = await this.translateContent(grievance.title, targetLanguage);
    }
    
    if (grievance.description) {
      translated.description = await this.translateContent(grievance.description, targetLanguage);
    }
    
    // Translate category, status, and priority
    if (grievance.category) {
      translated.categoryTranslated = this.getCategoryTranslation(grievance.category, targetLanguage);
    }
    
    if (grievance.status) {
      translated.statusTranslated = this.getStatusTranslation(grievance.status, targetLanguage);
    }
    
    if (grievance.priority) {
      translated.priorityTranslated = this.getPriorityTranslation(grievance.priority, targetLanguage);
    }
    
    return translated;
  }

  /**
   * Get localized error message
   */
  getErrorMessage(errorKey, language = 'en', params = {}) {
    return this.t(`errors.${errorKey}`, language, params);
  }

  /**
   * Get localized success message
   */
  getSuccessMessage(messageKey, language = 'en', params = {}) {
    return this.t(`success.${messageKey}`, language, params);
  }

  /**
   * Validate language code
   */
  isValidLanguage(code) {
    return this.supportedLanguages.includes(code);
  }

  /**
   * Get user's preferred language
   */
  getUserLanguage(user) {
    return user.language || this.fallbackLanguage;
  }

  /**
   * Update user's language preference
   */
  async setUserLanguage(userId, language) {
    if (!this.isValidLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    // Update user in database
    // This would depend on your User model implementation
    try {
      await User.findByIdAndUpdate(userId, { language });
      return true;
    } catch (error) {
      console.error('Failed to update user language:', error);
      return false;
    }
  }

  /**
   * Create localized response
   */
  createLocalizedResponse(data, language, messageKey, params = {}) {
    return {
      ...data,
      message: this.t(messageKey, language, params),
      language
    };
  }

  /**
   * Get RTL (Right-to-Left) language info
   */
  isRTLLanguage(language) {
    return ['ar', 'he', 'fa'].includes(language);
  }

  /**
   * Get text direction for language
   */
  getTextDirection(language) {
    return this.isRTLLanguage(language) ? 'rtl' : 'ltr';
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
  }

  /**
   * Reload translations from files
   */
  async reloadTranslations() {
    this.clearCache();
    await this.loadTranslations();
  }
}

export default new I18nService();
