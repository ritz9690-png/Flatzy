// netlify/functions/send-otp.js
// Place this file at: netlify/functions/send-otp.js

exports.handler = async function (event, context) {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let phone;
  try {
    const body = JSON.parse(event.body);
    phone = body.phone;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  // Validate phone
  if (!phone || !/^\d{10}$/.test(phone)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid phone number' }) };
  }

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone
      })
    });

    const result = await response.json();
    console.log('Fast2SMS response:', JSON.stringify(result));

    if (result.return === true) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, otp: otp })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: result.message?.[0] || 'Fast2SMS failed', raw: result })
      };
    }

  } catch (err) {
    console.error('Fetch error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error: ' + err.message })
    };
  }
};
