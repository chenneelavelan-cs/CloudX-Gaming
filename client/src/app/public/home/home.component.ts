import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicService } from '../../core/services/domain.service';
import { GamingOption, Product } from '../../shared/models';
import { InrPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';
import { TextsRevealDirective } from '../../shared/transitions/texts-reveal.directive';
import { CardTiltDirective } from '../../shared/transitions/card-tilt.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, InrPipe, IconComponent, TextsRevealDirective, CardTiltDirective],
  template: `
    <div class="min-h-screen bg-bg-primary">
      <header class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-bg-primary/40 to-bg-primary"></div>
        <div class="relative max-w-4xl mx-auto px-4 py-20 md:py-28 text-center t-stagger" tTextsReveal>
          <h1 class="text-4xl md:text-5xl font-medium leading-tight tracking-tight t-stagger-line">
            <span class="text-accent">CloudX</span> Gaming
          </h1>
          <p class="text-text-secondary mt-4 text-base t-stagger-line t-stagger-line--2">Premium gaming experience in Sholinganallur</p>
          <a routerLink="/book" class="btn-primary inline-flex mt-10 t-learn-more">
            <app-icon name="event_available" size="sm" />
            Book Now
            <span class="t-learn-chevron" aria-hidden="true">›</span>
          </a>
        </div>
      </header>

      <section class="max-w-4xl mx-auto px-4 py-12">
        <h2 class="section-heading mb-6">Gaming Options</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          @for (opt of options(); track opt._id) {
            <div class="card text-center py-6 t-tilt">
              <div class="t-tilt-card">
                <div class="flex justify-center mb-3 text-text-secondary">
                  <app-icon name="sports_esports" size="lg" />
                </div>
                <p class="font-medium">{{ opt.name }}</p>
                @if (opt.description) {
                  <p class="text-text-muted text-sm mt-1">{{ opt.description }}</p>
                }
                <span class="t-tilt-glare" aria-hidden="true"></span>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="max-w-4xl mx-auto px-4 py-12">
        <h2 class="section-heading mb-6">Snacks & Drinks</h2>
        <div class="grid grid-cols-2 gap-3">
          @for (p of products(); track p._id) {
            <div class="card flex items-center justify-between py-3 t-tilt">
              <div class="t-tilt-card flex items-center justify-between w-full gap-2">
                <span class="flex items-center gap-2 min-w-0">
                  <app-icon name="local_cafe" size="sm" class="text-text-muted shrink-0" />
                  <span class="truncate">{{ p.name }}</span>
                </span>
                <span class="font-medium text-accent shrink-0">{{ p.price | inr }}</span>
                <span class="t-tilt-glare" aria-hidden="true"></span>
              </div>
            </div>
          }
        </div>
      </section>

      <footer class="border-t border-border-subtle py-8 text-center text-text-muted text-sm">
        <p>CloudX Gaming · Sholinganallur</p>
        <a routerLink="/admin/login" class="text-text-muted hover:text-accent mt-2 inline-flex items-center gap-1 justify-center t-learn-more">
          <app-icon name="login" size="sm" />
          Staff Login
          <span class="t-learn-chevron" aria-hidden="true">›</span>
        </a>
      </footer>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private publicService = inject(PublicService);
  options = signal<GamingOption[]>([]);
  products = signal<Product[]>([]);

  ngOnInit() {
    this.publicService.getOptions().subscribe((o) => this.options.set(o));
    this.publicService.getProducts().subscribe((p) => this.products.set(p));
  }
}
