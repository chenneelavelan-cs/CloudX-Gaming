import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../core/services/domain.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { IconComponent } from '../../shared/components/icon.component';
import { validateRequiredFields } from '../../shared/utils/form-validation';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <a [routerLink]="backLink()" class="text-text-secondary text-sm mb-4 inline-flex items-center gap-1">
      <app-icon name="arrow_back" size="sm" />
      Back
    </a>

    <h1 class="page-heading">{{ isEdit() ? 'Edit Customer' : 'New Customer' }}</h1>

    <form (ngSubmit)="onSubmit()" class="space-y-4 max-w-lg">
      <div>
        <label class="label">Name</label>
        <input id="customer-form-name" class="input" [(ngModel)]="form.name" name="name" placeholder="Customer name" />
      </div>
      <div>
        <label class="label">Phone</label>
        <input id="customer-form-phone" class="input" [(ngModel)]="form.phone" name="phone" placeholder="Phone number" />
      </div>
      <div>
        <label class="label">Email (optional)</label>
        <input class="input" [(ngModel)]="form.email" name="email" type="email" placeholder="email@example.com" />
      </div>
      <div>
        <label class="label">Notes (optional)</label>
        <textarea class="input min-h-[96px]" [(ngModel)]="form.notes" name="notes" placeholder="Preferences, reminders..."></textarea>
      </div>
      <div>
        <label class="label">Tags (optional)</label>
        <input class="input" [(ngModel)]="form.tagsInput" name="tags" placeholder="vip, regular (comma separated)" />
      </div>

      <button type="submit" class="btn-primary w-full" [disabled]="submitting()">
        <app-icon name="save" size="sm" />
        {{ submitting() ? 'Saving...' : isEdit() ? 'Save Changes' : 'Create Customer' }}
      </button>
    </form>
  `,
})
export class CustomerFormComponent implements OnInit {
  private customerService = inject(CustomerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackbar = inject(SnackbarService);

  isEdit = signal(false);
  customerId = signal<string | null>(null);
  submitting = signal(false);

  form = {
    name: '',
    phone: '',
    email: '',
    notes: '',
    tagsInput: '',
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.customerId.set(id);
      this.customerService.getById(id).subscribe({
        next: (c) => {
          this.form.name = c.name;
          this.form.phone = c.phone;
          this.form.email = c.email || '';
          this.form.notes = c.notes || '';
          this.form.tagsInput = (c.tags || []).join(', ');
        },
        error: () => {
          this.snackbar.error('Customer not found');
          this.router.navigate(['/admin/customers']);
        },
      });
    }
  }

  backLink() {
    const id = this.customerId();
    return id ? `/admin/customers/${id}` : '/admin/customers';
  }

  onSubmit() {
    if (
      !validateRequiredFields(
        [
          { id: 'customer-form-name', label: 'Name', valid: () => !!this.form.name.trim() },
          { id: 'customer-form-phone', label: 'Phone', valid: () => !!this.form.phone.trim() },
        ],
        this.snackbar
      )
    ) {
      return;
    }

    const payload = {
      name: this.form.name.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim() || undefined,
      notes: this.form.notes.trim() || undefined,
      tags: this.form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    this.submitting.set(true);
    const id = this.customerId();
    const request = id ? this.customerService.update(id, payload) : this.customerService.create(payload);

    request.subscribe({
      next: (c) => {
        this.submitting.set(false);
        this.snackbar.success(id ? 'Customer updated' : 'Customer created');
        this.router.navigate(['/admin/customers', c._id]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackbar.error(err.error?.error || 'Failed to save customer');
      },
    });
  }
}
