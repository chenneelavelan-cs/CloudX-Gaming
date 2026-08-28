import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/domain.service';
import { ReportsOverview } from '../../shared/models';
import { InrPipe, DurationPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { LoadingStateComponent, TabsSlidingDirective, NumberPopInComponent } from '../../shared/transitions';

type ReportPreset = 'month' | '7d' | 'lifetime';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, InrPipe, DurationPipe, IconComponent, LoadingStateComponent, TabsSlidingDirective, NumberPopInComponent],
  template: `
    <h1 class="page-heading mb-3">Reports</h1>

    <div
      class="t-tabs mb-6 app-tabs"
      role="tablist"
      [tTabsActiveIndex]="presetIndex()"
    >
      <span class="t-tabs-pill" aria-hidden="true"></span>
      @for (preset of presets; track preset.id; let i = $index) {
        <button
          type="button"
          class="t-tab text-xs uppercase tracking-nav whitespace-nowrap"
          role="tab"
          [attr.aria-selected]="period() === preset.id"
          (click)="setPeriod(preset.id)"
        >
          {{ preset.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <app-loading-state mode="matrix" label="Loading report…" />
    } @else {
      @if (data(); as report) {
      <section class="card mb-5">
        <p class="text-text-muted text-[10px] uppercase tracking-caption">Revenue</p>
        <div class="flex items-end justify-between gap-3 mt-1">
          <p class="text-3xl font-semibold text-accent tabular-nums"><app-number-pop-in [value]="report.revenue.total | inr" /></p>
          @if (report.comparison.changePercent !== null) {
            <p
              class="text-sm font-semibold mb-1"
              [class.text-status-active]="report.comparison.changePercent >= 0"
              [class.text-status-danger]="report.comparison.changePercent < 0"
            >
              {{ report.comparison.changePercent >= 0 ? '+' : '' }}{{ report.comparison.changePercent }}%
              <span class="text-text-muted font-medium">vs prior</span>
            </p>
          }
        </div>
        <div class="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border-subtle text-sm">
          <div>
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Gaming</p>
            <p class="font-semibold mt-0.5">{{ report.revenue.gaming | inr }}</p>
          </div>
          <div>
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Food & drinks</p>
            <p class="font-semibold mt-0.5">{{ report.revenue.products | inr }}</p>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="stat-card">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Avg bill</p>
          <p class="text-lg font-semibold">{{ report.revenue.avgBill | inr }}</p>
        </div>
        <div class="stat-card">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Sessions</p>
          <p class="text-lg font-semibold">{{ report.gaming.sessionCount }}</p>
        </div>
        <div class="stat-card">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Hours played</p>
          <p class="text-lg font-semibold">{{ report.gaming.totalHours }}h</p>
        </div>
        <div class="stat-card">
          <p class="text-text-muted text-[10px] uppercase tracking-caption">Avg session</p>
          <p class="text-lg font-semibold">{{ report.gaming.avgDurationMinutes | duration }}</p>
        </div>
      </div>

      <section class="mb-8">
        <h2 class="section-heading mb-3">{{ chartHeading() }}</h2>
        @if (maxRevenue() === 0) {
          <div class="card text-center py-8 text-text-muted text-sm">No revenue in this period</div>
        } @else {
          <div class="card">
            <div class="flex items-end gap-0.5 h-36">
              @for (day of report.daily; track day.date) {
                <div class="flex-1 flex flex-col justify-end items-center h-full min-w-0">
                  <div
                    class="w-full rounded-t min-h-[3px] transition-all"
                    [ngClass]="day.revenue > 0 ? 'bg-accent' : 'bg-white/10'"
                    [style.height]="barHeight(day.revenue)"
                    [attr.title]="barTitle(day.date, day.revenue)"
                  ></div>
                </div>
              }
            </div>
            <div class="flex gap-0.5 mt-2">
              @for (day of report.daily; track day.date) {
                <div class="flex-1 text-center min-w-0">
                  @if (showChartLabel($index, report.daily.length)) {
                    <p class="text-[9px] text-text-muted truncate">{{ chartLabel(day.date) }}</p>
                  }
                </div>
              }
            </div>
          </div>
        }
      </section>

      <section class="mb-8">
        <h2 class="section-heading mb-3 flex items-center gap-2">
          <app-icon name="groups" size="sm" />
          Customers
        </h2>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="stat-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">New</p>
            <p class="text-lg font-semibold">{{ report.customers.newInPeriod }}</p>
          </div>
          <div class="stat-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Returning</p>
            <p class="text-lg font-semibold">{{ report.customers.returning }}</p>
          </div>
          <div class="stat-card">
            <p class="text-text-muted text-[10px] uppercase tracking-caption">Avg spend</p>
            <p class="text-lg font-semibold">{{ report.customers.avgSpend | inr }}</p>
          </div>
        </div>
        @if (report.customers.top.length) {
          <div class="space-y-2">
            @for (customer of report.customers.top; track $index) {
              <div class="card flex items-center justify-between py-3 px-4">
                <div class="min-w-0">
                  <p class="font-medium text-sm truncate">{{ customer.name }}</p>
                  <p class="text-text-muted text-xs mt-0.5">{{ customer.bills }} bills</p>
                </div>
                <p class="font-semibold text-sm text-accent shrink-0">{{ customer.spend | inr }}</p>
              </div>
            }
          </div>
        } @else {
          <div class="card text-center py-6 text-text-muted text-sm">No customer spend yet</div>
        }
      </section>

      @if (report.gaming.byOption.length) {
        <section class="mb-8">
          <h2 class="section-heading mb-3">Popular games</h2>
          <div class="space-y-2">
            @for (opt of report.gaming.byOption; track opt.name) {
              <div class="card py-3 px-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">{{ opt.name }}</span>
                  <span class="text-text-secondary text-xs">{{ opt.count }} · {{ opt.hours }}h</span>
                </div>
                <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    class="h-full bg-accent rounded-full"
                    [style.width]="optionShare(opt.count)"
                  ></div>
                </div>
              </div>
            }
          </div>
        </section>
      }

      @if (report.products.length) {
        <section class="mb-8">
          <h2 class="section-heading mb-3">Top products</h2>
          <div class="space-y-2">
            @for (product of report.products; track product.name + product.type) {
              <div class="card flex items-center justify-between py-3 px-4">
                <div>
                  <p class="font-medium text-sm">{{ product.name }}</p>
                  <p class="text-text-muted text-xs mt-0.5">{{ product.quantity }} sold</p>
                </div>
                <p class="font-semibold text-sm">{{ product.revenue | inr }}</p>
              </div>
            }
          </div>
        </section>
      }

      @if (report.payments.length) {
        <section class="mb-4">
          <h2 class="section-heading mb-3">Payments</h2>
          <div class="card space-y-3">
            @for (pay of report.payments; track pay.method) {
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span>{{ paymentLabel(pay.method) }}</span>
                  <span class="text-text-secondary">{{ pay.total | inr }} · {{ pay.count }}</span>
                </div>
                <div class="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div class="h-full bg-status-info rounded-full" [style.width]="paymentShare(pay.total)"></div>
                </div>
              </div>
            }
          </div>
        </section>
      }
      } @else {
        <div class="card text-center py-10 text-text-muted text-sm">Couldn't load this report</div>
      }
    }
  `,
})
export class ReportsComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  presets: { id: ReportPreset; label: string }[] = [
    { id: 'month', label: 'This month' },
    { id: '7d', label: 'Last 7 days' },
    { id: 'lifetime', label: 'Lifetime' },
  ];

  period = signal<ReportPreset>('month');
  loading = signal(true);
  data = signal<ReportsOverview | null>(null);

  maxRevenue = computed(() => Math.max(0, ...(this.data()?.daily.map((d) => d.revenue) ?? [0])));
  maxOptionCount = computed(() => Math.max(1, ...(this.data()?.gaming.byOption.map((o) => o.count) ?? [1])));
  paymentTotal = computed(() => (this.data()?.payments.reduce((sum, p) => sum + p.total, 0) ?? 0) || 1);
  chartHeading = computed(() => (this.period() === 'lifetime' ? 'Monthly revenue' : 'Daily revenue'));
  isMonthlyChart = computed(() => this.period() === 'lifetime');
  presetIndex = computed(() => this.presets.findIndex((p) => p.id === this.period()));

  ngOnInit() {
    this.load();
  }

  setPeriod(id: ReportPreset) {
    if (this.period() === id) return;
    this.period.set(id);
    this.load();
  }

  barHeight(revenue: number): string {
    const max = this.maxRevenue();
    if (!max) return '0%';
    const pct = Math.max(revenue > 0 ? 6 : 2, (revenue / max) * 100);
    return `${pct}%`;
  }

  optionShare(count: number): string {
    return `${Math.round((count / this.maxOptionCount()) * 100)}%`;
  }

  paymentShare(total: number): string {
    return `${Math.round((total / this.paymentTotal()) * 100)}%`;
  }

  paymentLabel(method: string): string {
    const map: Record<string, string> = { upi: 'UPI', cash: 'Cash' };
    return map[method] ?? 'UPI';
  }

  showChartLabel(index: number, total: number): boolean {
    if (this.isMonthlyChart()) {
      if (total <= 12) return true;
      return index === 0 || index === total - 1 || index % 3 === 0;
    }
    if (total <= 10) return true;
    return index === 0 || index === total - 1 || index % 5 === 0;
  }

  chartLabel(date: string): string {
    if (this.isMonthlyChart()) {
      const [y, m] = date.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
    }
    return String(Number(date.slice(8, 10)));
  }

  dayLabel(date: string): string {
    if (this.isMonthlyChart()) {
      const [y, m] = date.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  barTitle(date: string, revenue: number): string {
    return `${this.dayLabel(date)}: ₹${revenue.toLocaleString('en-IN')}`;
  }

  private load() {
    this.loading.set(true);
    const { from, to } = this.rangeFor(this.period());
    this.analytics.getOverview(from, to).subscribe({
      next: (report) => {
        this.data.set(report);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private rangeFor(preset: ReportPreset): { from: string; to: string } {
    const now = new Date();
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (preset === '7d') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return { from: ymd(from), to: ymd(now) };
    }
    if (preset === 'lifetime') {
      return { from: '2020-01-01', to: ymd(now) };
    }
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  }
}
