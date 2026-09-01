import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AnalyticsService, GamingService } from '../../core/services/domain.service';
import { GamingOption, DashboardSummary, GamingEntry } from '../../shared/models';
import { IconComponent } from '../../shared/components/icon.component';
import { TabsSlidingDirective, NumberPopInComponent } from '../../shared/transitions';
import { optionLabel, resourceLabel } from '../../shared/utils/session-display';

@Component({
  selector: 'app-gaming-options-list',
  standalone: true,
  imports: [CommonModule, TabsSlidingDirective],
  template: `
    <div class="space-y-2">
      @for (opt of options(); track opt._id) {
        <div class="card flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-medium">{{ opt.name }}</p>
            <p class="text-text-muted text-sm">{{ opt.supportsPlayerPricing ? 'Player-based pricing' : 'Flat pricing' }}</p>
          </div>
          <div
            class="app-tabs app-tabs--status shrink-0"
            [class.app-tabs--inactive]="!opt.isActive"
            [class.opacity-50]="togglingId() === opt._id"
            role="tablist"
            [tTabsActiveIndex]="opt.isActive ? 0 : 1"
          >
            <span class="t-tabs-pill" aria-hidden="true"></span>
            <button
              type="button"
              class="t-tab"
              role="tab"
              [attr.aria-selected]="opt.isActive"
              [disabled]="togglingId() === opt._id"
              (click)="setActive(opt, true)"
            >
              Active
            </button>
            <button
              type="button"
              class="t-tab"
              role="tab"
              [attr.aria-selected]="!opt.isActive"
              [disabled]="togglingId() === opt._id"
              (click)="setActive(opt, false)"
            >
              Inactive
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class GamingOptionsListComponent implements OnInit {
  private gamingService = inject(GamingService);
  options = signal<GamingOption[]>([]);
  togglingId = signal<string | null>(null);

  ngOnInit() {
    this.gamingService.getAllOptions().subscribe((o) => this.options.set(o));
  }

  setActive(opt: GamingOption, isActive: boolean) {
    if (opt.isActive === isActive || this.togglingId()) return;

    this.togglingId.set(opt._id);
    this.gamingService.updateOption(opt._id, { isActive }).subscribe({
      next: (updated) => {
        this.options.update((list) => list.map((o) => (o._id === updated._id ? updated : o)));
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }
}

@Component({
  selector: 'app-gaming-resources-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      @for (res of resources(); track res._id) {
        <div class="card">
          <div class="flex items-center justify-between">
            <p class="font-medium">{{ res.name }}</p>
            <span class="text-text-muted text-sm">{{ res.code }}</span>
          </div>
          @if (res.capabilities?.gpu) {
            <p class="text-text-muted text-sm mt-1">{{ res.capabilities!.gpu }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class GamingResourcesListComponent implements OnInit {
  private api = inject(ApiService);
  resources = signal<{ _id: string; name: string; code: string; capabilities?: { gpu?: string } }[]>([]);

  ngOnInit() {
    this.api
      .get<{ _id: string; name: string; code: string; capabilities?: { gpu?: string } }[]>('/gaming-resources', { active: 'false' })
      .subscribe((r) => this.resources.set(r));
  }
}

@Component({
  selector: 'app-gaming-sessions',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, NumberPopInComponent],
  template: `
    <div class="gaming-hub-hero">
      @if (summary(); as s) {
        <div class="grid grid-cols-2 gap-2.5 mt-4">
          <div class="stat-card">
            <p class="text-caption text-text-muted">Active now</p>
            <p
              class="text-xl font-semibold"
              [class.text-status-active]="s.today.activeSessions > 0"
              [class.text-text-primary]="s.today.activeSessions === 0"
            >
              <app-number-pop-in [value]="s.today.activeSessions" />
            </p>
            <p class="text-text-muted text-[11px]">{{ s.today.sessions }} sessions today</p>
          </div>
          <div class="stat-card">
            <p class="text-caption text-text-muted">Stations free</p>
            <p
              class="text-xl font-semibold"
              [class.text-status-active]="s.occupancy.free > 0"
              [class.text-status-warning]="s.occupancy.free === 0 && s.occupancy.total > 0"
            >
              <app-number-pop-in [value]="s.occupancy.free" />
            </p>
            <p class="text-text-muted text-[11px]">{{ s.occupancy.occupied }}/{{ s.occupancy.total }} in use</p>
          </div>
        </div>
      }
    </div>

    <h2 class="section-heading mb-3">Quick actions</h2>
    <div class="grid grid-cols-2 gap-3 mb-6">
      <a routerLink="/admin/gaming/new" class="nav-tile nav-tile-featured">
        <span class="nav-tile-icon nav-tile-icon-accent">
          <app-icon name="play_arrow" size="md" />
        </span>
        <span class="nav-tile-label">Start Session</span>
        <span class="nav-tile-desc">New walk-in entry</span>
      </a>
      <a routerLink="/admin/gaming/options" class="nav-tile">
        <span class="nav-tile-icon nav-tile-icon-info">
          <app-icon name="sports_esports" size="md" />
        </span>
        <span class="nav-tile-label">Options</span>
        <span class="nav-tile-desc">Game types & rules</span>
      </a>
      <a routerLink="/admin/gaming/resources" class="nav-tile">
        <span class="nav-tile-icon nav-tile-icon-active">
          <app-icon name="computer" size="md" />
        </span>
        <span class="nav-tile-label">Resources</span>
        <span class="nav-tile-desc">PCs, consoles & setups</span>
      </a>
      <a routerLink="/admin/gaming/pricing" class="nav-tile">
        <span class="nav-tile-icon nav-tile-icon-muted">
          <app-icon name="payments" size="md" />
        </span>
        <span class="nav-tile-label">Pricing</span>
        <span class="nav-tile-desc">Rates by duration & players</span>
      </a>
    </div>

    @if (activeCount() > 0) {
      <section>
        <h2 class="section-heading mb-3 flex items-center gap-2">
          Live now
          <span class="badge-active"><app-number-pop-in [value]="activeCount()" /></span>
        </h2>
        <div class="space-y-2">
          @for (session of activeSessions(); track session._id) {
            <div class="session-card">
              <div
                class="session-card-accent"
                [class.bg-status-danger]="session.urgency === 'overdue'"
                [class.bg-status-warning]="session.urgency === 'ending_soon' || session.urgency === 'almost_ended'"
                [class.bg-status-active]="session.urgency === 'normal' || !session.urgency"
              ></div>
              <div class="flex items-center justify-between gap-3 py-3 pl-5 pr-4">
                <div class="min-w-0">
                  <p class="font-medium text-sm truncate">{{ resourceName(session) }}</p>
                  <p class="text-text-muted text-xs truncate">{{ optionName(session) }}</p>
                </div>
                @if (session.expectedEndAt) {
                  <span
                    class="text-xs font-medium tabular-nums shrink-0"
                    [class.text-status-danger]="session.urgency === 'overdue'"
                    [class.text-status-warning]="session.urgency === 'ending_soon' || session.urgency === 'almost_ended'"
                    [class.text-text-secondary]="session.urgency === 'normal' || !session.urgency"
                  >
                    {{ formatEndTime(session.expectedEndAt) }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class GamingSessionsComponent implements OnInit {
  private analytics = inject(AnalyticsService);
  private gaming = inject(GamingService);

  summary = signal<DashboardSummary | null>(null);
  activeSessions = signal<GamingEntry[]>([]);

  activeCount = () => this.activeSessions().length;

  ngOnInit() {
    this.loadLive();
  }

  loadLive() {
    this.analytics.getDashboard().subscribe((s) => this.summary.set(s));
    this.gaming.getActiveSessions().subscribe((sessions) => this.activeSessions.set(sessions));
  }

  resourceName(session: GamingEntry) {
    return resourceLabel(session.resourceId) || 'Station';
  }

  optionName(session: GamingEntry) {
    return optionLabel(session.gamingOptionId);
  }

  formatEndTime(iso: string) {
    const end = new Date(iso);
    const now = Date.now();
    const diffMs = end.getTime() - now;
    if (diffMs <= 0) return 'Overdue';
    const mins = Math.ceil(diffMs / 60000);
    if (mins < 60) return `${mins}m left`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h left`;
  }
}
