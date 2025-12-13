# PayFast Integration Setup Guide

This guide explains how to set up PayFast payment integration for the OpenActive platform.

## Prerequisites

1. A PayFast merchant account (sign up at https://www.payfast.co.za/)
2. Access to your PayFast merchant dashboard to get credentials

## Database Setup

Run these SQL scripts in your Supabase SQL Editor (in order):

1. **CREATE_PAYMENTS_TABLE.sql** - Creates the Payments table to track transactions
2. **ADD_PAYMENT_FIELDS_TO_BOOKINGS.sql** - Adds payment fields to the Bookings table

## Environment Variables

Add these environment variables to your `.env.local` file (or your hosting platform's environment variables):

```env
# PayFast Configuration
PAYFAST_MERCHANT_ID=your_merchant_id_here
PAYFAST_MERCHANT_KEY=your_merchant_key_here
PAYFAST_PASSPHRASE=your_passphrase_here  # Optional: for secure signature generation
PAYFAST_SANDBOX=true  # Set to 'true' for testing, 'false' for production

# Application URL (for payment return/cancel URLs)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Getting PayFast Credentials

1. **Sandbox (Testing)**:
   - Go to https://sandbox.payfast.co.za/
   - Sign up for a test account
   - Get your test Merchant ID and Merchant Key from the dashboard

2. **Production**:
   - Go to https://www.payfast.co.za/
   - Sign up for a merchant account
   - Complete the verification process
   - Get your Merchant ID and Merchant Key from the merchant dashboard
   - Set up a passphrase (optional but recommended for security)

## PayFast Webhook Configuration

1. Log in to your PayFast merchant dashboard
2. Go to Settings → Integration → Instant Transaction Notifications (ITN)
3. Set the ITN URL to: `https://your-domain.com/api/payments/payfast/notify`
4. Enable ITN notifications

## How It Works

### Payment Flow

1. **User creates booking** → Booking is created with status 'pending' and paymentStatus 'pending'
2. **Payment initiation** → If payment is required (visitors or non-members), system creates a payment record
3. **Redirect to PayFast** → User is redirected to PayFast payment page
4. **Payment processing** → User completes payment on PayFast
5. **PayFast callback** → PayFast sends ITN (Instant Transaction Notification) to webhook
6. **Status update** → System updates payment and booking status based on PayFast response
7. **User redirect** → User is redirected back to your site with payment status

### Payment Statuses

- **pending**: Payment initiated but not yet processed
- **processing**: Payment is being processed by PayFast
- **completed**: Payment successful
- **failed**: Payment failed
- **cancelled**: Payment was cancelled by user
- **refunded**: Payment was refunded

## Testing

### Sandbox Testing

1. Set `PAYFAST_SANDBOX=true` in your environment variables
2. Use PayFast sandbox credentials
3. Use PayFast test card numbers:
   - **Card Number**: 5200 8282 8282 8210
   - **CVV**: Any 3 digits
   - **Expiry**: Any future date
   - **Name**: Any name

### Test Scenarios

- **Successful payment**: Complete payment with test card
- **Failed payment**: Use an invalid card or cancel payment
- **Webhook testing**: PayFast will send ITN notifications automatically

## Security Notes

1. **Never commit credentials**: Keep all PayFast credentials in environment variables
2. **Use passphrase**: Enable passphrase in PayFast dashboard for additional security
3. **Verify signatures**: All PayFast callbacks are verified using MD5 signature
4. **HTTPS required**: PayFast requires HTTPS for production (webhooks won't work on HTTP)

## Troubleshooting

### Payment not processing
- Check that environment variables are set correctly
- Verify PayFast credentials are correct
- Check PayFast dashboard for any account restrictions

### Webhook not receiving notifications
- Verify ITN URL is set correctly in PayFast dashboard
- Ensure your server is accessible from the internet (PayFast needs to reach your webhook)
- Check server logs for webhook errors
- Verify signature validation is working

### Payment status not updating
- Check webhook endpoint is receiving requests
- Verify database connection
- Check payment record exists in database
- Review server logs for errors

## API Endpoints

- **POST /api/payments/payfast/initiate** - Initiate a new payment
- **POST /api/payments/payfast/notify** - PayFast webhook endpoint (ITN)

## Database Tables

### Payments Table
Stores all payment transactions with PayFast details.

### Bookings Table
Extended with payment fields:
- `paymentId` - Links to Payments table
- `amount` - Booking amount
- `paymentStatus` - Payment status ('pending', 'paid', 'failed', 'refunded')

## Future Enhancements

- Stripe integration (planned)
- Payment refunds
- Payment history for users
- Admin payment management interface



