import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectDatabase } from './config/database';
import { errorHandler } from './utils/errors';

import authRoutes from './modules/auth/auth.routes';
import settingsRoutes from './modules/settings/settings.routes';
import gamingOptionsRoutes, { resourcesRouter } from './modules/catalog/gaming.routes';
import pricingRoutes from './modules/catalog/pricing.routes';
import productsRoutes, { combosRouter } from './modules/catalog/products.routes';
import customersRoutes from './modules/customers/customers.routes';
import bookingsRoutes, { publicBookingRouter } from './modules/bookings/bookings.routes';
import gamingEntriesRoutes from './modules/gaming-entries/gaming-entries.routes';
import billsRoutes from './modules/billing/bills.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import publicRoutes from './modules/public/public.routes';
import membershipRoutes from './modules/membership/membership.routes';

const app = express();

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = express.Router();

api.use('/auth', authRoutes);
api.use('/settings', settingsRoutes);
api.use('/gaming-options', gamingOptionsRoutes);
api.use('/gaming-resources', resourcesRouter);
api.use('/pricing', pricingRoutes);
api.use('/products', productsRoutes);
api.use('/combos', combosRouter);
api.use('/customers', customersRoutes);
api.use('/bookings', bookingsRoutes);
api.use('/gaming-entries', gamingEntriesRoutes);
api.use('/bills', billsRoutes);
api.use('/analytics', analyticsRoutes);
api.use('/membership', membershipRoutes);
api.use('/public', publicRoutes);
api.use('/public/bookings', publicBookingRouter);

app.use('/api/v1', api);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`CloudX Gaming API running on http://localhost:${config.port}`);
  });
}

start().catch(console.error);

export default app;
