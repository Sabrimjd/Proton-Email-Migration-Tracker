import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Comprehensive category keywords for re-categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  social: [
    'linkedin', 'facebook', 'twitter', 'instagram', 'reddit', 'x.com',
    'tiktok', 'snapchat', 'pinterest', 'tumblr', 'mastodon', 'threads',
    'discord', 'telegram', 'whatsapp', 'messenger', 'slack', 'teams',
    'meetup', 'bumble', 'tinder', 'hinge'
  ],
  financial: [
    'paypal', 'bank', 'credit', 'finance', 'invest', 'trading', 'crypto',
    'binance', 'coinbase', 'kraken', 'revolut', 'wise', 'transferwise',
    'n26', 'monzo', 'chase', 'hsbc', 'barclays', 'societe', 'bnparibas',
    'lcl', 'caissedepargne', 'banquepopulaire', 'creditagricole',
    'amex', 'visa', 'mastercard', 'stripe', 'square', 'venmo',
    'robinhood', 'etoro', 'fidelity', 'vanguard', 'schwab',
    'loan', 'mortgage', 'insurance', 'axa', 'allianz', 'generali'
  ],
  shopping: [
    'amazon', 'ebay', 'aliexpress', 'zalando', 'leroymerlin', 'etsy',
    'wish', 'shein', 'temu', 'asos', 'h&m', 'hm.com', 'zara', 'uniqlo',
    'ikea', 'castorama', 'boulanger', 'darty', 'fnac', 'cdiscount',
    'carrefour', 'auchan', 'leclerc', 'intermarche', 'monoprix',
    'lidl', 'aldi', 'costco', 'walmart', 'target', 'bestbuy',
    'apple.com/shop', 'microsoft.com/store', 'samsung', 'sony',
    'nike', 'adidas', 'decathlon', 'go-sport', 'intersport'
  ],
  work: [
    'vinc', 'digitalrealty', 'service-now', 'servicenow', 'workday',
    'sap', 'oracle', 'salesforce', 'hubspot', 'zendesk', 'jira',
    'confluence', 'notion', 'asana', 'trello', 'monday', 'clickup',
    'dropbox', 'box.com', 'drive.google', 'sharepoint', 'office',
    'atlassian', 'github', 'gitlab', 'bitbucket', 'docker', 'vercel',
    'netlify', 'heroku', 'digitalocean', 'aws', 'azure', 'gcp',
    'indeed', 'glassdoor', 'monster', 'pole-emploi', 'poleemploi'
  ],
  health: [
    'doctolib', 'health', 'medical', 'doctor', 'clinic', 'hospital',
    'pharmacy', 'medecin', 'sante', 'assurance-maladie', 'ameli',
    'mutuelle', 'laboratory', 'labo', 'biologie', 'analyses',
    'vaccination', 'covid', 'dentist', 'dentiste', 'optician',
    'psychology', 'therapist', 'wellness', 'fitness', 'gym'
  ],
  travel: [
    'airbnb', 'uber', 'grab', 'booking', 'hotel', 'flight', 'airline',
    'airfrance', 'ryanair', 'easyjet', 'lufthansa', 'britishairways',
    'expedia', 'tripadvisor', 'kayak', 'skyscanner', 'agoda',
    'marriott', 'hilton', 'accor', 'ibis', 'novotel', 'mercure',
    'trainline', 'sncf', 'oui.sncf', 'eurail', 'flixbus', 'blablacar',
    'lyft', 'cabify', 'getaround', 'turo', 'hertz', 'avis', 'enterprise'
  ],
  newsletters: [
    'newsletter', 'digest', 'subscribe', 'mailing', 'substack',
    'medium', 'quora', 'flipboard', 'pocket', 'feedly',
    'mailchimp', 'sendinblue', 'brevo', 'convertkit',
    'notifications', 'alerts', 'updates', 'weekly', 'daily'
  ],
  government: [
    'gouv', 'urssaf', 'impots', 'laposte', 'service-public',
    'ameli', 'assurance-maladie', 'securite-sociale', 'caf',
    'pole-emploi', 'poleemploi', 'meservices', 'franceconnect',
    'interieur', 'justice', 'education', 'culture', 'sport',
    'prefecture', 'mairie', 'ville', 'region', 'departement',
    'customs', 'douane', 'passport', 'visa', 'identity'
  ],
  utilities: [
    'bouygues', 'edf', 'veolia', 'sncf', 'engie', 'total', 'totalenergies',
    'orange', 'sfr', 'free', 'bbox', 'livebox', 'freebox',
    'enedis', 'grdf', 'lyonnaise', 'suez', 'smic', 'icpe',
    'internet', 'fiber', 'fibre', 'telecom', 'mobile',
    'electricity', 'electricite', 'gas', 'gaz', 'water', 'eau'
  ],
  entertainment: [
    'netflix', 'spotify', 'youtube', 'twitch', 'deezer', 'apple-music',
    'soundcloud', 'tidal', 'pandora', 'prime', 'disney', 'hulu',
    'hbo', 'paramount', 'peacock', 'crunchyroll', 'funimation',
    'steam', 'epic', 'playstation', 'xbox', 'nintendo', 'origin',
    'battlenet', 'riot', 'roblox', 'minecraft'
  ],
  education: [
    'coursera', 'udemy', 'edx', 'duolingo', 'khan', 'skillshare',
    'linkedin.com/learning', 'pluralsight', 'codecademy',
    'udacity', 'futurelearn', 'openlearning', 'masterclass',
    'brilliant', 'memrise', 'babbel', 'rosetta',
    'university', 'universite', 'college', 'school', 'ecole',
    'student', 'etudiant', 'campus', 'moodle', 'canvas'
  ],
  food: [
    'ubereats', 'deliveroo', 'justeat', 'doordash', 'grubhub',
    'foodpanda', 'postmates', 'instacart', 'gopuff',
    'too', 'good', 'toogood', 'phenix', 'deligreens',
    'restaurant', 'resto', 'delivery', 'livraison'
  ],
  technology: [
    'github', 'gitlab', 'bitbucket', 'stackoverflow', 'stackexchange',
    'dev.to', 'hashnode', 'medium.com/technology', 'techcrunch',
    'producthunt', 'indiehackers', 'hackernews', 'ycombinator',
    'jetbrains', 'figma', 'canva', 'adobe', 'notion', 'linear'
  ]
};

function detectCategory(domain: string, email: string): string {
  const domainLower = domain.toLowerCase();
  const emailLower = email.toLowerCase();
  const combined = `${domainLower} ${emailLower}`;

  let maxScore = 0;
  let bestCategory = 'other';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        // Exact domain match gets higher score
        if (domainLower === keyword || domainLower.includes(`.${keyword}.`) || domainLower.endsWith(`.${keyword}`)) {
          score += 3;
        } else if (domainLower.includes(keyword)) {
          score += 2;
        } else {
          score += 1;
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, serviceId, newCategory } = body;

    if (action === 'recategorize_all') {
      // Re-categorize all "other" services
      const otherServices = db.prepare(`
        SELECT id, domain, email_address FROM services WHERE category = 'other'
      `).all() as any[];

      let updated = 0;
      const updateStmt = db.prepare('UPDATE services SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

      for (const service of otherServices) {
        const newCat = detectCategory(service.domain, service.email_address);
        if (newCat !== 'other') {
          updateStmt.run(newCat, service.id);
          updated++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Re-categorized ${updated} services`,
        updated
      });
    }

    if (action === 'recategorize_one' && serviceId && newCategory) {
      // Re-categorize a single service
      db.prepare('UPDATE services SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newCategory, serviceId);

      return NextResponse.json({
        success: true,
        message: `Service ${serviceId} moved to ${newCategory}`
      });
    }

    if (action === 'auto_detect' && serviceId) {
      // Auto-detect category for a specific service
      const service = db.prepare('SELECT id, domain, email_address FROM services WHERE id = ?')
        .get(serviceId) as any;

      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      const newCat = detectCategory(service.domain, service.email_address);
      db.prepare('UPDATE services SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newCat, serviceId);

      return NextResponse.json({
        success: true,
        category: newCat
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in re-categorization:', error);
    return NextResponse.json({ error: 'Failed to re-categorize' }, { status: 500 });
  }
}
