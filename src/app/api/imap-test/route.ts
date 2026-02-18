import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap';

interface IMAPTestRequest {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface IMAPTestResult {
  success: boolean;
  message: string;
  details?: {
    serverBanner?: string;
    capabilities?: string[];
    folders?: string[];
    connectionTime?: number;
  };
  error?: string;
  errorType?: 'connection' | 'auth' | 'timeout' | 'unknown';
}

export async function POST(req: NextRequest): Promise<NextResponse<IMAPTestResult>> {
  const startTime = Date.now();
  
  try {
    const body: IMAPTestRequest = await req.json();
    const { host, port, user, password } = body;

    // Basic validation
    if (!host || typeof host !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'IMAP host is required',
        error: 'Missing host',
        errorType: 'connection',
      }, { status: 400 });
    }

    if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
      return NextResponse.json({
        success: false,
        message: 'Valid IMAP port is required (1-65535)',
        error: 'Invalid port',
        errorType: 'connection',
      }, { status: 400 });
    }

    if (!user || typeof user !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'IMAP username is required',
        error: 'Missing user',
        errorType: 'auth',
      }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'IMAP password is required',
        error: 'Missing password',
        errorType: 'auth',
      }, { status: 400 });
    }

    // Perform the actual IMAP connection test
    const result = await testIMAPConnection({ host, port, user, password });
    result.details = {
      ...result.details,
      connectionTime: Date.now() - startTime,
    };

    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('IMAP test error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Don't expose sensitive details in error messages
    return NextResponse.json({
      success: false,
      message: 'Connection test failed. Please check your settings.',
      error: 'Test failed',
      errorType: 'unknown',
      details: {
        connectionTime: Date.now() - startTime,
      },
    }, { status: 500 });
  }
}

async function testIMAPConnection(config: IMAPTestRequest): Promise<IMAPTestResult> {
  return new Promise((resolve) => {
    let serverBanner: string | undefined;
    const capabilities: string[] = [];
    let folders: string[] = [];

    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: false, // Proton Bridge uses plain TLS on connection level
      tlsOptions: {
        rejectUnauthorized: false, // Allow self-signed certs
      },
      connTimeout: 15000, // 15 seconds timeout
      authTimeout: 10000, // 10 seconds auth timeout
    });

    // Handle ready event - connection established
    imap.once('ready', () => {
      // Get server capabilities (access via internal property)
      try {
        const caps = (imap as any).capabilities;
        if (caps && typeof caps.forEach === 'function') {
          caps.forEach((cap: string) => {
            capabilities.push(cap);
          });
        }
      } catch {
        // Capabilities not available, that's okay
      }

      // List folders to verify mailbox access
      imap.getBoxes((err, boxes) => {
        if (!err && boxes) {
          folders = Object.keys(boxes);
        }

        imap.end();
      });
    });

    // Handle successful end
    imap.once('end', () => {
      resolve({
        success: true,
        message: 'Successfully connected to IMAP server.',
        details: {
          serverBanner,
          capabilities: capabilities.slice(0, 10), // Limit to first 10
          folders: folders.slice(0, 5), // Limit to first 5 folders
        },
      });
    });

    // Handle errors
    imap.once('error', (err: Error) => {
      const errorMsg = err.message.toLowerCase();
      let errorType: IMAPTestResult['errorType'] = 'unknown';
      let userMessage = 'Connection failed. ';

      if (errorMsg.includes('econnrefused') || errorMsg.includes('enotfound')) {
        errorType = 'connection';
        userMessage += 'Could not reach the IMAP server. Check that Proton Bridge is running and the host/port are correct.';
      } else if (errorMsg.includes('etimedout') || errorMsg.includes('timeout')) {
        errorType = 'timeout';
        userMessage += 'Connection timed out. The server may be slow or unreachable.';
      } else if (errorMsg.includes('auth') || errorMsg.includes('login') || errorMsg.includes('credentials') || errorMsg.includes('invalid')) {
        errorType = 'auth';
        userMessage += 'Authentication failed. Check your username and bridge password.';
      } else if (errorMsg.includes('ssl') || errorMsg.includes('tls') || errorMsg.includes('certificate')) {
        errorType = 'connection';
        userMessage += 'TLS/SSL error. Check your connection security settings.';
      } else {
        userMessage += 'Please check your settings and try again.';
      }

      resolve({
        success: false,
        message: userMessage,
        error: err.message,
        errorType,
      });
    });

    // Capture server banner
    imap.once('alert', (msg: string) => {
      serverBanner = msg;
    });

    // Initiate connection
    try {
      imap.connect();
    } catch (connectErr) {
      resolve({
        success: false,
        message: 'Failed to initiate connection. Check host and port.',
        error: connectErr instanceof Error ? connectErr.message : 'Unknown',
        errorType: 'connection',
      });
    }
  });
}
