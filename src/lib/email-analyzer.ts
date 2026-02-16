import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import Imap from 'imap';
import { loadConfig } from './config';

const config = loadConfig();

// Extract categories from config
const CATEGORIES: Record<string, string[]> = {};
for (const [name, cat] of Object.entries(config.categories)) {
  CATEGORIES[name] = cat.keywords;
}

// Extract priority domains from config
const PRIORITY_DOMAINS = [...config.priority.high_domains];
for (const [name, cat] of Object.entries(config.categories)) {
  if (cat.priority === 'high') {
    PRIORITY_DOMAINS.push(...cat.keywords);
  }
}

function detectCategory(email: string, domain: string = ''): string {
  const emailLower = email.toLowerCase();
  const domainLower = domain.toLowerCase();
  const combined = `${emailLower} ${domainLower}`;

  const scores: Record<string, number> = {};
  let maxScore = 0;
  let bestCategory = 'other';

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        if (domainLower === keyword || domainLower.includes(`.${keyword}`)) {
          score += 3;
        } else if (emailLower.includes(keyword)) {
          score += 2;
        } else {
          score += 1;
        }
      }
    }
    if (score > 0) {
      scores[category] = score;
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
  }

  return bestCategory;
}

function detectPriority(domain: string): string {
  const domainLower = domain.toLowerCase();

  for (const [name, cat] of Object.entries(config.categories)) {
    if (cat.priority && cat.keywords.some(k => domainLower.includes(k))) {
      return cat.priority;
    }
  }

  if (PRIORITY_DOMAINS.some(priority => domainLower.includes(priority))) {
    return 'high';
  }

  return 'medium';
}

function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase() : email;
}

function extractSenderEmail(from: string): string {
  const match = from?.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : from?.toLowerCase() || '';
}

function fixUtf8Encoding(str: string): string {
  try {
    if (str && /[ÃÂ][\x80-\xBF]/.test(str)) {
      return Buffer.from(str, 'latin1').toString('utf8');
    }
    return str;
  } catch {
    return str;
  }
}

function extractSenderName(from: string): string {
  let decoded = from?.replace(/=\?[^?]+\?[BQ]\?[^?]+\?=/gi, (match) => {
    const b64Match = match.match(/=\?[^?]+\?B\?([^?]+)\?=/i);
    if (b64Match) {
      try {
        return Buffer.from(b64Match[1], 'base64').toString('utf8');
      } catch {
        return match;
      }
    }
    const qMatch = match.match(/=\?[^?]+\?Q\?([^?]+)\?=/i);
    if (qMatch) {
      try {
        return qMatch[1].replace(/=([0-9A-F]{2})/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        ).replace(/_/g, ' ');
      } catch {
        return match;
      }
    }
    return match;
  }) || '';

  decoded = fixUtf8Encoding(decoded);

  const match = decoded.match(/"([^"]+)"/);
  if (match) return fixUtf8Encoding(match[1]);

  const emailMatch = decoded.match(/<([^>]+)>/);
  if (emailMatch) {
    const localPart = emailMatch[1].split('@')[0];
    return fixUtf8Encoding(localPart.charAt(0).toUpperCase() + localPart.slice(1));
  }

  return fixUtf8Encoding(decoded.split('@')[0]) || 'Unknown';
}

function fetchEmails(limit: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.protonmail.imap_user,
      password: config.protonmail.imap_password,
      host: config.protonmail.imap_host,
      port: config.protonmail.imap_port,
      tls: false,
      connTimeout: 60000,
      authTimeout: 30000,
    });

    const emails: any[] = [];
    let totalFetched = 0;

    imap.once('ready', () => {
      console.log('   Connected to IMAP server');

      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('   Error opening inbox:', err.message);
          imap.end();
          resolve(emails);
          return;
        }

        const totalEmails = box.messages.total;
        console.log(`   Total emails in inbox: ${totalEmails}`);

        const fetchCount = Math.min(limit, totalEmails);
        const startSeq = Math.max(1, totalEmails - fetchCount + 1);

        console.log(`   Fetching emails ${startSeq} to ${totalEmails} (${fetchCount} emails)...`);

        if (fetchCount === 0) {
          imap.end();
          resolve(emails);
          return;
        }

        const fetch = imap.seq.fetch(`${startSeq}:${totalEmails}`, {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: false,
        });

        fetch.on('message', (msg, seqno) => {
          let headers = '';
          let body = '';

          msg.on('body', (stream, info) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });
            stream.once('end', () => {
              const content = Buffer.concat(chunks).toString('utf8');
              if (info.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE)') {
                headers = content;
              } else {
                body = content;
              }
            });
          });

          msg.once('end', () => {
            totalFetched++;
            if (totalFetched % 500 === 0) {
              console.log(`   Processed ${totalFetched}/${fetchCount} emails...`);
            }

            const fromMatch = headers.match(/From:\s*(.+)/i);
            const toMatch = headers.match(/To:\s*(.+)/i);
            const subjectMatch = headers.match(/Subject:\s*(.+)/i);
            const dateMatch = headers.match(/Date:\s*(.+)/i);

            const from = fromMatch ? fromMatch[1].trim() : '';
            const to = toMatch ? toMatch[1].trim() : '';
            const subject = subjectMatch ? subjectMatch[1].trim() : '';
            const dateStr = dateMatch ? dateMatch[1].trim() : '';

            let decodedSubject = subject.replace(/=\?[^?]+\?[BQ]\?[^?]+\?=/gi, (match) => {
              const b64Match = match.match(/=\?[^?]+\?B\?([^?]+)\?=/i);
              if (b64Match) {
                try {
                  return Buffer.from(b64Match[1], 'base64').toString('utf8');
                } catch {
                  return match;
                }
              }
              const qMatch = match.match(/=\?[^?]+\?Q\?([^?]+)\?=/i);
              if (qMatch) {
                try {
                  return qMatch[1].replace(/=([0-9A-F]{2})/gi, (_, hex) =>
                    String.fromCharCode(parseInt(hex, 16))
                  ).replace(/_/g, ' ');
                } catch {
                  return match;
                }
              }
              return match;
            });

            decodedSubject = fixUtf8Encoding(decodedSubject);

            let parsedDate: string;
            try {
              const d = new Date(dateStr);
              parsedDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
            } catch {
              parsedDate = new Date().toISOString();
            }

            emails.push({
              id: seqno.toString(),
              from,
              to: to ? [to] : [],
              subject: decodedSubject || '(No Subject)',
              date: parsedDate,
              isRead: true,
              bodyPreview: body.substring(0, 200),
            });
          });
        });

        fetch.once('error', (err) => {
          console.error('   Fetch error:', err.message);
        });

        fetch.once('end', () => {
          console.log(`   Fetched ${emails.length} emails`);
          imap.end();
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('   IMAP connection error:', err.message);
      resolve(emails);
    });

    imap.once('end', () => {
      resolve(emails);
    });

    imap.connect();
  });
}

export interface AnalysisResult {
  emailsScanned: number;
  servicesFound: number;
  servicesMigrated: number;
  errors: string[];
}

export async function runEmailAnalysis(): Promise<AnalysisResult> {
  console.log('[Email Analyzer] Starting email analysis...');

  const result: AnalysisResult = {
    emailsScanned: 0,
    servicesFound: 0,
    servicesMigrated: 0,
    errors: [],
  };

  try {
    // Initialize database
    const dataDir = path.dirname(config.database.path);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = config.database.path;
    const db = new Database(dbPath);

    // Get recent emails via direct IMAP
    console.log('[Email Analyzer] Fetching recent emails via IMAP...');
    const emails = await fetchEmails(config.protonmail.email_scan_limit);
    console.log(`[Email Analyzer] Retrieved ${emails.length} emails`);

    result.emailsScanned = emails.length;

    if (emails.length === 0) {
      console.log('[Email Analyzer] No emails found. Check IMAP connection.');
      result.errors.push('No emails found');
      db.close();
      return result;
    }

    // Analyze and group by sender email
    const serviceMap = new Map<string, any>();

    for (const email of emails) {
      const senderEmail = extractSenderEmail(email.from);
      if (!senderEmail) continue;

      const senderDomain = extractDomain(senderEmail);

      if (config.emails.personal_domains.some(d => senderDomain === d || senderDomain.endsWith(`.${d}`))) {
        continue;
      }

      if (!serviceMap.has(senderEmail)) {
        serviceMap.set(senderEmail, {
          name: extractSenderName(email.from),
          domain: senderDomain,
          email_address: senderEmail,
          category: detectCategory(senderEmail, senderDomain),
          priority: detectPriority(senderDomain),
          emails_received: 0,
          emails_sent: 0,
          last_email_date: email.date,
          first_email_date: email.date,
          recipients: new Set<string>(),
        });
      }

      const service = serviceMap.get(senderEmail)!;
      service.emails_received++;

      const recipientEmail = extractSenderEmail(email.to?.[0] || '');
      if (recipientEmail) {
        service.recipients.add(recipientEmail);
      }

      if (email.date) {
        if (!service.last_email_date || new Date(email.date) > new Date(service.last_email_date)) {
          service.last_email_date = email.date;
        }
        if (!service.first_email_date || new Date(email.date) < new Date(service.first_email_date)) {
          service.first_email_date = email.date;
        }
      }
    }

    // Detect migrated services
    const migratedServices = new Map<string, { oldEmail: string; newEmail: string; migrationDate: string }>();

    for (const [senderEmail, service] of serviceMap) {
      const recipients = Array.from(service.recipients) as string[];

      const sendsToNew = recipients.some((r: string) =>
        config.emails.new_domains.some(d => r.toLowerCase().includes(`@${d}`) || r.toLowerCase().endsWith(`.${d}`))
      );

      if (sendsToNew) {
        const newEmail = recipients.find((r: string) =>
          config.emails.new_domains.some(d => r.toLowerCase().includes(`@${d}`) || r.toLowerCase().endsWith(`.${d}`))
        ) || 'unknown';

        migratedServices.set(senderEmail, {
          oldEmail: config.emails.old_address,
          newEmail: newEmail,
          migrationDate: service.last_email_date,
        });
      }
    }

    console.log(`[Email Analyzer] Detected ${migratedServices.size} services already migrated`);
    result.servicesMigrated = migratedServices.size;

    const filteredServices = Array.from(serviceMap.values())
      .sort((a, b) => b.emails_received - a.emails_received);

    console.log(`[Email Analyzer] Found ${filteredServices.length} services to track`);
    result.servicesFound = filteredServices.length;

    // Insert into database
    const upsertStmt = db.prepare(`
      INSERT INTO services
      (name, domain, email_address, category, priority, status, emails_received, emails_sent, last_email_date, first_email_date, old_email, new_email, migration_date, updated_at)
      VALUES (
        @name, @domain, @email_address, @category, @priority,
        CASE
          WHEN @is_migrated = 1 THEN 'migrated'
          ELSE COALESCE((SELECT status FROM services WHERE email_address = @email_address), 'pending')
        END,
        @emails_received, @emails_sent, @last_email_date, @first_email_date,
        CASE
          WHEN @is_migrated = 1 THEN @old_email
          ELSE (SELECT old_email FROM services WHERE email_address = @email_address)
        END,
        CASE
          WHEN @is_migrated = 1 THEN @new_email
          ELSE (SELECT new_email FROM services WHERE email_address = @email_address)
        END,
        CASE
          WHEN @is_migrated = 1 THEN COALESCE((SELECT migration_date FROM services WHERE email_address = @email_address), @migration_date)
          ELSE (SELECT migration_date FROM services WHERE email_address = @email_address)
        END,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(email_address) DO UPDATE SET
        name = excluded.name,
        domain = excluded.domain,
        emails_received = excluded.emails_received,
        emails_sent = excluded.emails_sent,
        last_email_date = excluded.last_email_date,
        first_email_date = excluded.first_email_date,
        status = CASE
          WHEN @is_migrated = 1 THEN 'migrated'
          ELSE services.status
        END,
        old_email = CASE
          WHEN @is_migrated = 1 AND services.old_email IS NULL THEN @old_email
          ELSE services.old_email
        END,
        new_email = CASE
          WHEN @is_migrated = 1 AND services.new_email IS NULL THEN @new_email
          ELSE services.new_email
        END,
        migration_date = CASE
          WHEN @is_migrated = 1 AND services.migration_date IS NULL THEN @migration_date
          ELSE services.migration_date
        END,
        updated_at = CURRENT_TIMESTAMP
    `);

    const servicesWithMigration = filteredServices.map(s => {
      const migration = migratedServices.get(s.email_address);
      return {
        ...s,
        is_migrated: migration ? 1 : 0,
        old_email: migration?.oldEmail || null,
        new_email: migration?.newEmail || null,
        migration_date: migration?.migrationDate || null,
      };
    });

    const upsertMany = db.transaction((services: any[]) => {
      for (const service of services) {
        upsertStmt.run(service);
      }
    });

    upsertMany(servicesWithMigration);

    // Store individual emails
    console.log('[Email Analyzer] Processing email metadata...');

    const emailToId: Record<string, number> = {};
    const services = db.prepare('SELECT id, email_address FROM services').all() as any[];
    for (const svc of services) {
      emailToId[svc.email_address.toLowerCase()] = svc.id;
    }

    db.exec('DELETE FROM emails');

    const insertEmail = db.prepare(`
      INSERT INTO emails (service_id, subject, sender, sender_email, recipient_email, received_at, is_read)
      VALUES (@service_id, @subject, @sender, @sender_email, @recipient_email, @received_at, @is_read)
    `);

    const insertEmails = db.transaction((emailsList: any[]) => {
      for (const email of emailsList) {
        insertEmail.run(email);
      }
    });

    const emailsToStore: any[] = [];

    for (const email of emails) {
      const senderEmail = extractSenderEmail(email.from);
      if (!senderEmail) continue;

      const serviceId = emailToId[senderEmail];
      if (!serviceId) continue;

      const sender = extractSenderName(email.from);
      const recipientEmail = extractSenderEmail(email.to?.[0] || '');

      emailsToStore.push({
        service_id: serviceId,
        subject: (email.subject || '(No Subject)').substring(0, 500),
        sender: sender.substring(0, 200),
        sender_email: senderEmail,
        recipient_email: recipientEmail,
        received_at: email.date || new Date().toISOString(),
        is_read: email.isRead ? 1 : 0,
      });
    }

    if (emailsToStore.length > 0) {
      insertEmails(emailsToStore);
    }

    console.log(`[Email Analyzer] Stored ${emailsToStore.length} email records`);

    // Log scan run
    db.prepare(`
      INSERT INTO scan_runs (emails_scanned, services_found, status)
      VALUES (?, ?, 'completed')
    `).run(emails.length, filteredServices.length);

    console.log('[Email Analyzer] Analysis complete!');

    db.close();
    return result;

  } catch (error) {
    console.error('[Email Analyzer] Error during analysis:', error);
    result.errors.push(String(error));
    throw error;
  }
}
