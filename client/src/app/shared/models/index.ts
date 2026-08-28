export interface User {
  userId: string;
  email: string;
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
  totalVisits: number;
  totalSpending: number;
  lastVisitAt?: string;
  createdAt?: string;
  activeMembership?: {
    _id: string;
    planName: string;
    expiryDate: string;
  } | null;
}

export interface CustomerHistory {
  customer: Customer;
  bookings: Booking[];
  gamingEntries: GamingEntry[];
  bills: Bill[];
  summary: {
    totalVisits: number;
    totalSpending: number;
    lastVisit?: string;
    bookingCount: number;
    gamingCount: number;
    billCount: number;
  };
}

export interface CustomerFormValue {
  linked: boolean;
  customerId?: string;
  name: string;
  phone: string;
}

export interface GamingOption {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  supportsPlayerPricing: boolean;
  membershipDiscountPercent?: number;
  minPlayers: number;
  maxPlayers: number;
  minDurationMinutes: number;
  isActive: boolean;
}

export interface GamingResource {
  _id: string;
  name: string;
  code: string;
  description?: string;
  supportedOptionIds: string[] | GamingOption[];
  capabilities?: {
    gpu?: string;
    hasDrivingSetup?: boolean;
    hasVR?: boolean;
  };
  isActive: boolean;
  available?: boolean;
}

export interface PricingTier {
  _id: string;
  gamingOptionId: string;
  playerCount?: number;
  durationMinutes: number;
  price: number;
  label?: string;
}

export interface PricingResult {
  price: number;
  strategy: string;
  breakdown: string;
}

export interface Booking {
  _id: string;
  referenceCode: string;
  customerId?: string | { _id: string };
  customerName: string;
  customerPhone: string;
  gamingOptionId: string | GamingOption;
  resourceId?: string | GamingResource;
  playerCount: number;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  suggestedPrice?: number;
  status: string;
  notes?: string;
}

export interface GamingEntry {
  _id: string;
  customerId?: string;
  customerName?: string;
  bookingId?: string;
  gamingOptionId: string | GamingOption;
  resourceId: string | GamingResource;
  playerCount: number;
  startedAt: string;
  expectedEndAt: string;
  endedAt?: string;
  durationMinutes: number;
  calculatedPrice: number;
  priceOverride?: number;
  finalPrice: number;
  status: 'active' | 'completed' | 'cancelled';
  urgency?: 'normal' | 'ending_soon' | 'almost_ended' | 'overdue';
  remainingMinutes?: number;
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  description?: string;
  mustTry?: boolean;
  price: number;
  isActive: boolean;
}

export interface ProductFormValue {
  name: string;
  category: string;
  description: string;
  mustTry: boolean;
  price: number | null;
}

export interface BillItem {
  type: 'gaming' | 'product' | 'combo' | 'custom';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  gamingEntryId?: string;
  gamingOptionId?: string;
  productId?: string;
  comboId?: string;
  playerCount?: number;
  durationMinutes?: number;
  calculatedPrice?: number;
  isPriceOverridden?: boolean;
}

export interface Bill {
  _id: string;
  billNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: 'paid' | 'cancelled';
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface DashboardStation {
  id: string;
  name: string;
  code: string;
  occupied: boolean;
  customerName?: string;
  expectedEndAt?: string;
  urgency?: 'normal' | 'ending_soon' | 'almost_ended' | 'overdue' | null;
}

export interface DashboardSummary {
  today: {
    revenue: number;
    billsPaid: number;
    activeSessions: number;
    sessions: number;
  };
  occupancy: {
    total: number;
    occupied: number;
    free: number;
    stations: DashboardStation[];
  };
  attention: {
    overdue: number;
    endingSoon: number;
    dueBookings: number;
  };
}

export interface ReportsOverview {
  period: { from: string; to: string };
  revenue: {
    total: number;
    gaming: number;
    products: number;
    billCount: number;
    avgBill: number;
  };
  comparison: {
    previousTotal: number;
    changePercent: number | null;
  };
  daily: { date: string; revenue: number; sessions: number }[];
  gaming: {
    sessionCount: number;
    totalHours: number;
    avgDurationMinutes: number;
    byOption: { name: string; count: number; hours: number }[];
  };
  customers: {
    total: number;
    newInPeriod: number;
    returning: number;
    avgSpend: number;
    top: { name: string; phone?: string; spend: number; bills: number }[];
  };
  products: { name: string; type: string; revenue: number; quantity: number }[];
  payments: { method: string; total: number; count: number }[];
}

export interface Settings {
  businessName: string;
  sessionExtensionOptions: number[];
  sessionWarningThresholds: {
    endingSoonMinutes: number;
    almostEndedMinutes: number;
  };
  billNumberPrefix?: string;
  taxEnabled?: boolean;
  taxPercentage?: number;
  operatingHours?: {
    open: string;
    close: string;
  };
}

export interface ComboItem {
  productId: string | Product;
  quantity: number;
}

export interface Combo {
  _id: string;
  name: string;
  description?: string;
  mustTry?: boolean;
  items: ComboItem[];
  price: number;
  isActive: boolean;
}

export interface ComboFormValue {
  name: string;
  description: string;
  mustTry: boolean;
  price: number | null;
  items: { productId: string; quantity: number }[];
}

export interface MembershipPlan {
  _id: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  isActive: boolean;
}
