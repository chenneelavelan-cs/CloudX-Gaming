import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from './api.service';
import {
  GamingOption,
  GamingResource,
  PricingResult,
  Product,
  PricingTier,
  Customer,
  CustomerHistory,
  Booking,
  GamingEntry,
  Bill,
  Combo,
  DashboardSummary,
  MembershipPlan,
  ReportsOverview,
  PaginatedResponse,
} from '../../shared/models';
import { normalizePaginatedResponse } from '../../shared/utils/pagination';

@Injectable({ providedIn: 'root' })
export class GamingService {
  private api = inject(ApiService);

  getOptions() {
    return this.api.get<GamingOption[]>('/gaming-options');
  }

  getAllOptions() {
    return this.api.get<GamingOption[]>('/gaming-options', { active: 'false' });
  }

  updateOption(id: string, data: Partial<Pick<GamingOption, 'isActive' | 'membershipDiscountPercent'>>) {
    return this.api.patch<GamingOption>(`/gaming-options/${id}`, data);
  }

  getResources(optionId?: string) {
    return this.api.get<GamingResource[]>('/gaming-resources', optionId ? {} : {});
  }

  getAvailableResources(optionId: string, start: string, end: string) {
    return this.api.get<GamingResource[]>('/bookings/availability', { optionId, start, end });
  }

  calculatePrice(gamingOptionId: string, playerCount: number, durationMinutes: number) {
    return this.api.post<PricingResult>('/pricing/calculate', {
      gamingOptionId,
      playerCount,
      durationMinutes,
    });
  }

  getActiveSessions() {
    return this.api.get<GamingEntry[]>('/gaming-entries', { status: 'active' });
  }

  createGamingEntry(data: Record<string, unknown>) {
    return this.api.post<GamingEntry>('/gaming-entries', data);
  }

  extendSession(id: string, additionalMinutes: number) {
    return this.api.post<{ entry: GamingEntry; pricing: PricingResult }>(`/gaming-entries/${id}/extend`, {
      additionalMinutes,
    });
  }

  endSession(id: string) {
    return this.api.post<GamingEntry>(`/gaming-entries/${id}/end`, {});
  }

  getBillDraft(id: string) {
    return this.api.post<Record<string, unknown>>(`/gaming-entries/${id}/create-bill-draft`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private api = inject(ApiService);

  search(q: string, page = 1, limit = 50, membership?: 'active' | 'none') {
    const params: Record<string, string> = {
      q,
      page: String(page),
      limit: String(limit),
    };
    if (membership) params['membership'] = membership;
    return this.api
      .get<PaginatedResponse<Customer> | Customer[]>('/customers', params)
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }

  getById(id: string) {
    return this.api.get<Customer>(`/customers/${id}`);
  }

  create(data: Partial<Customer>) {
    return this.api.post<Customer>('/customers', data);
  }

  update(id: string, data: Partial<Customer>) {
    return this.api.patch<Customer>(`/customers/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<{ success: boolean }>(`/customers/${id}`);
  }

  getHistory(id: string) {
    return this.api.get<CustomerHistory>(`/customers/${id}/history`);
  }

  getBookings(id: string, page = 1, limit = 20) {
    return this.api
      .get<PaginatedResponse<Booking> | Booking[]>(`/customers/${id}/bookings`, {
        page: String(page),
        limit: String(limit),
      })
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }

  getSessions(id: string, page = 1, limit = 20) {
    return this.api
      .get<PaginatedResponse<GamingEntry> | GamingEntry[]>(`/customers/${id}/sessions`, {
        page: String(page),
        limit: String(limit),
      })
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }

  getBills(id: string, page = 1, limit = 20) {
    return this.api
      .get<PaginatedResponse<Bill> | Bill[]>(`/customers/${id}/bills`, {
        page: String(page),
        limit: String(limit),
      })
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = inject(ApiService);

  getAll(params?: Record<string, string>, page = 1, limit = 20) {
    return this.api
      .get<PaginatedResponse<Booking> | Booking[]>('/bookings', {
        ...params,
        page: String(page),
        limit: String(limit),
      })
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }

  getById(id: string) {
    return this.api.get<Booking>(`/bookings/${id}`);
  }

  create(data: Record<string, unknown>) {
    return this.api.post<Booking>('/bookings', data);
  }

  update(id: string, data: Record<string, unknown>) {
    return this.api.patch<Booking>(`/bookings/${id}`, data);
  }

  cancel(id: string) {
    return this.api.patch<Booking>(`/bookings/${id}`, { status: 'cancelled' });
  }

  markNoShow(id: string) {
    return this.api.patch<Booking>(`/bookings/${id}`, { status: 'no_show' });
  }

  startGaming(id: string) {
    return this.api.post<GamingEntry>(`/bookings/${id}/start-gaming`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class BillService {
  private api = inject(ApiService);

  getAll(params?: Record<string, string>, page = 1, limit = 20) {
    return this.api
      .get<PaginatedResponse<Bill> | Bill[]>('/bills', {
        ...params,
        page: String(page),
        limit: String(limit),
      })
      .pipe(map((res) => normalizePaginatedResponse(res, page, limit)));
  }

  create(data: Record<string, unknown>) {
    return this.api.post<Bill>('/bills', data);
  }
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  private api = inject(ApiService);

  getTiers(optionId?: string) {
    return this.api.get<PricingTier[]>('/pricing/tiers', optionId ? { optionId } : {});
  }

  updateTier(id: string, data: Partial<Pick<PricingTier, 'price' | 'label' | 'durationMinutes' | 'playerCount'>>) {
    return this.api.patch<PricingTier>(`/pricing/tiers/${id}`, data);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = inject(ApiService);

  getAll(category?: string) {
    return this.api.get<Product[]>('/products', category ? { category } : {});
  }

  getGroups() {
    return this.api.get<string[]>('/products/groups');
  }

  create(data: Partial<Product>) {
    return this.api.post<Product>('/products', data);
  }

  update(id: string, data: Partial<Product>) {
    return this.api.patch<Product>(`/products/${id}`, data);
  }

  delete(id: string) {
    return this.api.patch<Product>(`/products/${id}`, { isActive: false });
  }
}

@Injectable({ providedIn: 'root' })
export class ComboService {
  private api = inject(ApiService);

  getAll() {
    return this.api.get<Combo[]>('/combos', { active: 'false' });
  }

  create(data: { name: string; description?: string; price: number; items: { productId: string; quantity: number }[] }) {
    return this.api.post<Combo>('/combos', data);
  }

  update(id: string, data: Partial<{ name: string; description?: string; price: number; items: { productId: string; quantity: number }[]; isActive: boolean }>) {
    return this.api.patch<Combo>(`/combos/${id}`, data);
  }

  deactivate(id: string) {
    return this.api.patch<Combo>(`/combos/${id}`, { isActive: false });
  }
}

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private api = inject(ApiService);

  getPlans() {
    return this.api.get<MembershipPlan[]>('/membership/plans');
  }

  assign(customerId: string, planId: string) {
    return this.api.post<{ _id: string; planId: MembershipPlan }>(`/membership/customers/${customerId}`, { planId });
  }

  remove(customerId: string) {
    return this.api.delete<{ success: boolean }>(`/membership/customers/${customerId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = inject(ApiService);

  getDashboard() {
    return this.api.get<DashboardSummary>('/analytics/dashboard');
  }

  getOverview(from: string, to: string) {
    return this.api.get<ReportsOverview>('/analytics/overview', { from, to });
  }
}

@Injectable({ providedIn: 'root' })
export class PublicService {
  private api = inject(ApiService);

  getOptions() {
    return this.api.get<GamingOption[]>('/public/gaming-options');
  }

  getProducts() {
    return this.api.get<Product[]>('/public/products');
  }

  getPricing(optionId?: string) {
    return this.api.get<unknown[]>('/public/pricing', optionId ? { optionId } : {});
  }

  createBooking(data: Record<string, unknown>) {
    return this.api.post<Booking>('/bookings', { ...data, source: 'customer' });
  }
}
