import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURACIÓN KIDO
// ============================================================================

const SUCURSALES = {
  midtown: { name: 'Midtown', city: 'Guadalajara', id: 'KDO-MID-01' },
  zapopan: { name: 'Zapopan', city: 'Zapopan', id: 'KDO-ZAP-01' },
  celaya: { name: 'Celaya', city: 'Celaya', id: 'KDO-CEL-01' },
  queretaro: { name: 'Querétaro (Uptown)', city: 'Querétaro', id: 'KDO-QRO-01' },
  qro: { name: 'Querétaro (Uptown)', city: 'Querétaro', id: 'KDO-QRO-01' },
  uptown: { name: 'Querétaro (Uptown)', city: 'Querétaro', id: 'KDO-QRO-01' },
};

const PAQUETES = [
  { ninos: 15, precio: 3500, id: 'PKG-15' },
  { ninos: 25, precio: 5000, id: 'PKG-25' },
  { ninos: 30, precio: 6000, id: 'PKG-30' },
];

const ANTICIPO_PORCENTAJE = 0.5;

// ============================================================================
// TIPOS
// ============================================================================

type IntentType = 'COTIZACION' | 'STATUS' | 'AYUDA' | 'DESCONOCIDO' | 'MENU';

interface ParsedIntent {
  tipo: IntentType;
  sucursal?: string;
  ninos?: number;
  fecha?: string;
  raw: string;
}

interface LedgerEntry {
  id: string;
  timestamp: string;
  waId: string;
  from: string;
  intent: IntentType;
  sucursal?: string;
  ninos?: number;
  paquete?: {
    id: string;
    ninos: number;
    precio: number;
    anticipo: number;
  };
  paymentLink?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  metadata: {
    originalMessage: string;
    processedAt: string;
  };
}

interface WhatsAppMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// ============================================================================
// WEBHOOK VERIFICATION (GET)
// ============================================================================

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'kido_webhook_secret_2024';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[KIDO WhatsApp] Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[KIDO WhatsApp] Webhook verification failed', { mode, token });
  return new NextResponse('Verification failed', { status: 403 });
}

// ============================================================================
// MAIN HANDLER (POST)
// ============================================================================

export async function POST(req: Request) {
  try {
    const body: WhatsAppMessage = await req.json();

    console.log('[KIDO WhatsApp] Received webhook:', JSON.stringify(body, null, 2));

    // Validate Meta payload
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process each entry and change
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        const message = value.messages[0];
        const from = message.from;
        const waId = value.contacts?.[0]?.wa_id || from;
        const contactName = value.contacts?.[0]?.profile?.name || 'Cliente';

        // Only process text messages
        if (message.type !== 'text' || !message.text?.body) {
          console.log('[KIDO WhatsApp] Ignoring non-text message:', message.type);
          continue;
        }

        const text = message.text.body;
        console.log(`[KIDO WhatsApp] Message from ${contactName} (${from}): ${text}`);

        // Parse intent
        const intent = parseIntent(text);

        // Handle based on intent
        let response: string;
        let ledgerEntry: LedgerEntry | null = null;

        switch (intent.tipo) {
          case 'COTIZACION':
            const result = await handleCotizacion(intent, from, waId, text);
            response = result.response;
            ledgerEntry = result.ledgerEntry;
            break;

          case 'STATUS':
            response = await handleStatus(from);
            break;

          case 'AYUDA':
          case 'MENU':
            response = generateMenuResponse();
            break;

          default:
            response = generateUnknownResponse();
        }

        // Save to ledger if we have an entry
        if (ledgerEntry) {
          await saveToLedger(ledgerEntry);
        }

        // Log interaction
        await logInteraction({
          timestamp: new Date().toISOString(),
          from,
          waId,
          contactName,
          message: text,
          intent: intent.tipo,
          response,
        });

        // Return response for WhatsApp API to send
        return NextResponse.json({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: from,
          type: 'text',
          text: { body: response },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[KIDO WhatsApp] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// NLP - PARSE INTENT
// ============================================================================

function parseIntent(text: string): ParsedIntent {
  const lowerText = text.toLowerCase();
  const raw = text;

  // Detect intent type
  let tipo: IntentType = 'DESCONOCIDO';

  const cotizacionKeywords = [
    'cotizar', 'cotización', 'cotizacion', 'precio', 'cuanto', 'cuánto',
    'costo', 'paquete', 'reservar', 'reservación', 'reservacion',
    'fiesta', 'cumpleaños', 'cumple', 'celebrar', 'evento'
  ];

  const statusKeywords = [
    'status', 'estatus', 'estado', 'mi reserva', 'mi pedido',
    'seguimiento', 'dónde está', 'donde esta', 'confirmación',
    'confirmacion', 'ticket'
  ];

  const ayudaKeywords = [
    'ayuda', 'help', 'menú', 'menu', 'opciones', 'qué puedes hacer',
    'que puedes hacer', 'información', 'informacion', 'info'
  ];

  if (cotizacionKeywords.some(k => lowerText.includes(k))) {
    tipo = 'COTIZACION';
  } else if (statusKeywords.some(k => lowerText.includes(k))) {
    tipo = 'STATUS';
  } else if (ayudaKeywords.some(k => lowerText.includes(k))) {
    tipo = 'AYUDA';
  }

  // Extract sucursal
  let sucursal: string | undefined;
  for (const [key, data] of Object.entries(SUCURSALES)) {
    if (lowerText.includes(key)) {
      sucursal = data.name;
      break;
    }
  }

  // Extract number of kids
  let ninos: number | undefined;

  // Look for patterns like "15 niños", "25 ninos", "para 30"
  const ninosPatterns = [
    /(\d+)\s*(?:niños|ninos|niñas|ninas|niño|nino|niña|nina)/i,
    /(?:para|son|somos|seremos)\s*(\d+)/i,
    /(\d+)\s*(?:personas|invitados|niños|niñas|kids)/i,
    /paquete\s*(?:de\s*)?(\d+)/i,
  ];

  for (const pattern of ninosPatterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 100) {
        ninos = num;
        break;
      }
    }
  }

  // Extract fecha (simple pattern matching)
  let fecha: string | undefined;
  const fechaPatterns = [
    /(?:el|para el|fecha|día|dia)\s*(\d{1,2}\s*(?:de\s*)?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|\d{1,2}))/i,
    /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/,
  ];

  for (const pattern of fechaPatterns) {
    const match = text.match(pattern);
    if (match) {
      fecha = match[1];
      break;
    }
  }

  return { tipo, sucursal, ninos, fecha, raw };
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleCotizacion(
  intent: ParsedIntent,
  from: string,
  waId: string,
  originalMessage: string
): Promise<{ response: string; ledgerEntry: LedgerEntry }> {
  // Determine paquete
  let paqueteSeleccionado = PAQUETES[1]; // Default to 25 kids

  if (intent.ninos) {
    if (intent.ninos <= 15) {
      paqueteSeleccionado = PAQUETES[0];
    } else if (intent.ninos <= 25) {
      paqueteSeleccionado = PAQUETES[1];
    } else {
      paqueteSeleccionado = PAQUETES[2];
    }
  }

  // Determine sucursal
  const sucursal = intent.sucursal || 'Midtown (Guadalajara)';

  // Generate mock payment link
  const paymentLink = generateMockPaymentLink(waId, paqueteSeleccionado.id);

  // Calculate anticipo
  const anticipo = Math.round(paqueteSeleccionado.precio * ANTICIPO_PORCENTAJE);

  // Create ledger entry
  const ledgerEntry: LedgerEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    waId,
    from,
    intent: 'COTIZACION',
    sucursal,
    ninos: intent.ninos || paqueteSeleccionado.ninos,
    paquete: {
      id: paqueteSeleccionado.id,
      ninos: paqueteSeleccionado.ninos,
      precio: paqueteSeleccionado.precio,
      anticipo,
    },
    paymentLink,
    status: 'PENDING',
    metadata: {
      originalMessage,
      processedAt: new Date().toISOString(),
    },
  };

  // Generate response
  const response = `🎉 *Cotización KIDO*

📍 *Sucursal:* ${sucursal}
👥 *Paquete:* ${paqueteSeleccionado.ninos} niños
💰 *Precio:* $${paqueteSeleccionado.precio.toLocaleString()} MXN
💳 *Anticipo (50%):* $${anticipo.toLocaleString()} MXN

${intent.fecha ? `📅 *Fecha solicitada:* ${intent.fecha}\n` : ''}
Para confirmar tu reserva, realiza el anticipo aquí:
🔗 ${paymentLink}

Una vez realizado el pago, recibirás confirmación de disponibilidad en máximo 24hrs.

¿Tienes alguna pregunta? Escribe *AYUDA* para ver opciones.`;

  return { response, ledgerEntry };
}

async function handleStatus(from: string): Promise<string> {
  // In a real implementation, query the ledger for this user's reservations
  return `📋 *Estado de tu Reserva*

Buscando reservas asociadas a tu número...

Por el momento no encontramos reservas activas.

Para hacer una nueva cotización, envía:
"Cotizar en [sucursal] para [cantidad] niños"

Ejemplo: "Cotizar en Zapopan para 25 niños"`;
}

function generateMenuResponse(): string {
  return `🎪 *KIDO - Menú Principal*

*¿Qué puedo hacer por ti?*

1️⃣ *COTIZACIÓN*
   Envía: "Cotizar en [sucursal] para [#] niños"
   Ejemplo: "Cotizar en Celaya para 15 niños"

2️⃣ *CONSULTAR ESTADO*
   Envía: "Status" o "Mi reserva"

3️⃣ *SUCURSALES DISPONIBLES:*
   • Midtown (Guadalajara)
   • Zapopan
   • Celaya
   • Querétaro (Uptown)

4️⃣ *PAQUETES:*
   • 15 niños - $3,500
   • 25 niños - $5,000
   • 30 niños - $6,000

💳 *Anticipo:* 50% para confirmar reserva

¿En qué sucursal te gustaría celebrar? 🎂`;
}

function generateUnknownResponse(): string {
  return `🤔 No entendí muy bien...

Puedo ayudarte con:
• Cotizaciones de fiestas
• Consultar el estado de tu reserva
• Información de nuestras sucursales

Escribe *AYUDA* para ver el menú completo o envía tu consulta de forma clara.

Ejemplo: "Cotizar en Midtown para 25 niños"`;
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateMockPaymentLink(waId: string, paqueteId: string): string {
  // Mock payment link - will be replaced with real Ignum Pay integration
  const baseUrl = process.env.PAYMENT_BASE_URL || 'https://pay.kido.mx';
  const token = Buffer.from(`${waId}:${paqueteId}:${Date.now()}`).toString('base64');
  return `${baseUrl}/pay/${token.substring(0, 20)}`;
}

function generateId(): string {
  return `KDO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

async function saveToLedger(entry: LedgerEntry): Promise<void> {
  try {
    const ledgerDir = join(process.cwd(), 'data', 'ledger');
    const ledgerFile = join(ledgerDir, 'kido-reservations.json');

    // Ensure directory exists
    await fs.mkdir(ledgerDir, { recursive: true });

    // Read existing entries or create new array
    let entries: LedgerEntry[] = [];
    try {
      const existing = await fs.readFile(ledgerFile, 'utf-8');
      entries = JSON.parse(existing);
    } catch {
      // File doesn't exist yet, start fresh
    }

    // Add new entry
    entries.push(entry);

    // Write back
    await fs.writeFile(ledgerFile, JSON.stringify(entries, null, 2));

    console.log(`[KIDO Ledger] Entry saved: ${entry.id}`);
  } catch (error) {
    console.error('[KIDO Ledger] Error saving entry:', error);
    throw error;
  }
}

async function logInteraction(log: {
  timestamp: string;
  from: string;
  waId: string;
  contactName: string;
  message: string;
  intent: IntentType;
  response: string;
}): Promise<void> {
  try {
    const logsDir = join(process.cwd(), 'data', 'logs');
    const logFile = join(logsDir, `whatsapp-${new Date().toISOString().split('T')[0]}.jsonl`);

    await fs.mkdir(logsDir, { recursive: true });
    await fs.appendFile(logFile, JSON.stringify(log) + '\n');
  } catch (error) {
    console.error('[KIDO Logs] Error logging interaction:', error);
  }
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

// export { parseIntent, generateMockPaymentLink }; // Comentado para build
