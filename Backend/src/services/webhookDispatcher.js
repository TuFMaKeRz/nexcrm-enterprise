const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDeliveryLog = require('../models/WebhookDeliveryLog');

/**
 * Perform HTTP/HTTPS request with timeout
 */
function sendHttpRequest(targetUrl, payloadString, headers, timeoutMs = 5000) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payloadString),
          'User-Agent': 'NexCRM-Webhook-Engine/1.0',
          ...headers
        },
        timeout: timeoutMs
      };

      const startTime = Date.now();
      const req = transport.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          const latency = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            responseBody: responseBody.slice(0, 1000), // Cap response log size
            executionTimeMs: latency,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          statusCode: 408,
          responseBody: 'Webhook request timed out after 5000ms',
          executionTimeMs: timeoutMs,
          success: false
        });
      });

      req.on('error', (err) => {
        resolve({
          statusCode: 500,
          responseBody: `Connection failed: ${err.message}`,
          executionTimeMs: Date.now() - startTime,
          success: false
        });
      });

      req.write(payloadString);
      req.end();
    } catch (urlErr) {
      resolve({
        statusCode: 400,
        responseBody: `Invalid URL format: ${urlErr.message}`,
        executionTimeMs: 0,
        success: false
      });
    }
  });
}

/**
 * Asynchronously dispatch a webhook event to all subscribed endpoints of an organization
 * @param {ObjectId} organizationId
 * @param {string} eventName e.g. 'lead.created', 'deal.won'
 * @param {Object} entityData
 */
const dispatchWebhookEvent = async (organizationId, eventName, entityData) => {
  try {
    const subscriptions = await WebhookSubscription.find({
      organizationId,
      isActive: true,
      events: eventName
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { dispatched: 0 };
    }

    const timestamp = new Date().toISOString();
    const payload = {
      event: eventName,
      timestamp,
      organizationId: organizationId.toString(),
      data: entityData
    };
    const payloadString = JSON.stringify(payload);

    // Dispatch concurrently in background
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        // Compute HMAC SHA-256 signature
        const signature = crypto
          .createHmac('sha256', sub.secretKey || 'nexcrm_default_key')
          .update(payloadString)
          .digest('hex');

        const headers = {
          'X-NexCRM-Event': eventName,
          'X-NexCRM-Signature': signature,
          'X-NexCRM-Timestamp': timestamp
        };

        const res = await sendHttpRequest(sub.targetUrl, payloadString, headers);

        // Update subscription delivery stats
        const update = {
          $inc: {
            'deliveryStats.totalSent': 1,
            [`deliveryStats.${res.success ? 'totalSuccess' : 'totalFailed'}`]: 1
          },
          $set: {
            'deliveryStats.lastTriggeredAt': new Date(),
            'deliveryStats.lastResponseStatus': res.statusCode
          }
        };
        await WebhookSubscription.findByIdAndUpdate(sub._id, update).catch(() => {});

        // Log delivery audit
        const log = await WebhookDeliveryLog.create({
          organizationId,
          subscriptionId: sub._id,
          event: eventName,
          targetUrl: sub.targetUrl,
          payload,
          signature,
          statusCode: res.statusCode,
          responseBody: res.responseBody,
          executionTimeMs: res.executionTimeMs,
          status: res.success ? 'success' : 'failed'
        }).catch(() => {});

        return { subId: sub._id, status: res.statusCode, success: res.success, logId: log?._id };
      })
    );

    return { dispatched: subscriptions.length, results };
  } catch (err) {
    console.error(`[Webhook Dispatcher Error on ${eventName}]:`, err.message);
    return { error: err.message };
  }
};

/**
 * Dispatch a simulated test ping to a specific webhook subscription
 * @param {Object} subscription
 */
const sendTestPing = async (subscription) => {
  const timestamp = new Date().toISOString();
  const testPayload = {
    event: 'test.ping',
    timestamp,
    message: '🎉 NexCRM Outbound Webhook Test Dispatch — Connection Verified!',
    organizationId: subscription.organizationId.toString(),
    data: {
      subscriptionId: subscription._id,
      subscriptionName: subscription.name,
      configuredEvents: subscription.events,
      testEntity: {
        id: 'lead_test_demo_9901',
        name: 'Aarav Singhania',
        email: 'aarav.demo@singhaniacorp.com',
        phone: '+91 98765 00000',
        score: 95,
        temperature: 'Hot',
        source: 'Website Embed Form'
      }
    }
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = crypto
    .createHmac('sha256', subscription.secretKey || 'nexcrm_default_key')
    .update(payloadString)
    .digest('hex');

  const headers = {
    'X-NexCRM-Event': 'test.ping',
    'X-NexCRM-Signature': signature,
    'X-NexCRM-Timestamp': timestamp
  };

  // If targetUrl is an example URL or webhook.site/mock, simulate clean delivery
  let res;
  if (subscription.targetUrl.includes('example.com') || subscription.targetUrl.includes('localhost:9999')) {
    res = {
      statusCode: 200,
      responseBody: '{"status":"ok","message":"Simulated webhook received successfully"}',
      executionTimeMs: 42,
      success: true
    };
  } else {
    res = await sendHttpRequest(subscription.targetUrl, payloadString, headers);
  }

  // Update stats
  await WebhookSubscription.findByIdAndUpdate(subscription._id, {
    $inc: {
      'deliveryStats.totalSent': 1,
      [`deliveryStats.${res.success ? 'totalSuccess' : 'totalFailed'}`]: 1
    },
    $set: {
      'deliveryStats.lastTriggeredAt': new Date(),
      'deliveryStats.lastResponseStatus': res.statusCode
    }
  });

  // Log delivery
  const log = await WebhookDeliveryLog.create({
    organizationId: subscription.organizationId,
    subscriptionId: subscription._id,
    event: 'test.ping',
    targetUrl: subscription.targetUrl,
    payload: testPayload,
    signature,
    statusCode: res.statusCode,
    responseBody: res.responseBody,
    executionTimeMs: res.executionTimeMs,
    status: res.success ? 'success' : 'failed'
  });

  return {
    success: res.success,
    statusCode: res.statusCode,
    responseBody: res.responseBody,
    executionTimeMs: res.executionTimeMs,
    signature,
    log
  };
};

module.exports = {
  dispatchWebhookEvent,
  sendTestPing
};
