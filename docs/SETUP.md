# Setup Guide

## Complete Setup Instructions

### 1. Supabase Setup

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and API keys

2. **Run Database Migrations**
   - Navigate to SQL Editor in Supabase Dashboard
   - Or use the v0 script runner
   - Run scripts in order:
     - `scripts/001_create_tables.sql`
     - `scripts/002_enable_rls.sql`
   - `scripts/003_create_profile_trigger.sql`
   - `scripts/004_seed_data.sql` (optional - adds sample data)
   - `scripts/005_add_email_verification.sql` (required for existing databases)
   - `scripts/006_add_magic_link.sql` (required for passwordless login)

3. **Configure Authentication**
   - Go to Authentication > Settings
   - Enable Email authentication
   - Configure email templates (optional)
   - Set Site URL to your app URL

### 2. Environment Setup

**Frontend (.env.local):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Backend (backend/.env):**

```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SECRET_KEY=generate-a-random-secret-key
CORS_ORIGINS=["http://localhost:3000"]
APP_URL=http://localhost:3000
ABA_PAYWAY_MERCHANT_ID=your-merchant-id
ABA_PAYWAY_API_KEY=your-api-key
ABA_PAYWAY_API_URL=https://checkout-sandbox.payway.com.kh/api
ABA_PAYWAY_CHECKOUT_PATH=/payments/purchase
ABA_PAYWAY_WEBHOOK_PATH=/api/payments/webhook/payway
ABA_PAYWAY_WEBHOOK_SECRET=your-webhook-signing-secret
ABA_PAYWAY_RETURN_URL=http://localhost:3000/payments
ABA_PAYWAY_CANCEL_URL=http://localhost:3000/payments
```

### 3. Install Dependencies

**Frontend:**

```bash
npm install
```

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run the Application

**Start Frontend:**

```bash
npm run dev
```

**Start Backend:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 5. Create Test Users

1. Go to http://localhost:3000/auth/signup
2. Create an admin user
3. Go to Supabase Dashboard > Authentication > Users
4. Update the user's metadata to include `"role": "admin"`
5. Create staff and customer users similarly

### 6. Seed Data (Optional)

Run the seed data script to populate with sample services:

```sql
-- scripts/004_seed_data.sql
```

Or create services manually through the admin dashboard.

### 7. Configure ABA Payway (Production)

For production ABA Payway integration:

1. Get credentials from ABA Bank
2. Update `backend/app/core/config.py` with real credentials
3. Implement actual API calls in `backend/app/api/payments.py`
4. Test in sandbox environment first

### 8. Email/SMS Setup (Optional)

To enable real notifications:

1. Choose email provider (SendGrid, AWS SES, etc.)
2. Choose SMS provider (Twilio, AWS SNS, etc.)
3. Update `backend/app/api/notifications.py`
4. Add API credentials to environment variables

### Passwordless Login (Optional)

The backend supports passwordless login via magic link emails. To enable it:

1. Configure SMTP settings in `backend/.env`
2. Ensure `APP_URL` is set (used for the login link)
3. Run `scripts/006_add_magic_link.sql` on existing databases

### 9. Production Deployment

**Frontend (Vercel):**

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Backend (Railway/Render):**

1. Create new service
2. Connect GitHub repository
3. Set environment variables
4. Deploy

**Database:**

- Supabase is already hosted
- Upgrade to paid plan for production
- Configure custom domain (optional)

## Troubleshooting

### Database Connection Issues

- Check DATABASE_URL is correct
- Ensure Supabase project is not paused
- Verify firewall/network settings

### Authentication Errors

- Verify Supabase keys are correct
- Check email confirmation settings
- Review RLS policies

### API Connection Issues

- Ensure backend is running on port 8000
- Check CORS configuration
- Verify NEXT_PUBLIC_API_URL is correct

### Payment Processing Issues

- Check ABA Payway credentials
- Review payment API logs
- Verify webhook configuration

## Next Steps

After setup:

1. Customize the design to match your brand
2. Add your actual services
3. Configure staff availability
4. Test the complete booking flow
5. Set up monitoring and logging
6. Configure backup procedures
