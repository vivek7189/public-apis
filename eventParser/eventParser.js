const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

class EventParser {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.initializeClassifier();
  }

  initializeClassifier() {
    // Training data for different types of meetings
    const trainingData = [
      { text: 'product demo showcase presentation walkthrough', category: 'product-demo' },
      { text: 'team sync standup daily weekly meeting catch-up', category: 'team-sync' },
      { text: 'interview screening candidate call chat hiring', category: 'interview' },
      { text: 'client customer meeting discussion review feedback', category: 'client-meeting' },
      { text: 'planning strategy roadmap discussion', category: 'planning' },
      { text: 'training workshop learning session education', category: 'training' }
    ];

    // Train the classifier
    trainingData.forEach(item => {
      this.classifier.addDocument(item.text, item.category);
    });

    this.classifier.train();
  }

  extractDuration(text) {
    // More comprehensive duration matching
    const durationPatterns = [
      /(\d+)\s*(?:hr|hour|hrs|hours)/i,  // Matches "1 hour", "2 hrs", etc.
      /(\d+)\s*(?:min|minute|mins|minutes)/i,  // Matches "30 min", "45 minutes", etc.
      /^(\d+)\s*(?:hour|hr)$/i,  // Matches standalone "1 hour"
      /^(\d+)\s*(?:min|minute)$/i  // Matches standalone "30 min"
    ];
  
    for (const pattern of durationPatterns) {
      const durationMatch = text.match(pattern);
      if (durationMatch) {
        const value = parseInt(durationMatch[1]);
        const unit = durationMatch[0].toLowerCase();
  
        // Convert hours to minutes
        if (unit.includes('hour') || unit.includes('hr')) {
          return value * 60;
        }
        
        return value;
      }
    }
  
    // Additional parsing for formats like "1-hour"
    const hyphenMatch = text.match(/(\d+)\s*-\s*hour/i);
    if (hyphenMatch) {
      return parseInt(hyphenMatch[1]) * 60;
    }
  
    // Default duration if no specific time found
    return 30;
  }

  extractMeetingPlatform(text) {
    const platforms = {
      'meet': 'google-meet',
      'google meet': 'google-meet',
      'zoom': 'zoom',
      'teams': 'ms-teams',
      'skype': 'skype',
      "custom":'custom'
    };

    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(platforms)) {
      if (lowerText.includes(key)) {
        return value;
      }
    }

    return 'google-meet'; // Default platform
  }

  extractTitle(text, category) {
    // Remove duration patterns
    let title = text.replace(/\d+\s*(min|minute|hour|hr)/gi, '')
      // Remove platform mentions
      .replace(/(via|on|using|through)\s+(meet|google meet|zoom|teams|skype)/gi, '')
      // Remove special characters
      .replace(/[:\-\(\)]/g, '')
      .trim();

    // If title becomes too short after cleaning, use category
    if (title.length < 3) {
      title = category.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return title;
  }

  async parseEvent(text) {
    try {
      // Get meeting category
      const tokens = tokenizer.tokenize(text);
      const category = this.classifier.classify(tokens.join(' '));

      // Extract components
      const duration = this.extractDuration(text);
      const meetType = this.extractMeetingPlatform(text);
      const title = this.extractTitle(text, category);

      return {
        success: true,
        data: {
          duration,
          meetType,
          title,
          metadata: {
            category,
            confidence: 0.8,
            originalText: text
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          duration: 30,
          meetType: 'custom',
          title: text,
          metadata: {
            category: 'unknown',
            confidence: 0.3,
            originalText: text
          }
        }
      };
    }
  }

  // Method to add custom training data
  addTrainingData(text, category) {
    this.classifier.addDocument(text, category);
    this.classifier.train();
  }
}

module.exports = EventParser;