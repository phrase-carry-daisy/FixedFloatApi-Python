/**
 * Crypto Exchange API Client - Bun.js Example
 *
 * This example demonstrates how to interact with the Crypto Exchange Backend API
 * using Bun.js with TypeScript support.
 *
 * Requirements:
 *   Bun runtime (https://bun.sh)
 *
 * Usage:
 *   bun run client_bun.ts
 */

// Configuration
const CONFIG = {
  baseUrl: Bun.env.API_BASE_URL || "http://localhost:12000",
  apiKey: Bun.env.API_KEY || "YOUR_API_KEY",
  apiSecret: Bun.env.API_SECRET || "YOUR_API_SECRET",
};

// Types
interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

interface Currency {
  code: string;
  name: string;
  network?: string;
  [key: string]: unknown;
}

interface ExchangeRate {
  from: { code: string; amount: string };
  to: { code: string; amount: string };
  rate: string;
  [key: string]: unknown;
}

interface Order {
  id: string;
  token: string;
  status: string;
  [key: string]: unknown;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
}

/**
 * Create HMAC-SHA256 signature for request body
 */
function createSignature(body: string): string {
  const encoder = new TextEncoder();
  const key = encoder.encode(CONFIG.apiSecret);
  const data = encoder.encode(body);

  const hmac = new Bun.CryptoHasher("sha256", key);
  hmac.update(data);
  return hmac.digest("hex");
}

/**
 * Serialize object with sorted keys for consistent signature
 */
function serializeBody(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = data[key];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Make authenticated API request
 */
async function makeRequest<T = unknown>(
  endpoint: string,
  data: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  const body = serializeBody(data);
  const signature = createSignature(body);

  const response = await fetch(`${CONFIG.baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": CONFIG.apiKey,
      "X-API-SIGN": signature,
    },
    body,
  });

  return response.json();
}

/**
 * Make unauthenticated GET request
 */
async function makeGetRequest<T = unknown>(
  endpoint: string
): Promise<ApiResponse<T> | T> {
  const response = await fetch(`${CONFIG.baseUrl}${endpoint}`);
  return response.json();
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Check API health status
 */
async function healthCheck(): Promise<HealthStatus> {
  return makeGetRequest<HealthStatus>("/health") as Promise<HealthStatus>;
}

/**
 * Get list of supported currencies
 */
async function getCurrencies(): Promise<ApiResponse<Currency[]>> {
  return makeRequest<Currency[]>("/api/v2/ccies", {});
}

/**
 * Get exchange rate for currency pair
 */
async function getExchangeRate(
  fromCcy: string,
  toCcy: string,
  amount: number,
  direction: "from" | "to" = "from",
  type: "fixed" | "float" = "fixed"
): Promise<ApiResponse<ExchangeRate>> {
  return makeRequest<ExchangeRate>("/api/v2/price", {
    fromCcy,
    toCcy,
    amount,
    direction,
    type,
  });
}

/**
 * Create exchange order
 */
async function createOrder(
  fromCcy: string,
  toCcy: string,
  amount: number,
  toAddress: string,
  direction: "from" | "to" = "from",
  type: "fixed" | "float" = "fixed"
): Promise<ApiResponse<Order>> {
  return makeRequest<Order>("/api/v2/create", {
    fromCcy,
    toCcy,
    amount,
    toAddress,
    direction,
    type,
  });
}

/**
 * Get order status
 */
async function getOrderStatus(
  orderId: string,
  token: string
): Promise<ApiResponse<Order>> {
  return makeRequest<Order>("/api/v2/order", {
    id: orderId,
    token,
  });
}

/**
 * Handle emergency situation
 */
async function handleEmergency(
  orderId: string,
  token: string,
  choice: "EXCHANGE" | "REFUND",
  address?: string
): Promise<ApiResponse<unknown>> {
  const data: Record<string, unknown> = { id: orderId, token, choice };
  if (address) {
    data.address = address;
  }
  return makeRequest("/api/v2/emergency", data);
}

/**
 * Subscribe to email notifications
 */
async function setEmailNotification(
  orderId: string,
  token: string,
  email: string
): Promise<ApiResponse<unknown>> {
  return makeRequest("/api/v2/setEmail", {
    id: orderId,
    token,
    email,
  });
}

/**
 * Get QR code for deposit address
 */
async function getQRCode(
  orderId: string,
  token: string
): Promise<ApiResponse<unknown>> {
  return makeRequest("/api/v2/qr", {
    id: orderId,
    token,
  });
}

/**
 * Get fixed exchange rates (public, no auth required)
 */
async function getFixedRates(): Promise<unknown> {
  return makeGetRequest("/api/rates/fixed");
}

/**
 * Get float exchange rates (public, no auth required)
 */
async function getFloatRates(): Promise<unknown> {
  return makeGetRequest("/api/rates/float");
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log("=== Crypto Exchange API - Bun.js Client ===\n");
  console.log(`Bun version: ${Bun.version}`);
  console.log(`API Base URL: ${CONFIG.baseUrl}\n`);

  // 1. Health Check
  console.log("1. Health Check:");
  try {
    const health = await healthCheck();
    console.log(JSON.stringify(health, null, 2));
  } catch (error) {
    console.log("Health check failed:", error);
  }
  console.log();

  // 2. Get Currencies
  console.log("2. Get Currencies:");
  try {
    const currencies = await getCurrencies();
    if (currencies.code === 0 && currencies.data) {
      console.log(`Found ${currencies.data.length} currencies`);
      console.log(
        "First 5:",
        currencies.data
          .slice(0, 5)
          .map((c) => c.code)
          .join(", ")
      );
    } else {
      console.log("Response:", JSON.stringify(currencies, null, 2));
    }
  } catch (error) {
    console.log("Get currencies failed:", error);
  }
  console.log();

  // 3. Get Exchange Rate
  console.log("3. Get Exchange Rate (BTC -> ETH):");
  try {
    const rate = await getExchangeRate("BTC", "ETH", 0.1, "from", "fixed");
    console.log(JSON.stringify(rate, null, 2));
  } catch (error) {
    console.log("Get exchange rate failed:", error);
  }
  console.log();

  // 4. Get Public Rates (no authentication required)
  console.log("4. Get Public Fixed Rates:");
  try {
    const fixedRates = await getFixedRates();
    console.log("Fixed rates response received");
    if (typeof fixedRates === "object" && fixedRates !== null) {
      const ratesObj = fixedRates as Record<string, unknown>;
      if ("data" in ratesObj && Array.isArray(ratesObj.data)) {
        console.log(`Found ${ratesObj.data.length} rate pairs`);
      }
    }
  } catch (error) {
    console.log("Get fixed rates failed:", error);
  }
  console.log();

  // 5. Example: Create Order (commented out to avoid actual order creation)
  /*
  console.log('5. Create Order:');
  const order = await createOrder(
    'BTC',
    'ETH',
    0.1,
    '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    'from',
    'fixed'
  );
  console.log(JSON.stringify(order, null, 2));

  if (order.code === 0 && order.data) {
    const { id, token } = order.data;

    // Get order status
    const status = await getOrderStatus(id, token);
    console.log('Order Status:', JSON.stringify(status, null, 2));

    // Set email notification
    const emailResult = await setEmailNotification(id, token, 'user@example.com');
    console.log('Email Notification:', JSON.stringify(emailResult, null, 2));

    // Get QR code
    const qr = await getQRCode(id, token);
    console.log('QR Code:', JSON.stringify(qr, null, 2));
  }
  */

  console.log("=== Done ===");
}

// Run main function
main().catch(console.error);

// Export functions for use as module
export {
  healthCheck,
  getCurrencies,
  getExchangeRate,
  createOrder,
  getOrderStatus,
  handleEmergency,
  setEmailNotification,
  getQRCode,
  getFixedRates,
  getFloatRates,
  createSignature,
  makeRequest,
  makeGetRequest,
};
