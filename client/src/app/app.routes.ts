import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'book',
    loadComponent: () => import('./public/book/public-book.component').then((m) => m.PublicBookComponent),
  },

  // Admin login
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./admin/login/login.component').then((m) => m.AdminLoginComponent),
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./admin/bookings/bookings-list.component').then((m) => m.BookingsListComponent),
      },
      {
        path: 'bookings/new',
        loadComponent: () => import('./admin/bookings/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'bookings/:id/edit',
        loadComponent: () => import('./admin/bookings/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'gaming',
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingSessionsComponent),
      },
      {
        path: 'gaming/new',
        loadComponent: () => import('./admin/gaming/gaming-entry-form.component').then((m) => m.GamingEntryFormComponent),
      },
      {
        path: 'gaming/options',
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingOptionsListComponent),
      },
      {
        path: 'gaming/resources',
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingResourcesListComponent),
      },
      {
        path: 'gaming/pricing',
        loadComponent: () => import('./admin/pricing/pricing-list.component').then((m) => m.PricingListComponent),
      },
      {
        path: 'bills',
        loadComponent: () => import('./admin/bills/bills-list.component').then((m) => m.BillsListComponent),
      },
      {
        path: 'bills/new',
        loadComponent: () => import('./admin/bills/bill-form.component').then((m) => m.BillFormComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./admin/customers/customers-list.component').then((m) => m.CustomersListComponent),
      },
      {
        path: 'customers/new',
        loadComponent: () => import('./admin/customers/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'customers/:id/edit',
        loadComponent: () => import('./admin/customers/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./admin/customers/customer-detail.component').then((m) => m.CustomerDetailComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./admin/products/products-list.component').then((m) => m.ProductsListComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./admin/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'more',
        loadComponent: () => import('./admin/more/more.component').then((m) => m.MoreComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
