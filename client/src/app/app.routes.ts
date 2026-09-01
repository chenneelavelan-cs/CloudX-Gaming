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
        data: { title: 'Dashboard' },
        loadComponent: () => import('./admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'bookings',
        data: { title: 'Bookings' },
        loadComponent: () => import('./admin/bookings/bookings-list.component').then((m) => m.BookingsListComponent),
      },
      {
        path: 'bookings/new',
        data: { title: 'New Booking', subtitle: 'Reserve a station for later', backLink: '/admin/bookings' },
        loadComponent: () => import('./admin/bookings/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'bookings/:id/edit',
        data: { title: 'Edit Booking', subtitle: 'Update the reserved session', backLink: '/admin/bookings' },
        loadComponent: () => import('./admin/bookings/booking-form.component').then((m) => m.BookingFormComponent),
      },
      {
        path: 'gaming',
        data: { title: 'Gaming', subtitle: 'Sessions, setups & pricing' },
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingSessionsComponent),
      },
      {
        path: 'gaming/new',
        data: { title: 'Start Session', subtitle: 'Start a walk-in session now', backLink: '/admin/gaming' },
        loadComponent: () => import('./admin/gaming/gaming-entry-form.component').then((m) => m.GamingEntryFormComponent),
      },
      {
        path: 'gaming/options',
        data: { title: 'Gaming Options' },
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingOptionsListComponent),
      },
      {
        path: 'gaming/resources',
        data: { title: 'Resources' },
        loadComponent: () => import('./admin/settings/settings.component').then((m) => m.GamingResourcesListComponent),
      },
      {
        path: 'gaming/pricing',
        data: { title: 'Pricing', subtitle: 'Tap a category to expand and edit prices' },
        loadComponent: () => import('./admin/pricing/pricing-list.component').then((m) => m.PricingListComponent),
      },
      {
        path: 'bills',
        data: { title: 'Bills' },
        loadComponent: () => import('./admin/bills/bills-list.component').then((m) => m.BillsListComponent),
      },
      {
        path: 'bills/new',
        data: { title: 'New Bill', subtitle: 'Add items and collect payment', backLink: '/admin/bills' },
        loadComponent: () => import('./admin/bills/bill-form.component').then((m) => m.BillFormComponent),
      },
      {
        path: 'customers',
        data: { title: 'Customers' },
        loadComponent: () => import('./admin/customers/customers-list.component').then((m) => m.CustomersListComponent),
      },
      {
        path: 'customers/new',
        data: { title: 'New Customer', backLink: '/admin/customers' },
        loadComponent: () => import('./admin/customers/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'customers/:id/edit',
        data: { title: 'Edit Customer', backLink: '/admin/customers' },
        loadComponent: () => import('./admin/customers/customer-form.component').then((m) => m.CustomerFormComponent),
      },
      {
        path: 'customers/:id',
        data: { title: 'Customer', backLink: '/admin/customers' },
        loadComponent: () => import('./admin/customers/customer-detail.component').then((m) => m.CustomerDetailComponent),
      },
      {
        path: 'products',
        data: { title: 'Menu' },
        loadComponent: () => import('./admin/products/products-list.component').then((m) => m.ProductsListComponent),
      },
      {
        path: 'reports',
        data: { title: 'Reports' },
        loadComponent: () => import('./admin/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'more',
        data: { title: 'More' },
        loadComponent: () => import('./admin/more/more.component').then((m) => m.MoreComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
